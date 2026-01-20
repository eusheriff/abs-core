// Basic ABS SDK Implementation
// Goal: Fire-and-forget logging to ABS Ingestion API

export interface ABSEvent {
    input?: string;
    output?: string;
    model?: string;
    metadata?: Record<string, any>;
    tenant_id?: string;
}

export interface ABSConfig {
    dsn: string; // e.g., https://abs.oconnector.tech
    apiKey?: string;
    scannerMode?: boolean; // If true, sets X-ABS-Mode = scanner
}

export class ABS {
    private static config: ABSConfig;

    static init(config: ABSConfig) {
        this.config = config;
    }

    static async log(event: ABSEvent): Promise<void> {
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
        } catch (err) {
            // Scanner should never break the app
            console.error('[ABS] Failed to send log:', err);
        }
    }
}
