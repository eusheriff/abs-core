import { v4 as uuidv4 } from 'uuid';

import { PolicyRegistry } from './policy-registry';
import { DecisionProposal, EventEnvelopeSchema, EventEnvelope } from './schemas';
import { Metrics } from './metrics';
import { DB } from '../infra/db-adapter';
import { LLMProvider, getProvider, ProviderType } from './provider-factory';
import { sanitizeInput } from './sanitizer';

export interface ProcessorConfig {
    llmProvider: ProviderType;
    llmApiKey?: string;
    llmModel?: string;
}

export interface ProcessResult {
    decision_id: string;
    status: 'processed' | 'rejected' | 'failed';
    decision: string;
    provider: string;
    latency_ms: number;
    policy_id?: string;
}

export class EventProcessor {
    private provider: LLMProvider;

    constructor(private db: DB, config?: ProcessorConfig) {
        this.provider = getProvider(
            config?.llmProvider || 'mock',
            {
                apiKey: config?.llmApiKey,
                model: config?.llmModel
            }
        );
        console.log(`[Processor] Initialized with ${this.provider.name} provider`);
    }

    async process(event: unknown): Promise<ProcessResult> {
        const start = Date.now();
        
        // 1. SCHEMA VALIDATION (fail fast)
        const validationResult = EventEnvelopeSchema.safeParse(event);
        if (!validationResult.success) {
            Metrics.recordError('validation');
            const latency = Date.now() - start;
            console.error('❌ Event validation failed:', validationResult.error.message);
            return {
                decision_id: 'validation-failed',
                status: 'rejected',
                decision: 'DENY',
                provider: 'validator',
                latency_ms: latency
            };
        }
        const validEvent: EventEnvelope = validationResult.data;
        
        console.log(`⚙️ Processing Event: ${validEvent.event_type} [${validEvent.event_id}] via ${this.provider.name}`);

        try {
            // 2. PROMPT INJECTION CHECK
            const payloadStr = JSON.stringify(validEvent.payload);
            const sanitizeResult = sanitizeInput(payloadStr);
            
            if (sanitizeResult.risk === 'critical') {
                Metrics.recordError('injection');
                Metrics.recordDecision('deny', Date.now() - start, 'INJECTION_BLOCKED');
                
                // Log the attempt (for security audit)
                const decisionId = uuidv4();
                await this.logDecision({
                    decisionId,
                    eventId: validEvent.event_id,
                    policyName: 'INJECTION_BLOCKED',
                    provider: 'sanitizer',
                    decision: 'DENY',
                    reason: `Prompt injection detected: ${sanitizeResult.matches.join(', ')}`,
                    metadata: { sanitize_result: sanitizeResult, event: validEvent },
                    latency: Date.now() - start
                });
                
                return {
                    decision_id: decisionId,
                    status: 'rejected',
                    decision: 'DENY',
                    provider: 'sanitizer',
                    latency_ms: Date.now() - start,
                    policy_id: 'INJECTION_BLOCKED'
                };
            }

            // 3. LLM PROPOSAL (with sanitized input)
            const eventForLLM = { ...validEvent, payload: sanitizeResult.sanitized };
            const partialProposal = await this.provider.propose(eventForLLM);

            const validProposal: DecisionProposal = {
                proposal_id: uuidv4(),
                process_id: validEvent.correlation_id || uuidv4(),
                current_state: 'IDLE',
                recommended_action: partialProposal.recommended_action || 'log_info',
                action_params: partialProposal.action_params || {},
                explanation: partialProposal.explanation || { summary: 'Auto-generated', rationale: 'Default', evidence_refs: [] },
                confidence: partialProposal.confidence || 0.5,
                risk_level: partialProposal.risk_level || 'medium'
            };

            // 4. POLICY GATE (Governance)
            const policy = PolicyRegistry.getPolicy(validEvent.event_type);
            const decision = policy.evaluate(validProposal, validEvent);
            
            // 5. IMMUTABLE DECISION LOG (MUST succeed before returning)
            const decisionId = uuidv4();
            const latency = Date.now() - start;

            const logResult = await this.logDecision({
                decisionId,
                eventId: validEvent.event_id,
                policyName: policy.name || 'default',
                provider: this.provider.name,
                decision: typeof decision === 'string' ? decision : decision.decision || 'unknown',
                reason: validProposal.explanation.summary,
                metadata: { ai_proposal: validProposal, input_event: validEvent },
                latency
            });

            // CRITICAL: If log failed, we MUST NOT return success
            if (!logResult.success) {
                Metrics.recordError('db');
                throw new Error('Decision log failed - aborting to maintain invariant');
            }

            // 6. Record metrics with proper method
            const decisionStr = typeof decision === 'string' ? decision.toLowerCase() : 'unknown';
            Metrics.recordDecision(
                decisionStr as 'allow' | 'deny' | 'escalate' | 'handoff',
                latency,
                policy.name
            );

            console.log(`✅ Decision Logged: ${decision} (${latency}ms) via ${this.provider.name}`);

            return {
                decision_id: decisionId,
                status: 'processed',
                decision: typeof decision === 'string' ? decision : decision.decision || 'unknown',
                provider: this.provider.name,
                latency_ms: latency,
                policy_id: policy.name
            };

        } catch (error) {
            console.error('❌ Processing Failed:', error);
            Metrics.recordError('llm');
            throw error;
        }
    }

    private async logDecision(params: {
        decisionId: string;
        eventId: string;
        policyName: string;
        provider: string;
        decision: string;
        reason: string;
        metadata: object;
        latency: number;
    }): Promise<{ success: boolean }> {
        try {
            const result = await this.db.run(`
                INSERT INTO decision_logs (id, event_id, policy_name, provider, decision, reason, metadata, latency_ms, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                params.decisionId,
                params.eventId,
                params.policyName,
                params.provider,
                params.decision,
                params.reason,
                JSON.stringify(params.metadata),
                params.latency,
                new Date().toISOString()
            );
            return { success: result?.isSuccess !== false };
        } catch (error) {
            console.error('Failed to log decision:', error);
            return { success: false };
        }
    }
}
