import { ABSContext } from '../../../core/context';
import { HeartbeatResult } from '../../../core/runtime-pack';
import * as fs from 'fs';
import * as path from 'path';

interface HeartbeatState {
  startTime: Date;
  lastCheck: Date;
  eventsProcessed: number;
  errorsCount: number;
  safeMode: boolean;
}

let state: HeartbeatState | null = null;

/**
 * Initialize heartbeat state
 */
export function initHeartbeat(): void {
  state = {
    startTime: new Date(),
    lastCheck: new Date(),
    eventsProcessed: 0,
    errorsCount: 0,
    safeMode: false,
  };
}

/**
 * Increment processed events counter
 */
export function recordEvent(): void {
  if (state) state.eventsProcessed++;
}

/**
 * Increment error counter
 */
export function recordError(): void {
  if (state) state.errorsCount++;
}

/**
 * Toggle safe mode (kill switch)
 * Invariant I4: Kill switch can halt all operations
 */
export function setSafeMode(enabled: boolean): void {
  if (state) state.safeMode = enabled;
}

/**
 * Check if safe mode is active
 */
export function isSafeMode(): boolean {
  return state?.safeMode === true;
}

/**
 * Run heartbeat check
 * Returns health status of the Antigravity Runtime
 */
export async function runHeartbeat(ctx: ABSContext): Promise<HeartbeatResult> {
  if (!state) {
    initHeartbeat();
  }
  
  state!.lastCheck = new Date();
  
  const uptime = Math.floor((Date.now() - state!.startTime.getTime()) / 1000);
  
  // Check WAL file exists and is writable
  const workspacePath = ctx.workspacePath || process.cwd();
  const walPath = path.join(workspacePath, '_consolidated', 'WORKLOG.wal');
  let walHealthy = true;
  
  try {
    const walDir = path.dirname(walPath);
    if (!fs.existsSync(walDir)) {
      fs.mkdirSync(walDir, { recursive: true });
    }
    fs.accessSync(walDir, fs.constants.W_OK);
  } catch {
    walHealthy = false;
  }
  
  const healthy = walHealthy && !state!.safeMode;
  
  ctx.logger.debug(`[AGR-HEARTBEAT] Status: ${healthy ? 'healthy' : 'degraded'}, uptime: ${uptime}s`);
  
  return {
    healthy,
    message: state!.safeMode 
      ? 'Safe mode active - operations halted' 
      : (walHealthy ? 'All systems operational' : 'WAL directory not writable'),
    lastCheck: state!.lastCheck,
    metrics: {
      eventsProcessed: state!.eventsProcessed,
      errorsCount: state!.errorsCount,
      uptime,
    },
  };
}
