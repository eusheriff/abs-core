import { RuntimePack, HeartbeatResult, ToolDefinition } from '../../core/runtime-pack';
import { ABSContext } from '../../core/context';
import { walWrite, walVerify } from './wal';
import { runHeartbeat, initHeartbeat, setSafeMode, isSafeMode } from './daemon';
import { materializeState } from './materializer';

export interface AntigravityRuntimeOptions {
  workspacePath?: string;
  heartbeatIntervalMs?: number;
}

/**
 * Antigravity Runtime Pack
 * 
 * Provides governed autonomy capabilities:
 * - WAL (Write-Ahead Log) with hash-chain integrity
 * - Heartbeat daemon for health monitoring
 * - Safe mode (kill switch)
 * 
 * All operations go through ABS policy engine.
 */
export class AntigravityRuntime implements RuntimePack {
  name = 'antigravity';
  version = '1.0.0';
  
  private ctx?: ABSContext;
  private heartbeatInterval?: NodeJS.Timeout;
  private options: AntigravityRuntimeOptions;
  
  constructor(options: AntigravityRuntimeOptions = {}) {
    this.options = {
      heartbeatIntervalMs: 60000, // 1 minute default
      ...options,
    };
  }
  
  async init(ctx: ABSContext): Promise<void> {
    this.ctx = ctx;
    
    // Override workspace path if provided
    if (this.options.workspacePath) {
      this.ctx = { ...ctx, workspacePath: this.options.workspacePath };
    }
    
    initHeartbeat();
    
    // Start heartbeat daemon
    this.heartbeatInterval = setInterval(
      () => this.heartbeat(),
      this.options.heartbeatIntervalMs
    );
    
    ctx.logger.info('[AGR] Antigravity Runtime initialized');
    ctx.logger.info(`[AGR] Registered ${this.getTools().length} Antigravity tools`);
  }
  
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.ctx?.logger.info('[AGR] Antigravity Runtime shutdown');
  }
  
  async heartbeat(): Promise<HeartbeatResult> {
    if (!this.ctx) {
      return {
        healthy: false,
        message: 'Runtime not initialized',
        lastCheck: new Date(),
      };
    }
    return runHeartbeat(this.ctx);
  }
  
  getTools(): ToolDefinition[] {
    return [
      {
        name: 'abs_wal_append',
        description: 'Append entry to WAL (Write-Ahead Log) with hash-chain integrity',
        inputSchema: {
          type: 'object',
          properties: {
            entry: { type: 'string', description: 'Content to append' },
            eventType: { type: 'string', description: 'Event type (optional)' },
            metadata: { type: 'object', description: 'Additional metadata' },
          },
          required: ['entry'],
        },
        handler: async (input, ctx) => walWrite(input as any, ctx),
      },
      {
        name: 'abs_wal_verify',
        description: 'Verify WAL hash-chain integrity (detects tampering)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (_, ctx) => walVerify(ctx),
      },
      {
        name: 'abs_runtime_heartbeat',
        description: 'Get Antigravity Runtime health status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (_, ctx) => runHeartbeat(ctx),
      },
      {
        name: 'abs_runtime_safe_mode',
        description: 'Toggle safe mode (kill switch) - halts all operations when enabled',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', description: 'Enable or disable safe mode' },
          },
          required: ['enabled'],
        },
        handler: async (input: any) => {
          setSafeMode(input.enabled);
          return {
            success: true,
            safeMode: isSafeMode(),
            message: input.enabled ? 'Safe mode ENABLED - operations halted' : 'Safe mode disabled',
          };
        },
      },
      {
        name: 'abs_state_materialize',
        description: 'Consolidate WAL entries into STATE.md snapshot (freeze memory)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (_, ctx) => materializeState(ctx),
      },
    ];
  }
}
