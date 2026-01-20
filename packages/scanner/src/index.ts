// Basic ABS SDK Implementation
// Goal: Fire-and-forget logging to ABS Ingestion API or Local Console

export interface ABSEvent {
    input: string;
    output: string;
    policy?: string;
    model?: string;
    metadata?: Record<string, any>;
    tenant_id?: string;
}

export interface ABSConfig {
    dsn?: string; // Optional: If missing, logs to console (Local Scanner Mode)
    apiKey?: string;
    mode?: 'scanner' | 'runtime';
    debug?: boolean;
}

export class ABS {
    private config: ABSConfig;

    constructor(config: ABSConfig = {}) {
        this.config = {
            mode: 'scanner',
            ...config
        };
    }

    async log(event: ABSEvent): Promise<void> {
        const timestamp = new Date().toISOString();
        const eventId = crypto.randomUUID();

        // Local Scanner Mode (Console)
        if (!this.config.dsn) {
            console.log('\n[ABS Scanner 🛡️]');
            console.log(`Analyzing event: ${eventId}`);
            console.log(`Input: "${event.input.substring(0, 50)}..."`);
            if (event.policy) console.log(`Policy Check: ${event.policy}`);
            console.log('------------------------------------------------');
            return;
        }

        // Remote Ingestion Mode
        const payload = {
            event_type: 'llm.completion',
            event_id: eventId,
            timestamp,
            payload: event,
            tenant_id: event.tenant_id || 'default'
        };

        try {
            await fetch(`${this.config.dsn}/events/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey || ''}`,
                    'X-ABS-Mode': this.config.mode || 'scanner'
                },
                body: JSON.stringify(payload)
            });
            if (this.config.debug) console.log(`[ABS] Logged event ${eventId} to ${this.config.dsn}`);
        } catch (err) {
            console.error('[ABS] Failed to send log:', err);
        }
    }
}
