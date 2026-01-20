import { TraceContext } from './context';

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export class Logger {
  constructor(private context: TraceContext) {}

  public info(message: string, attributes?: Record<string, any>) {
    this.emit('INFO', message, attributes);
  }

  public warn(message: string, attributes?: Record<string, any>) {
    this.emit('WARN', message, attributes);
  }

  public error(message: string, attributes?: Record<string, any>) {
    this.emit('ERROR', message, attributes);
  }

  public debug(message: string, attributes?: Record<string, any>) {
    this.emit('DEBUG', message, attributes);
  }

  // Create a child logger with inherited context but potentially new span/attributes if needed
  public withContext(contextUpdate: Partial<TraceContext>): Logger {
    return new Logger({ ...this.context, ...contextUpdate });
  }

  private emit(severity: LogSeverity, message: string, attributes?: Record<string, any>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      severity,
      message,
      trace_id: this.context.traceId,
      span_id: this.context.spanId,
      tenant_id: this.context.tenantId || 'unknown',
      ...attributes
    };

    // In a real OTel setup, this would emit to a collector.
    // Here we wrap in a structured JSON for Cloudflare/Vercel logs capture.
    console.log(JSON.stringify(logEntry));
  }
}
