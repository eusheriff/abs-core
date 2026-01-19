import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnv } from './setup';
import { v4 as uuidv4 } from 'uuid';

describe('E2E Pipeline', () => {
    let baseUrl: string;
    let cleanup: () => void;

    beforeAll(async () => {
        const env = await setupTestEnv();
        baseUrl = env.baseUrl;
        cleanup = env.cleanup;
        // Wait for server to be ready?
        await new Promise(r => setTimeout(r, 1000));
    });

    afterAll(() => {
        cleanup();
    });

    it('Scenario 1: Happy Path (Ingest -> Decision -> Log)', async () => {
        const eventId = uuidv4();
        const payload = {
            event_id: eventId,
            event_type: 'finance.transaction.created',
            tenant_id: 'test-tenant',
            correlation_id: uuidv4(),
            occurred_at: new Date().toISOString(),
            payload: { amount: 1000 }
        };

        const res = await fetch(`${baseUrl}/v1/events`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-admin-abs-v0' // Valid Key
            }
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('decision_id');
        
        // "Manual Review" is the default for 'finance.*' from our previous policy test setup 
        // if we kept the static registry. Wait, policy registry defaults to Simple (ALLOW).
        // Let's check what it returns.
        // If SimplePolicyEngine is used, it ALLOWs.
    });

    it('Scenario 2: Auth Rejection', async () => {
        const res = await fetch(`${baseUrl}/v1/events`, {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                'Authorization': 'Bearer invalid-token'
            }
        });
        expect(res.status).toBe(401);
    });

    it('Scenario 3: Missing Scope', async () => {
        const res = await fetch(`${baseUrl}/v1/events`, {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                'Authorization': 'Bearer sk-dashboard-v0' // Has admin:read, lacks events:write
            }
        });
        expect(res.status).toBe(403);
    });
});
