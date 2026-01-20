export interface TraceContext {
  traceId: string;
  spanId: string;
  tenantId?: string;
  actorId?: string;
}

export const createTraceId = (): string => crypto.randomUUID();
export const createSpanId = (): string => crypto.randomUUID().substring(0, 16);
