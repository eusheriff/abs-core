"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const signer_1 = require("../crypto/signer");
class Logger {
    constructor(context) {
        this.context = context;
    }
    info(message, attributes) {
        this.emit('INFO', message, attributes);
    }
    warn(message, attributes) {
        this.emit('WARN', message, attributes);
    }
    error(message, attributes) {
        this.emit('ERROR', message, attributes);
    }
    debug(message, attributes) {
        this.emit('DEBUG', message, attributes);
    }
    // Create a child logger with inherited context but potentially new span/attributes if needed
    withContext(contextUpdate) {
        return new Logger({ ...this.context, ...contextUpdate });
    }
    emit(severity, message, attributes) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            severity,
            message,
            trace_id: this.context.traceId,
            span_id: this.context.spanId,
            tenant_id: this.context.tenantId || 'unknown',
            ...attributes
        };
        // Sign the complete log entry
        const signature = signer_1.signer.sign(logEntry);
        const signedEntry = {
            ...logEntry,
            signature
        };
        // In a real OTel setup, this would emit to a collector.
        // Here we wrap in a structured JSON for Cloudflare/Vercel logs capture.
        console.log(JSON.stringify(signedEntry));
    }
}
exports.Logger = Logger;
