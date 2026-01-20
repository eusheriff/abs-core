"use strict";
// Basic ABS SDK Implementation
// Goal: Fire-and-forget logging to ABS Ingestion API
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABS = void 0;
class ABS {
    static init(config) {
        this.config = config;
    }
    static async log(event) {
        if (!this.config) {
            console.warn('[ABS] SDK not initialized. Call ABS.init() first.');
            return;
        }
        const payload = {
            event_type: 'llm.completion', // Default to generic type
            event_id: crypto.randomUUID(), // Lightweight UUID
            timestamp: new Date().toISOString(),
            payload: event,
            tenant_id: event.tenant_id || 'default'
        };
        // Fire-and-forget (no await on fetch promise in background ideally, 
        // but for Node.js scripts we might block locally or use setImmediate)
        try {
            await fetch(`${this.config.dsn}/events/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey || ''}`,
                    'X-ABS-Mode': this.config.scannerMode ? 'scanner' : 'runtime'
                },
                body: JSON.stringify(payload)
            });
        }
        catch (err) {
            // Scanner should never break the app
            console.error('[ABS] Failed to send log:', err);
        }
    }
}
exports.ABS = ABS;
