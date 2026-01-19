import { describe, it, expect } from 'vitest';
import { PolicyRegistry } from '../src/core/policy-registry';
import { SimplePolicyEngine } from '../src/core/policy';
import { PolicyEngine, PolicyResult } from '../src/core/interfaces';

// Mock Policies
class FinancePolicy implements PolicyEngine {
    evaluate(proposal: any, event: any): PolicyResult {
        return 'MANUAL_REVIEW'; // Finance always manual
    }
}

class SupportPolicy implements PolicyEngine {
    evaluate(proposal: any, event: any): PolicyResult {
        return 'ALLOW'; // Support always allow
    }
}

describe('Multi-Policy Engine', () => {
    // Register policies
    PolicyRegistry.register('finance', new FinancePolicy());
    PolicyRegistry.register('support', new SupportPolicy());

    it('should select FinancePolicy for finance events', () => {
        const policy = PolicyRegistry.getPolicy('finance.transaction.created');
        expect(policy).toBeInstanceOf(FinancePolicy);
        
        const result = policy.evaluate({} as any, {});
        expect(result).toBe('MANUAL_REVIEW');
    });

    it('should select SupportPolicy for support events', () => {
        const policy = PolicyRegistry.getPolicy('support.ticket.created');
        expect(policy).toBeInstanceOf(SupportPolicy);

        const result = policy.evaluate({} as any, {});
        expect(result).toBe('ALLOW');
    });

    it('should fallback to DefaultPolicy for unknown events', () => {
        const policy = PolicyRegistry.getPolicy('unknown.event.type');
        expect(policy).toBeInstanceOf(SimplePolicyEngine);
    });
});
