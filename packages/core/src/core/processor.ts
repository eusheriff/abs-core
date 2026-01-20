import { v4 as uuidv4 } from 'uuid';

import { PolicyRegistry } from './policy-registry';
import { DecisionProposal, EventEnvelopeSchema, EventEnvelope } from './schemas';
import { Metrics } from './metrics';
import { DatabaseAdapter } from '../infra/db-adapter';
import { getProvider } from './provider-factory';
import { LLMProvider, ProviderType } from './interfaces';
import { sanitize } from './sanitizer';
import { Logger } from './logger';
import { TraceContext, createTraceId, createSpanId } from './context';

export interface ProcessorConfig {
    llmProvider: string;
    llmApiKey?: string;
    llmModel?: string;
    mode?: 'scanner' | 'runtime';
}

export interface ProcessResult {
    decision_id: string;
    status: 'processed' | 'rejected' | 'failed' | 'processed_duplicate' | 'duplicate' | 'pending_review';
    decision: string;
    provider: string;
    latency_ms: number;
    policy_id?: string;
    review_id?: string;
    trace_id?: string; // New field
}

export class EventProcessor {
    private provider: LLMProvider;
    private mode: 'scanner' | 'runtime';

    constructor(private db: DatabaseAdapter, config?: ProcessorConfig) {
        // Safe cast or defaulting. getProvider expects ProviderType.
        const providerName = (config?.llmProvider as ProviderType) || 'mock';
        
        this.provider = getProvider(
            providerName,
            {
                apiKey: config?.llmApiKey,
                model: config?.llmModel
            }
        );
        this.mode = config?.mode || 'runtime';
        // Note: console.log here is fine for startup, or update to use global logger if available
    }

