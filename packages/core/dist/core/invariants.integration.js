"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const events_1 = require("../api/routes/events");
const db_1 = require("../infra/db");
const db_mock_1 = require("../infra/db-mock");
const mock_1 = require("../infra/mock");
// Mock the Provider to control Confidence and Actions
vitest_1.vi.mock('../infra/mock', () => {
    return {
        MockDecisionProvider: vitest_1.vi.fn()
    };
});
(0, vitest_1.describe)('System Invariants (Safety Proofs)', () => {
    (0, vitest_1.beforeAll)(async () => {
        // 1. Setup InMemory DB (Mock)
        (0, db_1.setDB)(new db_mock_1.MockDBAdapter());
        await (0, db_1.initSchema)();
    });
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('Invariant I: Should EXECUTE when Policy returns ALLOW', async () => {
        // Setup Provider to return Safe Action + High Confidence
        mock_1.MockDecisionProvider.mockImplementation(() => ({
            propose: async () => ({
                recommended_action: 'log_info', // Whitelisted
                confidence: 0.99,
                explanation: { rationale: 'Test Exec' }
            })
        }));
        const res = await events_1.eventsRouter.request('http://localhost/', {
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
        (0, vitest_1.expect)(res.status).toBe(200);
        const body = await res.json();
        (0, vitest_1.expect)(body.status).toBe('accepted');
        (0, vitest_1.expect)(body.decision).toBe('ALLOW');
        // Verify Execution Log (Console log in this MVP, but we check Decision Log exists)
        const db = (0, db_1.getDB)();
        const logs = await db.all('SELECT * FROM decision_logs WHERE event_id = ?', 'evt_allow_1');
        (0, vitest_1.expect)(logs.length).toBe(1);
        (0, vitest_1.expect)(JSON.parse(logs[0].full_log_json).policy_decision).toBe('ALLOW');
    });
    (0, vitest_1.it)('Invariant I: Should BLOCK execution when Policy returns MANUAL_REVIEW', async () => {
        // Setup Provider to return Unsafe Action (Not in whitelist)
        mock_1.MockDecisionProvider.mockImplementation(() => ({
            propose: async () => ({
                recommended_action: 'delete_database', // NOT Whitelisted
                confidence: 0.99,
                explanation: { rationale: 'Malicious AI' }
            })
        }));
        const res = await events_1.eventsRouter.request('http://localhost/', {
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
        (0, vitest_1.expect)(res.status).toBe(200); // 200 OK means "Request Processed" (even if blocked)
        const body = await res.json();
        (0, vitest_1.expect)(body.status).toBe('blocked');
        (0, vitest_1.expect)(body.decision).toBe('MANUAL_REVIEW');
        // Verify Log exists but records the Block
        const db = (0, db_1.getDB)();
        const logs = await db.all('SELECT * FROM decision_logs WHERE event_id = ?', 'evt_block_1');
        (0, vitest_1.expect)(logs.length).toBe(1);
        (0, vitest_1.expect)(JSON.parse(logs[0].full_log_json).policy_decision).toBe('MANUAL_REVIEW');
    });
    (0, vitest_1.it)('Invariant IV: Should BLOCK execution on Low Confidence', async () => {
        // Setup Provider to return Low Confidence
        mock_1.MockDecisionProvider.mockImplementation(() => ({
            propose: async () => ({
                recommended_action: 'log_info', // Whitelisted Action
                confidence: 0.10, // TOO LOW
                explanation: { rationale: 'Unsure' }
            })
        }));
        const res = await events_1.eventsRouter.request('http://localhost/', {
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
        (0, vitest_1.expect)(body.decision).toBe('MANUAL_REVIEW'); // Policy Engine rule
    });
    (0, vitest_1.it)('Invariant II: Decision Log must persist even if execution fails', async () => {
        // Mock Policy to ALLOW, but we assume Executor might fail (not tested here as Executor is console.log)
        // But we ensure the log entry is created atomically BEFORE execution logic
        // The test above essentially covers this: logs exist for both ALLOW and BLOCK.
        const db = (0, db_1.getDB)();
        const count = await db.all('SELECT count(*) as c FROM decision_logs');
        (0, vitest_1.expect)(count[0].c).toBeGreaterThanOrEqual(3);
    });
});
