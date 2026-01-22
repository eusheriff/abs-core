import { v4 as uuidv4 } from 'uuid';

import { PolicyRegistry } from './policy-registry';
import { DecisionProposal, EventEnvelopeSchema, EventEnvelope, DecisionEnvelope, Verdict, ReasonCode } from './schemas';
import { Metrics } from './metrics';
import { DatabaseAdapter } from '../infra/db-adapter';
import { getProvider } from './provider-factory';
import { LLMProvider, ProviderType } from './interfaces';
import { sanitize } from './sanitizer';
import { Logger } from './logger';
import { TraceContext, createTraceId, createSpanId } from './context';
import { signer } from '../crypto/signer';

import { OrchestrationAdapter } from '../orchestration/interfaces';

// Advanced Governance Modules
import { getSequenceAnalyzer } from './sequence-analyzer';
import { ActionSanitizer } from './action-sanitizer';
import * as AgentMemory from './agent-memory';
import { SessionManager } from './session-manager';
import { SemanticTracer } from './semantic-tracer';


export interface ProcessorConfig {
    llmProvider: string;
    llmApiKey?: string;
    llmModel?: string;
    mode?: 'scanner' | 'runtime';
    orchestrator?: OrchestrationAdapter;
    interactive_mode?: boolean;
}

export interface ProcessResult {
    envelope: DecisionEnvelope; // ADR-008: Return full envelope
    status: 'processed' | 'rejected' | 'failed' | 'processed_duplicate' | 'duplicate' | 'pending_review' | 'queued' | 'suspended';
}

