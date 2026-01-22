/**
 * AGR Integration Tests
 * 
 * Tests for Antigravity Runtime Pack functionality:
 * - WAL write/verify
 * - Heartbeat
 * - Safe mode
 * - State materialization
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AntigravityRuntime } from '../runtime/antigravity';
import { createABSContext, ABSContext } from '../core/context';
import { Logger } from '../core/logger';

// Mock database adapter
const mockDb = {
  query: async () => [],
  execute: async () => ({ success: true }),
} as any;

describe('Antigravity Runtime Pack', () => {
  let runtime: AntigravityRuntime;
  let ctx: ABSContext;
  const testWorkspace = path.join(__dirname, '__test_workspace__');
  const consolidatedDir = path.join(testWorkspace, '_consolidated');
  const walPath = path.join(consolidatedDir, 'WORKLOG.wal');

  beforeAll(async () => {
    // Create test workspace
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }

    // Create context with Logger class
    const logger = new Logger({ traceId: 'test-trace', spanId: 'test-span' });
    ctx = createABSContext(mockDb, logger, { mode: 'runtime' }, 'test-tenant', testWorkspace);

    // Create runtime
    runtime = new AntigravityRuntime({ workspacePath: testWorkspace });
    await runtime.init(ctx);
  });

  afterAll(async () => {
    // Shutdown runtime
    await runtime.shutdown();

    // Cleanup test workspace
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize runtime with correct name and version', () => {
      expect(runtime.name).toBe('antigravity');
      expect(runtime.version).toBe('1.0.0');
    });

    it('should register 5 tools', () => {
      const tools = runtime.getTools();
      expect(tools.length).toBe(5);
      expect(tools.map(t => t.name)).toContain('abs_wal_append');
      expect(tools.map(t => t.name)).toContain('abs_wal_verify');
      expect(tools.map(t => t.name)).toContain('abs_runtime_heartbeat');
      expect(tools.map(t => t.name)).toContain('abs_runtime_safe_mode');
      expect(tools.map(t => t.name)).toContain('abs_state_materialize');
    });
  });

  describe('WAL Operations (Invariants I3, I5)', () => {
    it('should append entry to WAL with hash chain', async () => {
      const tools = runtime.getTools();
      const walAppend = tools.find(t => t.name === 'abs_wal_append')!;

      const result = await walAppend.handler({ entry: 'Test entry 1' }, ctx) as any;
      
      expect(result.success).toBe(true);
      expect(result.entryId).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.hash.length).toBe(64); // SHA-256 hex
    });

    it('should verify WAL integrity', async () => {
      const tools = runtime.getTools();
      const walVerify = tools.find(t => t.name === 'abs_wal_verify')!;

      const result = await walVerify.handler({}, ctx) as any;
      
      expect(result.valid).toBe(true);
      expect(result.entriesChecked).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
    });

    it('should detect tampered WAL (I5)', async () => {
      // Append second entry
      const tools = runtime.getTools();
      const walAppend = tools.find(t => t.name === 'abs_wal_append')!;
      await walAppend.handler({ entry: 'Test entry 2' }, ctx);

      // Tamper with WAL
      const walContent = fs.readFileSync(walPath, 'utf-8');
      const lines = walContent.trim().split('\n');
      const tamperedEntry = JSON.parse(lines[0]);
      tamperedEntry.payload.content = 'TAMPERED';
      lines[0] = JSON.stringify(tamperedEntry);
      fs.writeFileSync(walPath, lines.join('\n') + '\n');

      // Verify should fail
      const walVerify = tools.find(t => t.name === 'abs_wal_verify')!;
      const result = await walVerify.handler({}, ctx) as any;
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Restore WAL for remaining tests
      fs.unlinkSync(walPath);
      await walAppend.handler({ entry: 'Fresh entry' }, ctx);
    });
  });

  describe('Heartbeat (Invariant I4)', () => {
    it('should return healthy status', async () => {
      const tools = runtime.getTools();
      const heartbeat = tools.find(t => t.name === 'abs_runtime_heartbeat')!;

      const result = await heartbeat.handler({}, ctx) as any;
      
      expect(result.healthy).toBe(true);
      expect(result.lastCheck).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should toggle safe mode (kill switch)', async () => {
      const tools = runtime.getTools();
      const safeMode = tools.find(t => t.name === 'abs_runtime_safe_mode')!;

      // Enable safe mode
      const enableResult = await safeMode.handler({ enabled: true }, ctx) as any;
      expect(enableResult.success).toBe(true);
      expect(enableResult.safeMode).toBe(true);

      // Check heartbeat reports degraded
      const heartbeat = tools.find(t => t.name === 'abs_runtime_heartbeat')!;
      const heartbeatResult = await heartbeat.handler({}, ctx) as any;
      expect(heartbeatResult.healthy).toBe(false);
      expect(heartbeatResult.message).toContain('Safe mode');

      // Disable safe mode
      const disableResult = await safeMode.handler({ enabled: false }, ctx) as any;
      expect(disableResult.safeMode).toBe(false);
    });
  });

  describe('State Materialization', () => {
    it('should materialize WAL to STATE.md', async () => {
      const tools = runtime.getTools();
      const materialize = tools.find(t => t.name === 'abs_state_materialize')!;

      const result = await materialize.handler({}, ctx) as any;
      
      expect(result.success).toBe(true);
      expect(result.entriesApplied).toBeGreaterThanOrEqual(0);
    });
  });
});
