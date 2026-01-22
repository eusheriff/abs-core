import { DatabaseAdapter } from '../infra/db-adapter';
import { Logger } from './logger';

// --- Tracing Context (existing) ---
export interface TraceContext {
  traceId: string;
  spanId: string;
  tenantId?: string;
  actorId?: string;
}

export const createTraceId = (): string => crypto.randomUUID();
export const createSpanId = (): string => crypto.randomUUID().substring(0, 16);

// --- ABS Core Context (new for Runtime Packs) ---
export interface ABSConfig {
  mode: 'scanner' | 'runtime';
  llmProvider?: string;
  llmApiKey?: string;
  interactive?: boolean;
}

export interface ABSContext {
  db: DatabaseAdapter;
  logger: Logger;
  config: ABSConfig;
  correlationId: string;
  tenantId: string;
  workspacePath?: string;
}

export function createABSContext(
  db: DatabaseAdapter,
  logger: Logger,
  config: ABSConfig,
  tenantId: string = 'default',
  workspacePath?: string
): ABSContext {
  return {
    db,
    logger,
    config,
    correlationId: createTraceId(),
    tenantId,
    workspacePath,
  };
}
