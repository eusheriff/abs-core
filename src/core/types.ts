import { DecisionProposal } from './schemas';

// Interface for any decision provider (LLM, Mock, Rule Engine)
export interface DecisionProvider {
  propose(context: any, currentState: string): Promise<Partial<DecisionProposal>>;
}
