
import { describe, it, expect, beforeEach } from 'vitest';
import { EventProcessor } from '../src/core/processor';
import { LocalDBAdapter } from '../src/infra/db-local';
import { v4 as uuidv4 } from 'uuid';
import { EventEnvelope } from '../src/core/schemas';

describe('Gatekeeper Interactive Mode', () => {
    let db: LocalDBAdapter;

    beforeEach(() => {
        db = new LocalDBAdapter(':memory:');
        db.run(`
            CREATE TABLE IF NOT EXISTS events_store (
                id TEXT PRIMARY KEY, tenant_id TEXT, type TEXT, payload TEXT, source TEXT, timestamp TEXT, status TEXT, hash TEXT, previous_hash TEXT
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS decision_logs (
                decision_id TEXT PRIMARY KEY, event_id TEXT, tenant_id TEXT, event_type TEXT, 
                decision TEXT, policy_id TEXT, reason TEXT, risk_score INTEGER, risk_factors TEXT,
                model TEXT, latency_ms INTEGER, created_at TEXT, full_log_json TEXT,
                execution_status TEXT DEFAULT 'pending', execution_response TEXT
            )
        `);
         db.run(`
            CREATE TABLE IF NOT EXISTS pending_reviews (
                review_id TEXT PRIMARY KEY, event_id TEXT, tenant_id TEXT, decision_id TEXT, reason TEXT, status TEXT, created_at TEXT, reviewed_at TEXT, review_note TEXT
            )
        `);
    });

    it('should suspend execution for high risk events in interactive mode', async () => {
        const processor = new EventProcessor(db, {
            llmProvider: 'mock',
            mode: 'runtime',
            interactive_mode: true
        });

        // 1. Create High Risk Event
        const event: EventEnvelope = {
            event_id: uuidv4(),
            event_type: 'system.critical_action', // Triggers Escalation by default policy if exists, or we need to ensure high risk
            source: 'test',
            correlation_id: uuidv4(),
            tenant_id: 'test-tenant',
            occurred_at: new Date().toISOString(),
            payload: { action: 'delete_database' }
        };

        // For this test to work, we need a policy that triggers ESCALATE (Score 50).
        // Since we are using the real processor which uses PolicyRegistry, 
        // and default registry might not have 'system.critical_action' mapped to high risk.
        // We can mock the PolicyRegistry or rely on default behavior.
        // Or we can register a dynamic policy.
        
        // Let's rely on the Processor's threshold if we can inject a high score rule.
        // Actually, the Processor calculates score from the policy. 
        // If no policy matches, it defaults to ALLOW (Score 0).
        
        // Let's manually insert a Policy into the Registry (Static for now?)
        // The PolicyRegistry is a singleton.
        const { PolicyRegistry } = await import('../src/core/policy-registry');
        const { DynamicPolicy } = await import('../src/core/dynamic-policy');
        
        PolicyRegistry.register(new DynamicPolicy('test-high-risk', {
            id: 'test-high-risk',
            name: 'Test High Risk Rule',
            target_event: 'system.critical_action',
            condition: { "==": [1, 1] }, // Always match
            effect: 'ESCALATE', // Returns Score 50
            score_impact: 50,
            enabled: true,
            created_at: new Date().toISOString()
        }));

        const result = await processor.process(event);

        expect(result.status).toBe('suspended');
        expect(result.decision).toBe('ESCALATE');
        
        // Verify Log
        const logs = await db.all<any>('SELECT * FROM decision_logs WHERE event_id = ?', event.event_id);
        expect(logs.length).toBe(1);
        expect(logs[0].execution_status).toBe('suspended');
    });

    it('should NOT suspend validation errors or Low Risk', async () => {
         const processor = new EventProcessor(db, {
            llmProvider: 'mock',
            mode: 'runtime',
            interactive_mode: true
        });

        const event: EventEnvelope = {
            event_id: uuidv4(),
            event_type: 'safe.action',
            source: 'test',
            correlation_id: uuidv4(),
            tenant_id: 'test-tenant',
            occurred_at: new Date().toISOString(),
            payload: { action: 'read' }
        };

        const result = await processor.process(event);
        
        // 'safe.action' has no policy -> ALLOW -> Score 0
        expect(result.status).toBe('processed');
    });
});
