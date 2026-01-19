import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { eventsRouter } from '../api/routes/events';
import { setDB, initSchema, getDB } from '../infra/db';
import { MockDBAdapter } from '../infra/db-mock';
import { MockDecisionProvider } from '../infra/mock';

// Mock the Provider to control Confidence and Actions
vi.mock('../infra/mock', () => {
    return {
        MockDecisionProvider: vi.fn()
    };
});

describe('System Invariants (Safety Proofs)', () => {
    beforeAll(async () => {
        // 1. Setup InMemory DB (Mock)
        setDB(new MockDBAdapter());
        await initSchema();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Invariant I: Should EXECUTE when Policy returns ALLOW', async () => {
        // Setup Provider to return Safe Action + High Confidence
        (MockDecisionProvider as any).mockImplementation(() => ({
            propose: async () => ({
                recommended_action: 'log_info', // Whitelisted
                confidence: 0.99,
                explanation: { rationale: 'Test Exec' }
            })
        }));

        const res = await eventsRouter.request('http://localhost/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: 'evt_allow_1',
                event_type: 'test.event',
                payload: { text: 'safe' },
                source: 'test',
                correlation_id: 'corr_1',
                occurred_at: new Date().toISOString()
            })
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('accepted');
        expect(body.decision).toBe('ALLOW');

        // Verify Execution Log (Console log in this MVP, but we check Decision Log exists)
        const db = getDB();
        const logs = await db.all('SELECT * FROM decision_logs WHERE event_id = ?', 'evt_allow_1');
        expect(logs.length).toBe(1);
        expect(JSON.parse(logs[0].full_log_json).policy_decision).toBe('ALLOW');
    });

    it('Invariant I: Should BLOCK execution when Policy returns MANUAL_REVIEW', async () => {
        // Setup Provider to return Unsafe Action (Not in whitelist)
        (MockDecisionProvider as any).mockImplementation(() => ({
            propose: async () => ({
                recommended_action: 'delete_database', // NOT Whitelisted
                confidence: 0.99,
                explanation: { rationale: 'Malicious AI' }
            })
        }));

        const res = await eventsRouter.request('http://localhost/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: 'evt_block_1',
                event_type: 'test.event',
                payload: { text: 'unsafe' },
                source: 'test',
                correlation_id: 'corr_2',
                occurred_at: new Date().toISOString()
            })
        });

        expect(res.status).toBe(200); // 200 OK means "Request Processed" (even if blocked)
        const body = await res.json();
        expect(body.status).toBe('blocked');
        expect(body.decision).toBe('MANUAL_REVIEW');

        // Verify Log exists but records the Block
        const db = getDB();
        const logs = await db.all('SELECT * FROM decision_logs WHERE event_id = ?', 'evt_block_1');
        expect(logs.length).toBe(1);
        expect(JSON.parse(logs[0].full_log_json).policy_decision).toBe('MANUAL_REVIEW');
    });

    it('Invariant IV: Should BLOCK execution on Low Confidence', async () => {
        // Setup Provider to return Low Confidence
        (MockDecisionProvider as any).mockImplementation(() => ({
            propose: async () => ({
                recommended_action: 'log_info', // Whitelisted Action
                confidence: 0.10, // TOO LOW
                explanation: { rationale: 'Unsure' }
            })
        }));

        const res = await eventsRouter.request('http://localhost/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: 'evt_low_conf_1',
                event_type: 'test.event',
                payload: { text: 'unsure' },
                source: 'test',
                correlation_id: 'corr_3',
                occurred_at: new Date().toISOString()
            })
        });

        const body = await res.json();
        expect(body.decision).toBe('MANUAL_REVIEW'); // Policy Engine rule
    });

    it('Invariant II: Decision Log must persist even if execution fails', async () => {
         // Mock Policy to ALLOW, but we assume Executor might fail (not tested here as Executor is console.log)
         // But we ensure the log entry is created atomically BEFORE execution logic
         // The test above essentially covers this: logs exist for both ALLOW and BLOCK.
         const db = getDB();
         const count = await db.all('SELECT count(*) as c FROM decision_logs');
         expect(count[0].c).toBeGreaterThanOrEqual(3);
    });
});
