import { expect, test, describe } from 'vitest';
import { EventProcessor } from '../src/core/processor';
import { PolicyRegistry } from '../src/core/policy-registry';
import { DynamicPolicy } from '../src/core/dynamic-policy';
import { LocalDBAdapter } from '../src/infra/db-local';
import { MockProvider } from '../src/core/providers/mock';

describe('Risk Scoring Engine', () => {
    test('Should escalate if score is 50+ (High Risk)', async () => {
        // Setup Policy Rule with 60 points
        PolicyRegistry.loadRules([{
            id: 'rule-high-risk',
            name: 'high-risk-rule',
            target_event_type: 'finance.transfer',
            condition: { "==": [1, 1] }, // Always match
            effect: 'ALLOW', // Rule says allow...
            score_impact: 60, // ...but score is High
            enabled: true
        }]);

        const db = new LocalDBAdapter(':memory:');
        await db.init();
        await db.exec(`
          CREATE TABLE IF NOT EXISTS decision_logs (
            decision_id TEXT PRIMARY KEY,
            tenant_id TEXT,
            event_id TEXT,
            policy_name TEXT,
            provider TEXT,
            decision TEXT,
            execution_response TEXT,
            execution_status TEXT,
            full_log_json TEXT,
            timestamp TEXT
          );
          CREATE TABLE IF NOT EXISTS pending_reviews (
            review_id TEXT PRIMARY KEY,
            event_id TEXT,
            tenant_id TEXT,
            decision_id TEXT,
            status TEXT,
            escalation_reason TEXT,
            created_at TEXT
          );
        `);
        const processor = new EventProcessor(db, { llmProvider: 'mock' });

        const result = await processor.process({
            event_id: '123e4567-e89b-12d3-a456-426614174001', // Valid UUID
            event_type: 'finance.transfer',
            source: 'test-system',
            correlation_id: '123e4567-e89b-12d3-a456-426614174002',
            tenant_id: '123e4567-e89b-12d3-a456-426614174003',
            occurred_at: new Date().toISOString(),
            payload: { amount: 1000 }
        });

        expect(result.decision).toBe('ESCALATE'); // Overridden from ALLOW
        expect(result.status).toBe('pending_review');
    });

    test('Should deny if score is 80+ (Critical Risk)', async () => {
        // Setup Policy Rule with 90 points
        PolicyRegistry.loadRules([{
            id: 'rule-critical',
            name: 'critical-risk-rule',
            target_event_type: 'security.login',
            condition: { "==": [1, 1] },
            effect: 'ALLOW',
            score_impact: 90,
            enabled: true
        }]);

        const db = new LocalDBAdapter(':memory:');
        await db.init();
        await db.exec(`
          CREATE TABLE IF NOT EXISTS decision_logs (
            decision_id TEXT PRIMARY KEY,
            tenant_id TEXT,
            event_id TEXT,
            policy_name TEXT,
            provider TEXT,
            decision TEXT,
            execution_response TEXT,
            execution_status TEXT,
            full_log_json TEXT,
            timestamp TEXT
          );
          CREATE TABLE IF NOT EXISTS pending_reviews (
            review_id TEXT PRIMARY KEY,
            event_id TEXT,
            tenant_id TEXT,
            decision_id TEXT,
            status TEXT,
            escalation_reason TEXT,
            created_at TEXT
          );
        `);
        const processor = new EventProcessor(db, { llmProvider: 'mock' });

        const result = await processor.process({
            event_id: '123e4567-e89b-12d3-a456-426614174004', // Valid UUID
            event_type: 'security.login',
            source: 'test-system',
            correlation_id: '123e4567-e89b-12d3-a456-426614174005',
            tenant_id: '123e4567-e89b-12d3-a456-426614174006',
            occurred_at: new Date().toISOString(),
            payload: { user: 'admin' }
        });

        expect(result.decision).toBe('DENY');
    });
});
