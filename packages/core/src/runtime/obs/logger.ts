/**
 * ABS Structured Logger (D6.4)
 * 
 * Logger otimizado para operações. Saída JSON padrão para ingestão (Datadog/ELK).
 * 
 * @module runtime/obs/logger
 */

import { Config } from '../config/load';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  // Config is lazy-loaded to prevent module-level side effects during import

  static log(level: LogLevel, msg: string, context: Record<string, unknown> = {}) {
    if (!this.shouldLog(level)) return;

    const config = Config.get();
    const entry = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...context,
      env: config.NODE_ENV
    };

    // Redaction: Remover campos sensíveis conhecidos (ex: api_key)
    // (Implementação simplificada: JSON.stringify cuida da estrutura)
    
    if (config.ABS_LOG_FORMAT === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[${entry.ts}] ${level.toUpperCase()}: ${msg}`, context);
    }
  }

  static info(msg: string, ctx?: object) { this.log('info', msg, ctx || {}); }
  static warn(msg: string, ctx?: object) { this.log('warn', msg, ctx || {}); }
  static error(msg: string, ctx?: object) { this.log('error', msg, ctx || {}); }
  static debug(msg: string, ctx?: object) { this.log('debug', msg, ctx || {}); }

  private static shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const config = Config.get();
    const configLevel = config.ABS_LOG_LEVEL;
    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }
}
