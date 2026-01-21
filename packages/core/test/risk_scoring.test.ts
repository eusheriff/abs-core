
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolicyRegistry } from '../src/core/policy-registry';
import { EventProcessor } from '../src/core/processor';
import { LocalDBAdapter } from '../src/infra/db-local';
import { EventEnvelope } from '../src/core/schemas';
import { v4 as uuidv4 } from 'uuid';

describe('Risk Scoring Engine (0-100)', () => {
    let db: LocalDBAdapter;

    beforeEach(async () => {
        db = new LocalDBAdapter(':memory:');
        await db.init(); // Initialize schema explicitly
    });

    it('should aggregate scores correctly in Registry', () => {
        const results = [
            { decision: 'ALLOW', score: 10, reason: 'Small warning' },
            { decision: 'ALLOW', score: 25, reason: 'Another warning' }
        ];

        const aggregated = PolicyRegistry.aggregateRisk(results);
        
        expect(aggregated.score).toBe(35); // 10 + 25
        expect(aggregated.decision).toBe('ESCALATE'); // >= 30
        expect(aggregated.reason).toContain('Small warning');
        expect(aggregated.reason).toContain('Another warning');
    });

    it('should trigger DENY if score >= 80', () => {
        const results = [
            { decision: 'ALLOW', score: 50 },
            { decision: 'ALLOW', score: 40 }
        ];

        const aggregated = PolicyRegistry.aggregateRisk(results);
        
        expect(aggregated.score).toBe(90); // Min(100, 90)
        expect(aggregated.decision).toBe('DENY');
    });

    it('should trigger DENY if explicit DENY is present regardless of score', () => {
        const results = [
            { decision: 'DENY', score: 0, reason: 'Explicit Ban' }, // Score 0 but DENY
            { decision: 'ALLOW', score: 10 }
        ];

        const aggregated = PolicyRegistry.aggregateRisk(results);
        
        expect(aggregated.decision).toBe('DENY');
        expect(aggregated.reason).toContain('Explicit Ban');
    });

    it('Processor should Override ALLOW to ESCALATE on Medium Risk', async () => {
        // Mock Policy to return score 40 (ALLOW but > 30)
        const processor = new EventProcessor(db, { llmProvider: 'mock' });
        
        // Mock PolicyRegistry.getPolicy to return a fixed result
        const mockPolicy = {
            evaluate: () => ({ decision: 'ALLOW', score: 40, reason: 'Calculated Risk' })
        };
        vi.spyOn(PolicyRegistry, 'getPolicy').mockReturnValue(mockPolicy as any);

        const event: EventEnvelope = {
            event_id: uuidv4(),
            event_type: 'test.risk',
            source: 'test',
            tenant_id: 'default',
            correlation_id: uuidv4(),
            occurred_at: new Date().toISOString(),
            payload: { foo: 'bar' }
        };

        const result = await processor.process(event);

        expect(result.decision).toBe('ESCALATE');
        expect(result.status).toBe('pending_review');
        // Check log for risk_score metadata
        const logs = await db.all<any>('SELECT full_log_json FROM decision_logs WHERE event_id = ?', event.event_id);
        const metadata = JSON.parse(logs[0].full_log_json);
        expect(metadata.risk_score).toBe(40);
    });

    it('Processor should Override ALLOW to DENY on Critical Risk', async () => {
        const processor = new EventProcessor(db, { llmProvider: 'mock' });
        
        const mockPolicy = {
            evaluate: () => ({ decision: 'ALLOW', score: 85, reason: 'Critical Risk' })
        };
        vi.spyOn(PolicyRegistry, 'getPolicy').mockReturnValue(mockPolicy as any);

        const event: EventEnvelope = {
            event_id: uuidv4(),
            event_type: 'test.critical',
            source: 'test',
            tenant_id: 'default',
            correlation_id: uuidv4(),
            occurred_at: new Date().toISOString(),
            payload: {}
        };

        const result = await processor.process(event);

        expect(result.decision).toBe('DENY');
        expect(result.status).toBe('processed');
    });
});