    async process(event: unknown): Promise<ProcessResult> {
        // Create Trace Context
        const traceId = (event as any)?.correlation_id || createTraceId();
        const spanId = createSpanId();
        const traceContext: TraceContext = {
            traceId,
            spanId,
            tenantId: (event as any)?.tenant_id
        };
        const logger = new Logger(traceContext);
        
        const start = Date.now();
        let checkpoint = start;
        const breakdown = {
            validation_ms: 0,
            idempotency_ms: 0,
            sanitization_ms: 0,
            llm_ms: 0,
            policy_ms: 0,
            db_ms: 0,
            overhead_ms: 0
        };

        const tick = () => {
            const now = Date.now();
            const diff = now - checkpoint;
            checkpoint = now;
            return diff;
        };
        
        // 1. SCHEMA VALIDATION (fail fast)
        const validationResult = EventEnvelopeSchema.safeParse(event);
        breakdown.validation_ms = tick();

        if (!validationResult.success) {
            Metrics.recordError('validation');
            const latency = Date.now() - start;
            logger.error('Event validation failed', { error: validationResult.error.message });
            return {
                decision_id: 'validation-failed',
                status: 'rejected',
                decision: 'DENY',
                provider: 'validator',
                latency_ms: latency,
                trace_id: traceId
            };
        }
        const validEvent: EventEnvelope = validationResult.data;
        
        logger.info(`Processing Event: ${validEvent.event_type}`, { 
            event_id: validEvent.event_id, 
            provider: this.provider.name 
        });

        // 0. IDEMPOTENCY CHECK (Prevent duplicate processing)
        try {
            const [existing] = await this.db.all<{ execution_status: string; decision_id: string; full_log_json: string }>(
                `SELECT decision_id, execution_status, full_log_json FROM decision_logs WHERE event_id = ? LIMIT 1`,
                validEvent.event_id
            );
            breakdown.idempotency_ms = tick();

            if (existing) {
                logger.info(`Skipping duplicate event`, { event_id: validEvent.event_id });
                const logData = JSON.parse(existing.full_log_json || '{}');
                return {
                    decision_id: existing.decision_id || 'duplicate',
                    status: 'processed_duplicate', 
                    decision: logData.decision || existing.execution_status,
                    provider: 'cache',
                    latency_ms: 0,
                    policy_id: logData.policy_id,
                    trace_id: traceId
                };
            }
        } catch (e) {
            logger.warn('Idempotency check failed', { error: String(e) });
            breakdown.idempotency_ms = tick();
        }

        try {
            // 2. PROMPT INJECTION CHECK
            const payloadStr = JSON.stringify(validEvent.payload);
            const sanitizeResult = sanitize(payloadStr);
            breakdown.sanitization_ms = tick();
            
            if (sanitizeResult.flagged) {
                Metrics.recordError('injection');
                Metrics.recordDecision('deny', Date.now() - start, 'INJECTION_BLOCKED');
                
                // Log the attempt (for security audit)
                const decisionId = uuidv4();
                await this.logDecision({
                    decisionId,
                    eventId: validEvent.event_id,
                    tenantId: validEvent.tenant_id,
                    policyName: 'INJECTION_BLOCKED',
                    provider: 'sanitizer',
                    decision: 'DENY',
                    reason: `Prompt injection detected: ${sanitizeResult.flags.join(', ')}`,
                    metadata: { 
                        sanitize_result: sanitizeResult, 
                        event: validEvent, 
                        trace_id: traceId,
                        latency_breakdown: breakdown
                    },
                    latency: Date.now() - start
                });
                
                return {
                    decision_id: decisionId,
                    status: 'rejected',
                    decision: 'DENY',
                    provider: 'sanitizer',
                    latency_ms: Date.now() - start,
                    policy_id: 'INJECTION_BLOCKED',
                    trace_id: traceId
                };
            }

            // 3. LLM PROPOSAL (with sanitized input)
            const eventForLLM = { ...validEvent, payload: sanitizeResult.clean };
            const partialProposal = await this.provider.propose(eventForLLM);
            breakdown.llm_ms = tick();

            const validProposal: DecisionProposal = {
                proposal_id: uuidv4(),
                process_id: validEvent.correlation_id || uuidv4(),
                current_state: 'IDLE',
                recommended_action: partialProposal.recommended_action || 'log_info',
                action_params: partialProposal.action_params || {},
                explanation: {
                    summary: partialProposal.explanation?.summary || 'Auto-generated',
                    rationale: partialProposal.explanation?.rationale || 'Default',
                    evidence_refs: partialProposal.explanation?.evidence_refs || []
                },
                confidence: partialProposal.confidence || 0.5,
                risk_level: (partialProposal.risk_level as any) || 'medium' // Safe cast for now, assuming provider validates or defaults safely
            };

            // 4. POLICY GATE (Governance)
            const policy = PolicyRegistry.getPolicy(validEvent.event_type);
            const rawDecision = policy.evaluate(validProposal, validEvent);
            const decisionStr = typeof rawDecision === 'string' ? rawDecision : rawDecision.decision || 'unknown';
            breakdown.policy_ms = tick();

            // SCANNER MODE OVERRIDE
            let executionStatus = decisionStr;
            let scannerNote = '';

            if (this.mode === 'scanner' && decisionStr === 'DENY') {
                logger.warn(`[Scanner] Suppressing DENY. Marking as MONITOR.`, { event_id: validEvent.event_id });
                executionStatus = 'MONITOR'; // Override for client
                scannerNote = ' [Scanner Override: Would be DENY]';
            }

            // ESCALATE HANDLING (Human-in-the-Loop)
            if (decisionStr === 'ESCALATE') {
                const decisionId = uuidv4();
                const reviewId = uuidv4();
                const latency = Date.now() - start;
                const escalationReason = typeof rawDecision === 'object' && rawDecision.reason 
                    ? rawDecision.reason 
                    : validProposal.explanation.summary;

                // Log the decision first
                await this.logDecision({
                    decisionId,
                    tenantId: validEvent.tenant_id,
                    eventId: validEvent.event_id,
                    policyName: policy.name || 'default',
                    provider: this.provider.name,
                    decision: 'ESCALATE',
                    reason: escalationReason,
                    metadata: { 
                        ai_proposal: validProposal, 
                        input_event: validEvent, 
                        review_id: reviewId, 
                        trace_id: traceId,
                        latency_breakdown: breakdown
                    },
                    latency
                });

                // Create pending review
                await this.createPendingReview({
                    reviewId,
                    eventId: validEvent.event_id,
                    tenantId: validEvent.tenant_id,
                    decisionId,
                    reason: escalationReason
                });

                Metrics.recordDecision('escalate', latency, policy.name);
                logger.info(`Decision ESCALATE: Pending human review`, { review_id: reviewId, event_id: validEvent.event_id });

                return {
                    decision_id: decisionId,
                    status: 'pending_review',
                    decision: 'ESCALATE',
                    provider: this.provider.name,
                    latency_ms: latency,
                    policy_id: policy.name,
                    review_id: reviewId,
                    trace_id: traceId
                };
            }
            
            // 5. IMMUTABLE DECISION LOG
            const decisionId = uuidv4();
            const latency = Date.now() - start;
            breakdown.overhead_ms = latency - (breakdown.validation_ms + breakdown.idempotency_ms + breakdown.sanitization_ms + breakdown.llm_ms + breakdown.policy_ms);

            try {
                const dbStart = Date.now();
                await this.logDecision({
                    decisionId,
                    tenantId: validEvent.tenant_id,
                    eventId: validEvent.event_id,
                    policyName: policy.name || 'default',
                    provider: this.provider.name,
                    decision: decisionStr, // Log REAL intent
                    reason: validProposal.explanation.summary + scannerNote,
                    metadata: { 
                        ai_proposal: validProposal, 
                        input_event: validEvent, 
                        scanner_override: executionStatus !== decisionStr,
                        trace_id: traceId,
                        latency_breakdown: { ...breakdown, db_ms: Date.now() - dbStart } // Capture final DB write time
                    },
                    latency
                });

                Metrics.recordDecision(
                    decisionStr.toLowerCase() as any,
                    latency,
                    policy.name
                );

                logger.info(`Decision Logged: ${decisionStr}`, { 
                    executed_as: executionStatus, 
                    latency_ms: latency,
                    breakdown 
                });

                return {
                    decision_id: decisionId,
                    status: 'processed',
                    decision: executionStatus,
                    provider: this.provider.name,
                    latency_ms: latency,
                    policy_id: policy.name,
                    trace_id: traceId
                };
            } catch (err: any) {
                // Handle Race Condition (Unique Constraint Violation)
                const isConstraint = String(err).includes('UNIQUE constraint') || String(err).includes('constraint failed');
                
                if (isConstraint) {
                    logger.warn('Race condition detected: checking for existing decision', { event_id: validEvent.event_id });
                    
                    // Fetch the winner
                    const [existing] = await this.db.all<{ execution_status: string; decision_id: string; full_log_json: string }>(
                        `SELECT decision_id, execution_status, full_log_json FROM decision_logs WHERE event_id = ? LIMIT 1`,
                        validEvent.event_id
                    );

                    if (existing) {
                        const logData = JSON.parse(existing.full_log_json || '{}');
                        return {
                            decision_id: existing.decision_id,
                            status: 'processed_duplicate',
                            decision: logData.decision || existing.execution_status,
                            provider: 'race_condition_winner',
                            latency_ms: latency,
                            trace_id: traceId
                        };
                    }
                }
                
                // Real DB error
                Metrics.recordError('db');
                throw new Error('Decision log failed - ' + String(err));
            }

        } catch (error) {
            logger.error('Processing Failed', { error: String(error) });
            Metrics.recordError('llm');
            throw error;
        }
    }

