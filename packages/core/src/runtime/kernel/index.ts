import { RuntimePack, HeartbeatResult, ToolDefinition } from '../../core/runtime-pack';
import { ABSContext } from '../../core/context';
import { walWrite, walVerify } from './wal';
import { runHeartbeat, initHeartbeat, setSafeMode, isSafeMode } from './daemon';
import { materializeState } from './materializer';
import { absAllow, absDeny, absSafeMode } from '../../core/governance-header';

export interface ABSKernelOptions {
  workspacePath?: string;
  heartbeatIntervalMs?: number;
}

/**
 * ABS Kernel
 * 
 * Core runtime for governed autonomy:
 * - WAL (Write-Ahead Log) with hash-chain integrity
 * - Heartbeat daemon for health monitoring
 * - Safe mode (kill switch)
 * 
 * All operations go through ABS policy engine.
 * All responses include ABS Governance Header.
 */
export class ABSKernel implements RuntimePack {
  name = 'abs-kernel';
  version = '1.0.0';
  
  private ctx?: ABSContext;
  private heartbeatInterval?: NodeJS.Timeout;
  private options: ABSKernelOptions;
  
  constructor(options: ABSKernelOptions = {}) {
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
    
    ctx.logger.info('[ABS-K] ABS Kernel initialized');
    ctx.logger.info(`[ABS-K] Registered ${this.getTools().length} kernel tools`);
  }
  
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.ctx?.logger.info('[ABS-K] ABS Kernel shutdown');
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
        handler: async (input, ctx) => {
          // Check safe mode
          if (isSafeMode()) {
            return absSafeMode('Operations halted - safe mode active').formatted;
          }
          const result = await walWrite(input as any, ctx);
          return absAllow(result, {
            policy: 'kernel_integrity',
            walEntry: result.hash?.slice(0, 8),
            traceId: ctx.correlationId,
          }).formatted;
        },
      },
      {
        name: 'abs_wal_verify',
        description: 'Verify WAL hash-chain integrity (detects tampering)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (_, ctx) => {
          const result = await walVerify(ctx);
          if (result.valid) {
            return absAllow(result, {
              policy: 'kernel_integrity',
              riskScore: 0,
              traceId: ctx.correlationId,
            }).formatted;
          } else {
            return absDeny('WAL integrity compromised', {
              policy: 'kernel_integrity',
              riskScore: 100,
              traceId: ctx.correlationId,
            }).formatted;
          }
        },
      },
      {
        name: 'abs_runtime_heartbeat',
        description: 'Get ABS Kernel health status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (_, ctx) => {
          const result = await runHeartbeat(ctx);
          if (isSafeMode()) {
            return absSafeMode('Runtime in safe mode').formatted;
          }
          return absAllow(result, {
            riskScore: result.healthy ? 0 : 50,
            traceId: ctx.correlationId,
          }).formatted;
        },
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
        handler: async (input: any, ctx) => {
          setSafeMode(input.enabled);
          const newState = isSafeMode();
          
          if (newState) {
            return absSafeMode('Safe mode ENABLED - all operations halted', {
              traceId: ctx?.correlationId,
            }).formatted;
          }
          
          return absAllow({
            success: true,
            safeMode: false,
            message: 'Safe mode disabled - operations resumed',
          }, {
            traceId: ctx?.correlationId,
          }).formatted;
        },
      },
      {
        name: 'abs_state_materialize',
        description: 'Consolidate WAL entries into STATE.md snapshot (freeze memory)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (_, ctx) => {
          if (isSafeMode()) {
            return absSafeMode('Cannot materialize - safe mode active').formatted;
          }
          const result = await materializeState(ctx);
          return absAllow(result, {
            policy: 'kernel_integrity',
            walEntry: result.newContextLock?.slice(0, 8),
            traceId: ctx.correlationId,
          }).formatted;
        },
      },
    ];
  }
}
