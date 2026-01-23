"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceClient = void 0;
const uuid_1 = require("uuid");
class GovernanceClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }
    /**
     * Send event to Governance Engine.
     * Retries and error handling should be added here for robust integration.
     */
    async send(event) {
        const envelope = {
            event_id: (0, uuid_1.v4)(),
            event_type: event.type,
            tenant_id: event.tenantId,
            source: event.source,
            correlation_id: event.correlationId || (0, uuid_1.v4)(),
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
        return await res.json();
    }
}
exports.GovernanceClient = GovernanceClient;