export class EventProcessor {
    private provider: LLMProvider;
    private mode: 'scanner' | 'runtime';
    private orchestrator?: OrchestrationAdapter;
    private interactive: boolean;

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
        this.orchestrator = config?.orchestrator;
        this.interactive = config?.interactive_mode || (typeof process !== 'undefined' && process.env.ABS_INTERACTIVE === 'true') || false;
    }

    /**
     * Submit an event for asynchronous processing via the Orchestrator.
     * @param event The event envelope
     * @returns task_id
     */
    async submitAsync(event: EventEnvelope): Promise<string> {
        if (!this.orchestrator) {
            throw new Error('Orchestration not configured');
        }

        // Validate basic envelope before queuing
        const validation = EventEnvelopeSchema.safeParse(event);
        if (!validation.success) {
            throw new Error('Event validation failed: ' + validation.error.message);
        }

        return this.orchestrator.schedule({
            id: event.event_id, // Use event ID as task ID for idempotency mapping
            type: 'process_event',
            payload: event
        });
    }

    /**
     * Register this processor as a worker for the orchestrator.
     */
    async startWorker(): Promise<void> {
        if (!this.orchestrator) return;

        this.orchestrator.worker('process_event', async (task) => {
            await this.process(task.payload);
        });
        
        await this.orchestrator.connect();
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
            // Construct Failure Envelope
            const envelope: DecisionEnvelope = {
                contract_version: "1.0.0",
                decision_id: uuidv4(),
                trace_id: traceId,
                timestamp: new Date().toISOString(),
                signature: { alg: "HMAC-SHA256", key_id: "abs-kernel-v0", value: "unsigned_error" },
                decision_type: 'SYSTEM_ERROR',
                verdict: 'SYSTEM_FAILURE',
                reason_code: 'INPUT.MALFORMED',
                reason_human: validationResult.error.message,
                risk_score: 100,
                authority: { type: 'SYSTEM', id: 'schema-validator' },
                jurisdiction: 'ABS_KERNEL_DEFAULT',
                policy_id: 'schema-validation',
                monitor_mode: false
            };
            
            return {
                envelope,
                status: 'rejected'
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
                // Re-hydrate envelope from DB if possible, or construct legacy wrapper
                const envelope: DecisionEnvelope = logData.contract_version ? logData : {
                    contract_version: "1.0.0",
                    decision_id: existing.decision_id,
                    trace_id: traceId,
                    timestamp: new Date().toISOString(),
                    signature: { alg: "HMAC-SHA256", key_id: "legacy", value: "cached" },
                    decision_type: 'GOVERNANCE',
                    verdict: existing.execution_status as any || 'ALLOW',
                    reason_code: 'OPS.RATE_LIMIT', // Cache hit proxy
                    reason_human: 'Idempotency Cache Hit',
                    risk_score: 0,
                    authority: { type: 'SYSTEM', id: 'idempotency-cache' },
                    policy_id: 'idempotency',
                    monitor_mode: false
                };

                return {
                    envelope,
                    status: 'processed_duplicate'
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
                // Create Injection Envelope
                const envelope: DecisionEnvelope = {
                    contract_version: "1.0.0",
                    decision_id: uuidv4(),
                    trace_id: traceId,
                    timestamp: new Date().toISOString(),
                    signature: { alg: "HMAC-SHA256", key_id: "abs-kernel-v0", value: "pending" },
                    decision_type: 'GOVERNANCE',
                    verdict: 'DENY',
                    reason_code: 'INPUT.INJECTION',
                    reason_human: `Prompt injection: ${sanitizeResult.flags.join(', ')}`,
                    risk_score: 100,
                    authority: { type: 'SYSTEM', id: 'sanitizer' },
                    jurisdiction: 'ABS_KERNEL_DEFAULT',
                    policy_id: 'injection-protection',
                    monitor_mode: this.mode === 'scanner'
                };

                await this.logDecision(envelope, breakdown);
                
                return {
                    envelope,
                    status: 'rejected'
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
                risk_level: (partialProposal.risk_level as any) || 'medium' // Safe cast for now
            };

            // 3.5 ADVANCED GOVERNANCE (Sequence & Memory)
            const agentId = validEvent.metadata?.actor || validEvent.source || 'unknown_agent';
            
            // SESSION MANAGEMENT (v3.1)
            let session = SessionManager.getActiveSession(agentId);
            if (!session) {
                // Determine if we should start a new session or if it's stateless
                session = SessionManager.startSession(agentId, {
                    trigger_event: validEvent.event_type
                });
            } else {
                SessionManager.touch(session.sessionId);
            }

            // A. Sequence Analysis
            const sequenceAnalysis = getSequenceAnalyzer().analyze(agentId, {
                eventType: validProposal.recommended_action,
                timestamp: Date.now(),
                riskScore: 0,
                payload: {
                   ...validEvent.payload as any,
                   params: validProposal.action_params
                }
            });

            if (sequenceAnalysis.matchedPatterns.length > 0) {
                logger.warn(`[Governance] Dangerous Sequence Detected: ${sequenceAnalysis.matchedPatterns.join(', ')}`, { agentId });
            }

            // B. Agent Risk Profile
            const agentProfile = AgentMemory.getAgentRiskProfile(agentId);
            const trustModifier = agentProfile.baseRiskModifier;

            // TRACK INTENT (v3.1)
            SemanticTracer.capture({
                sessionId: session.sessionId,
                agentId,
                intent: validProposal.explanation?.summary || 'auto',
                action: validProposal.recommended_action,
                outcome: 'success', // Provisional, updated if blocked
                driftScore: 0 // Placeholder for LLM evaluation
            });

            // 4. POLICY GATE (Governance)
            const policy = PolicyRegistry.getPolicy(validEvent.event_type);
            const evaluation = await policy.evaluate(validProposal, validEvent);
            
            // Normalize Decision (ADR-008 Adapter Layer)
            let decisionStr: string = 'UNKNOWN';
            let decisionScore = 0;
            let decisionReason = 'Policy Evaluation';
            let partialEnvelope: Partial<DecisionEnvelope> = {};

            // Helper: Check if result is an Envelope (has verdict)
            const isEnvelope = (res: any): res is Partial<DecisionEnvelope> => {
                return typeof res === 'object' && 'verdict' in res;
            };

            if (typeof evaluation === 'string') {
                // LEGACY: String return
                decisionStr = evaluation;
                if (decisionStr === 'DENY') decisionScore = 100;
                else if (decisionStr === 'ESCALATE') decisionScore = 50;
            } else if (isEnvelope(evaluation)) {
                // V1: Decision Envelope
                partialEnvelope = evaluation;
                decisionStr = evaluation.verdict || 'UNKNOWN';
                decisionScore = evaluation.risk_score || 0;
                decisionReason = evaluation.reason_human || 'Policy Evaluation';
            } else {
                // LEGACY: Object return (DecisionResult)
                const legacy = evaluation as any;
                decisionStr = legacy.decision || 'UNKNOWN';
                decisionScore = legacy.score || 0;
                decisionReason = legacy.reason || 'Policy Evaluation';
            }

            // C. Combine Risk Scores (Adaptive Scoring)
            const sequenceRisk = sequenceAnalysis?.sequenceRisk || 0;
            const trustRisk = trustModifier || 0;
            
            let adaptiveScore = decisionScore + sequenceRisk + trustRisk;
            adaptiveScore = Math.max(0, Math.min(100, adaptiveScore)); // Clamp 0-100

            if (adaptiveScore !== decisionScore) {
                logger.info(`[Governance] Adaptive Score Adjusted: ${decisionScore} -> ${adaptiveScore}`, {
                    reason: `Seq: +${sequenceRisk}, Trust: ${trustRisk}`
                });
                decisionScore = adaptiveScore;
            }

            // Global Risk Thresholds (Safety Net)
            // Low (< 30) = ALLOW
            // Medium (30-79) = ESCALATE
            // High (>= 80) = DENY
            if (decisionScore >= 80) {
                if (decisionStr !== 'DENY') {
                    logger.warn(`[Risk Protection] Score ${decisionScore} >= 80. Overriding to DENY.`);
                    decisionStr = 'DENY';
                    decisionReason += ` (Risk Score: ${decisionScore} - Critical)`;
                }
            } else if (decisionScore >= 30) {
                 if (decisionStr === 'ALLOW') {
                    logger.warn(`[Risk Protection] Score ${decisionScore} >= 30. Overriding to ESCALATE.`);
                    decisionStr = 'ESCALATE';
                    decisionReason += ` (Risk Score: ${decisionScore} - Medium Risk)`;
                }
            }
            
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

                // Create Envelope for ESCALATE (Provisional)
                const envelope: DecisionEnvelope = {
                    contract_version: "1.0.0",
                    decision_id: decisionId,
                    trace_id: traceId,
                    timestamp: new Date().toISOString(),
                    signature: { alg: "HMAC-SHA256", key_id: "abs-kernel-v0", value: "pending" },
                    decision_type: 'GOVERNANCE',
                    verdict: 'REQUIRE_APPROVAL',
                    reason_code: 'RISK.EXCEEDED',
                    reason_human: escalationReason + (this.interactive ? ' [Interactive: Suspended]' : ' [Pending Review]'),
                    risk_score: decisionScore,
                    authority: { type: 'POLICY', id: policy.name || 'default' },
                    jurisdiction: 'ABS_KERNEL_DEFAULT',
                    policy_id: policy.name || 'default',
                    monitor_mode: false,
                    required_actions: ['human_review']
                };

                // Log the decision
                await this.logDecision(envelope, { ...breakdown, latency });

                // Create pending review record
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
                    envelope,
                    status: this.interactive ? 'suspended' : 'pending_review'
                };
            }
            
            // 5. IMMUTABLE DECISION ENVELOPE (ADR-008)
            const decisionId = uuidv4();
            const latency = Date.now() - start;
            breakdown.overhead_ms = latency - (breakdown.validation_ms + breakdown.idempotency_ms + breakdown.sanitization_ms + breakdown.llm_ms + breakdown.policy_ms);

            // Construct Verdict & ReasonCode
            let verdict: Verdict;
            let reasonCode: ReasonCode;
            
            if (decisionStr === 'ALLOW') verdict = 'ALLOW';
            else if (decisionStr === 'DENY') verdict = 'DENY';
            else if (decisionStr === 'ESCALATE') verdict = 'REQUIRE_APPROVAL';
            else verdict = 'REQUIRE_APPROVAL'; // Default fallthrough safety
            
            // Map legacy reasons/scores to ReasonCode (Heuristic if not provided by Policy)
            if (partialEnvelope.reason_code) {
                reasonCode = partialEnvelope.reason_code;
            } else if (verdict === 'DENY' && decisionScore >= 80) {
                reasonCode = 'RISK.EXCEEDED';
            } else if (verdict === 'REQUIRE_APPROVAL') {
                reasonCode = 'POLICY.VIOLATION'; 
            } else {
                reasonCode = 'OPS.MAINTENANCE'; // Valid Allow code
            }

            // Create Envelope
            const envelope: DecisionEnvelope = {
                contract_version: "1.0.0",
                decision_id: decisionId,
                trace_id: traceId,
                timestamp: new Date().toISOString(),
                // valid_until: ... (calculated by policy, optional)
                
                signature: {
                    alg: "HMAC-SHA256",
                    key_id: "abs-kernel-v0", // TODO: Get from env
                    value: "pending" // Will be signed in logDecision
                },

                decision_type: 'GOVERNANCE',
                verdict: verdict,
                
                reason_code: reasonCode,
                reason_human: decisionReason + scannerNote,
                risk_score: decisionScore,

                authority: {
                    type: 'POLICY',
                    id: policy.name || 'default'
                },

                jurisdiction: 'ABS_KERNEL_DEFAULT',
                policy_id: policy.name || 'default',
                policy_version: 'v0.0.0', // TODO: Policy versioning
                monitor_mode: this.mode === 'scanner',

                constraints: [],
                required_actions: verdict === 'REQUIRE_APPROVAL' ? ['human_review'] : []
            };

            try {
                const dbStart = Date.now();
                await this.logDecision(envelope, { ...breakdown, db_ms: Date.now() - dbStart });

                Metrics.recordDecision(
                    verdict.toLowerCase() as any,
                    latency,
                    policy.name
                );

                logger.info(`Decision Logged: ${verdict}`, { 
                    executed_as: executionStatus, 
                    latency_ms: latency,
                    breakdown 
                });

                return {
                    envelope,
                    status: 'processed'
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
                        const envelope: DecisionEnvelope = logData.contract_version ? logData : {
                            contract_version: "1.0.0",
                            decision_id: existing.decision_id,
                            trace_id: traceId,
                            timestamp: new Date().toISOString(),
                            signature: { alg: "HMAC-SHA256", key_id: "legacy", value: "cached" },
                            decision_type: 'GOVERNANCE',
                            verdict: existing.execution_status as any,
                            reason_code: 'OPS.RATE_LIMIT',
                            reason_human: 'Race Condition Winner',
                            risk_score: 0,
                            authority: { type: 'SYSTEM', id: 'race-winner' },
                            policy_id: 'unknown',
                            monitor_mode: false
                        };

                        return {
                            envelope,
                            status: 'processed_duplicate'
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

    private async logDecision(envelope: DecisionEnvelope, breakdown: any): Promise<{ success: boolean }> {
        try {
            // 1. Fetch Previous Signature (for Chain)
            const [prevRow] = await this.db.all<{ signature: string }>(
                `SELECT signature FROM decision_logs ORDER BY timestamp DESC LIMIT 1`
            );
            const prevHash = prevRow?.signature || '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis

            // 2. Compute HMAC Chain (Sign the Envelope Content + PrevHash)
            const canonicalContent = JSON.stringify({
                // Fields that must be immutable
                id: envelope.decision_id,
                verdict: envelope.verdict,
                reason: envelope.reason_code,
                score: envelope.risk_score,
                auth: envelope.authority,
                ts: envelope.timestamp,
                prev: prevHash
            });
            
            const signature = signer.sign(canonicalContent);
            envelope.signature.value = signature; // Seal the envelope

            const fullLogJson = JSON.stringify(envelope);

            // 3. Persist
            const result = await this.db.run(`
                INSERT INTO decision_logs (decision_id, tenant_id, event_id, policy_name, provider, decision, risk_score, execution_status, execution_response, full_log_json, timestamp, signature)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                envelope.decision_id, // decision_id
                'default', // tenant_id (TODO: extract from trace_id or context)
                envelope.trace_id, // event_id mapping
                envelope.policy_id, // policy_name
                'abs-kernel', // provider
                envelope.verdict, // decision
                envelope.risk_score, // risk_score
                envelope.verdict, // execution_status
                envelope.reason_human, // execution_response
                fullLogJson, // full_log_json
                envelope.timestamp, // timestamp
                signature // signature
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
