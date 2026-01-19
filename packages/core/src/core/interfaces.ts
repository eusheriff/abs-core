import { DecisionProposal } from './schemas';

export interface DecisionProvider {
    propose(payload: Record<string, unknown>, currentState: string): Promise<Partial<DecisionProposal>>;
}

export type PolicyResult = 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';

export interface PolicyEngine {
    evaluate(proposal: DecisionProposal, event: any): PolicyResult;
}
