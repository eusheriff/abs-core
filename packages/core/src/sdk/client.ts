import { v4 as uuidv4 } from 'uuid';

export interface GovernanceEvent {
    type: string;
    payload: Record<string, any>;
    tenantId: string;
    source: string;
    actor?: string;
    resource?: string;
    correlationId?: string;
}

export interface GovernanceResponse {
    status: 'accepted' | 'rejected' | 'processed' | 'failed';
    decision?: string; // ALLOW | DENY
    eventId: string;
    mode: 'queue' | 'sync';
}

export class GovernanceClient {
    constructor(
        private baseUrl: string,
        private apiKey: string
    ) {}

    /**
     * Send event to Governance Engine.
     * Retries and error handling should be added here for robust integration.
     */
    async send(event: GovernanceEvent): Promise<GovernanceResponse> {
        const envelope = {
            event_id: uuidv4(),
            event_type: event.type,
            tenant_id: event.tenantId,
            source: event.source,
            correlation_id: event.correlationId || uuidv4(),
            occurred_at: new Date().toISOString(),
            payload: event.payload,
            metadata: {
                actor: event.actor,
                resource: event.resource
            }
        };

        const res = await fetch(`${this.baseUrl}/v1/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(envelope)
        });

        if (!res.ok) {
            throw new Error(`Governance API Error: ${res.status} ${res.statusText}`);
        }

        return await res.json() as GovernanceResponse;
    }
}
