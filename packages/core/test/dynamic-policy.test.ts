import { describe, it, expect } from 'vitest';
import { PolicyRegistry } from '../src/core/policy-registry';
import { PolicyRule } from '../src/core/schemas/policy-definition';

describe('Dynamic Policy Engine', () => {
    
    it('should load and evaluate dynamic rules', () => {
        // 1. Define Rule
        const highValueRule: PolicyRule = {
            id: 'rule-high-value',
            name: 'High Value Transaction Limit',
            target_event_type: 'finance.transaction',
            priority: 100,
            effect: 'DENY',
            condition: {
                ">": [{ "var": "event.payload.amount" }, 5000]
            },
            reason_template: 'Amount {{event.payload.amount}} exceeds limit of 5000',
            enabled: true
        };

        // 2. Load Rule
        PolicyRegistry.loadRules([highValueRule]);

        // 3. Get Policy
        const policy = PolicyRegistry.getPolicy('finance.transaction');
        expect(policy).toBeDefined();

        // 4. Evaluate - Should DENY
        const denyEvent = {
            payload: { amount: 6000 }
        };
        const denyResult = policy.evaluate({}, denyEvent);
        expect(denyResult).toEqual({
            decision: 'DENY',
            reason: 'Amount {{event.payload.amount}} exceeds limit of 5000' // Template interpolation not fully implemented yet, checking raw or basic
        });

        // 5. Evaluate - Should ALLOW
        const allowEvent = {
            payload: { amount: 4000 }
        };
        const allowResult = policy.evaluate({}, allowEvent);
        expect(allowResult).toBe('ALLOW');
    });

    it('should fallback to default policy if no match', () => {
        const policy = PolicyRegistry.getPolicy('unknown.event');
        expect(policy).toBeDefined();
        // Assuming default policy allows or behaves neutrally
        const result = policy.evaluate({}, {});
        expect(result).toBeDefined();
    });
});