    private async logDecision(params: {
        decisionId: string;
        tenantId: string;
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
                INSERT INTO decision_logs (decision_id, tenant_id, event_id, policy_name, provider, decision, execution_response, full_log_json, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                params.decisionId,
                params.tenantId,
                params.eventId,
                params.policyName,
                params.provider,
                params.decision,
                params.reason,
                JSON.stringify(params.metadata),
                new Date().toISOString()
            );
            return { success: result.isSuccess !== false };
        } catch (error) {
            // Re-throw so the caller can handle specific errors (e.g., constraints)
            // Error logging happens in the caller context
            throw error;
        }
    }

    private async createPendingReview(params: {
        reviewId: string;
        eventId: string;
        tenantId: string;
        decisionId: string;
        reason: string;
    }): Promise<{ success: boolean }> {
        try {
            const result = await this.db.run(`
                INSERT INTO pending_reviews (review_id, event_id, tenant_id, decision_id, status, escalation_reason, created_at)
                VALUES (?, ?, ?, ?, 'pending', ?, ?)
            `,
                params.reviewId,
                params.eventId,
                params.tenantId,
                params.decisionId,
                params.reason,
                new Date().toISOString()
            );
            return { success: result.isSuccess !== false };
        } catch (e) {
            console.error('Failed to create pending review:', e);
            return { success: false };
        }
    }
}
