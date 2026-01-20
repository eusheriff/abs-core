import { v4 as uuidv4 } from 'uuid';

import { PolicyRegistry } from './policy-registry';
import { DecisionProposal } from './schemas';
import { Metrics } from './metrics';
import { DB } from '../infra/db-adapter';
import { LLMProvider, getProvider, ProviderType } from './provider-factory';

export interface ProcessorConfig {
    llmProvider: ProviderType;
    llmApiKey?: string;
    llmModel?: string;
}

export class EventProcessor {
    private provider: LLMProvider;

    constructor(private db: DB, config?: ProcessorConfig) {
        // Initialize LLM provider based on config
        this.provider = getProvider(
            config?.llmProvider || 'mock',
            {
                apiKey: config?.llmApiKey,
                model: config?.llmModel
            }
        );
        console.log(`[Processor] Initialized with ${this.provider.name} provider`);
    }

    async process(event: any) {
        const start = Date.now();
        console.log(`⚙️ Processing Event: ${event.event_type} [${event.event_id}] via ${this.provider.name}`);

        try {
            // 1. Load Process State
            const currentState = 'IDLE'; 

            // 2. AI Decision (LLM Provider)
            const partialProposal = await this.provider.propose(event);

            // Hydrate Proposal with defaults
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
                INSERT INTO decision_logs (id, event_id, policy_name, provider, decision, reason, metadata, latency_ms, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                decisionId,
                event.event_id,
                policy.name || 'default',
                this.provider.name,
                decision,
                validProposal.explanation.summary,
                JSON.stringify({
                    ai_proposal: validProposal,
                    input_event: event
                }),
                latency,
                new Date().toISOString()
            );

            Metrics.record('processing_latency', latency);
            console.log(`✅ Decision Logged: ${decision} (${latency}ms) via ${this.provider.name}`);

            return {
                decision_id: decisionId,
                status: 'processed',
                decision: decision,
                provider: this.provider.name,
                latency_ms: latency
            };

        } catch (error) {
            console.error('❌ Processing Failed:', error);
            Metrics.record('processing_errors', 1);
            throw error;
        }
    }
}
