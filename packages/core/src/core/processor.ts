import { v4 as uuidv4 } from 'uuid';
import { getProvider } from './provider-factory';
import { PolicyRegistry } from './policy-registry';
import { DecisionProposal } from './schemas';
import { Metrics } from './metrics';
import { DB } from '../infra/db-adapter';

export class EventProcessor {
    constructor(private db: DB) {}

    async process(event: any) {
        const start = Date.now();
        console.log(`⚙️ Processing Event: ${event.event_type} [${event.event_id}]`);

        try {
            // 1. Load Process State (Mock)
            const currentState = 'IDLE'; 

            // 2. AI Decision (LLM / Provider)
            const provider = getProvider(); 
            const partialProposal = await provider.propose(event, currentState);

            // Hydrate Proposal
            const validProposal: DecisionProposal = {
                proposal_id: uuidv4(),
                process_id: event.correlation_id || uuidv4(),
                current_state: currentState,
                recommended_action: partialProposal.recommended_action || 'log_info',
                action_params: partialProposal.action_params || {},
                explanation: partialProposal.explanation || { summary: 'Auto-generated', rationale: 'Default', evidence_refs: [] },
                confidence: partialProposal.confidence || 0.5,
                risk_level: partialProposal.risk_level || 'medium'
            };

            // 3. Policy Gate (Governance)
            const policy = PolicyRegistry.getPolicy(event.event_type);
            const decision = policy.evaluate(validProposal, event);
            
            // 4. Decision Logging (Immutable)
            const decisionId = uuidv4();
            const latency = Date.now() - start;

            await this.db.run(`
                INSERT INTO decision_logs (decision_id, tenant_id, event_id, correlation_id, timestamp, full_log_json)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
                decisionId,
                event.tenant_id,
                event.event_id,
                event.correlation_id,
                new Date().toISOString(),
                JSON.stringify({
                    policy_decision: decision,
                    input_event: event,
                    ai_proposal: validProposal,
                    latency_ms: latency
                })
            );

            Metrics.record('processing_latency', latency);
            console.log(`✅ Decision Logged: ${decision} (${latency}ms)`);

            return {
                decision_id: decisionId,
                status: 'processed',
                decision: decision,
                latency_ms: latency
            };

        } catch (error) {
            console.error('❌ Processing Failed:', error);
            Metrics.record('processing_errors', 1);
            throw error;
        }
    }
}
