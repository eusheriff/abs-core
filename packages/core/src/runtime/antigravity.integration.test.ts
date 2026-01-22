/**
 * AGR Integration Tests
 * 
 * Tests for Antigravity Runtime Pack functionality:
 * - WAL write/verify
 * - Heartbeat
 * - Safe mode
 * - State materialization
 * 
 * All responses now include ABS Governance Header.
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

/**
 * Parse formatted ABS response (header + body)
 * Format: {"abs":{...}}\n---\n{body}
 */
function parseABSResponse(formatted: string): { header: any; body: any } {
  const parts = formatted.split('\n---\n');
  return {
    header: JSON.parse(parts[0]),
    body: JSON.parse(parts[1]),
  };
}

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
    it('should append entry to WAL with hash chain and return governance header', async () => {
      const tools = runtime.getTools();
      const walAppend = tools.find(t => t.name === 'abs_wal_append')!;

      const formatted = await walAppend.handler({ entry: 'Test entry 1' }, ctx) as string;
      const { header, body } = parseABSResponse(formatted);
      
      // Check governance header
      expect(header.abs).toBeDefined();
      expect(header.abs.verdict).toBe('ALLOW');
      expect(header.abs.policy).toBe('antigravity_integrity');
      
      // Check body
      expect(body.success).toBe(true);
      expect(body.entryId).toBeDefined();
      expect(body.hash).toBeDefined();
      expect(body.hash.length).toBe(64); // SHA-256 hex
    });

    it('should verify WAL integrity with governance header', async () => {
      const tools = runtime.getTools();
      const walVerify = tools.find(t => t.name === 'abs_wal_verify')!;

      const formatted = await walVerify.handler({}, ctx) as string;
      const { header, body } = parseABSResponse(formatted);
      
      // Check governance header
      expect(header.abs.verdict).toBe('ALLOW');
      expect(header.abs.risk_score).toBe(0);
      
      // Check body
      expect(body.valid).toBe(true);
      expect(body.entriesChecked).toBeGreaterThan(0);
      expect(body.errors).toEqual([]);
    });

    it('should detect tampered WAL and return DENY (I5)', async () => {
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

      // Verify should fail with DENY
      const walVerify = tools.find(t => t.name === 'abs_wal_verify')!;
      const formatted = await walVerify.handler({}, ctx) as string;
      const { header, body } = parseABSResponse(formatted);
      
      // Check governance header shows DENY
      expect(header.abs.verdict).toBe('DENY');
      expect(header.abs.risk_score).toBe(100);
      expect(body.blocked).toBe(true);

      // Restore WAL for remaining tests
      fs.unlinkSync(walPath);
      await walAppend.handler({ entry: 'Fresh entry' }, ctx);
    });
  });

  describe('Heartbeat (Invariant I4)', () => {
    it('should return healthy status with governance header', async () => {
      const tools = runtime.getTools();
      const heartbeat = tools.find(t => t.name === 'abs_runtime_heartbeat')!;

      const formatted = await heartbeat.handler({}, ctx) as string;
      const { header, body } = parseABSResponse(formatted);
      
      // Check governance header
      expect(header.abs.verdict).toBe('ALLOW');
      expect(header.abs.risk_score).toBe(0);
      
      // Check body
      expect(body.healthy).toBe(true);
      expect(body.lastCheck).toBeDefined();
    });

    it('should toggle safe mode and return SAFE_MODE verdict', async () => {
      const tools = runtime.getTools();
      const safeMode = tools.find(t => t.name === 'abs_runtime_safe_mode')!;

      // Enable safe mode
      const enableFormatted = await safeMode.handler({ enabled: true }, ctx) as string;
      const { header: enableHeader } = parseABSResponse(enableFormatted);
      expect(enableHeader.abs.verdict).toBe('SAFE_MODE');
      expect(enableHeader.abs.mode).toBe('safe_mode');

      // Check heartbeat reports SAFE_MODE
      const heartbeat = tools.find(t => t.name === 'abs_runtime_heartbeat')!;
      const heartbeatFormatted = await heartbeat.handler({}, ctx) as string;
      const { header: hbHeader } = parseABSResponse(heartbeatFormatted);
      expect(hbHeader.abs.verdict).toBe('SAFE_MODE');

      // Disable safe mode
      const disableFormatted = await safeMode.handler({ enabled: false }, ctx) as string;
      const { header: disableHeader, body: disableBody } = parseABSResponse(disableFormatted);
      expect(disableHeader.abs.verdict).toBe('ALLOW');
      expect(disableBody.safeMode).toBe(false);
    });
  });

  describe('State Materialization', () => {
    it('should materialize WAL to STATE.md with governance header', async () => {
      const tools = runtime.getTools();
      const materialize = tools.find(t => t.name === 'abs_state_materialize')!;

      const formatted = await materialize.handler({}, ctx) as string;
      const { header, body } = parseABSResponse(formatted);
      
      // Check governance header
      expect(header.abs.verdict).toBe('ALLOW');
      expect(header.abs.policy).toBe('antigravity_integrity');
      
      // Check body
      expect(body.success).toBe(true);
      expect(body.entriesApplied).toBeGreaterThanOrEqual(0);
    });
  });
});
