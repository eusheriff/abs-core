
import { describe, it, expect } from 'vitest';
import { DynamicPolicy } from '../src/core/dynamic-policy';
import { PolicyRule } from '../src/core/schemas';
import { v4 as uuidv4 } from 'uuid';

describe('Governance L3 (Domain Context)', () => {

    it('should return domain and tags in decision result', () => {
        const rule: PolicyRule = {
            id: 'rule-1',
            name: 'Financial Audit',
            target_event: 'finance.tx',
            condition: { "==": [1, 1] }, // Always match
            effect: 'ESCALATE',
            score_impact: 80,
            domain: 'FINANCIAL',
            tags: ['audit', 'high-value'],
            enabled: true,
            created_at: new Date().toISOString()
        };

        const policy = new DynamicPolicy(rule);
        
        const proposal = {
             proposal_id: uuidv4(), process_id: 'p1', current_state: 's', recommended_action: 'pay', action_params: {}, 
             explanation: { summary: '', rationale: '', evidence_refs: [] }, confidence: 1, risk_level: 'low' as const
        };
        const event = {
             event_id: uuidv4(), correlation_id: 'c1', event_type: 'finance.tx', tenant_id: 't1', 
             occurred_at: new Date().toISOString(), source: 'src', payload: {} 
        };

        const result = policy.evaluate(proposal, event);

        expect(result).toHaveProperty('domain', 'FINANCIAL');
        expect(result).toHaveProperty('tags');
        expect((result as any).tags).toContain('audit');
        expect((result as any).score).toBe(80);
    });

     it('should default to GENERAL domain if unspecified', () => {
        // Zod defaults handle this usually, but checking logic fallback
        const rule: PolicyRule = {
            id: 'rule-2',
            name: 'Generic Rule',
            target_event: 'test',
            condition: { "==": [1, 1] }, 
            effect: 'ALLOW',
            score_impact: 0,
            // no domain specified, Zod should default to GENERAL
            enabled: true,
            created_at: new Date().toISOString()
        } as any; // Cast mainly to bypass strict TS check if testing fallback

        // If Zod parser was used, it would default.
        // But DynamicPolicy constructor takes a ruled object.
        // The evaluate method logic: `const domain = (this.rule as any).domain || 'GENERAL';` verifies fallback.
        
        const policy = new DynamicPolicy(rule);
        // Mock args
        const result = policy.evaluate({} as any, {} as any);
        
        expect((result as any).domain).toBe('GENERAL');
    });

});
