import { setDB } from '../infra/db';
import { D1Adapter } from '../infra/db-d1';
import { EventProcessor } from '../core/processor';
import { createApp, Bindings } from './factory';
import { Logger } from '../core/logger';
import { TraceContext } from '../core/context';
import { signer } from '../crypto/signer';

// Create Unified App
const app = createApp();

// Message type for queue
interface QueueMessage {
    event: {
        event_id: string;
        tenant_id: string;
        event_type: string;
        source: string;
        occurred_at: string;
        payload: unknown;
        correlation_id: string;
    };
    enqueuedAt: string;
    traceId?: string; // Propagated context
}

export default {
    // HTTP Handler
    fetch: async (request: Request, env: Bindings, ctx: ExecutionContext) => {
        try {
            // Initialize Signer with Secret
            signer.init(env.ABS_SECRET_KEY);

            // Inject D1 Adapter
            setDB(new D1Adapter(env.DB as D1Database));
            
            // Allow app to access env bindings
            return await app.fetch(request, env, ctx);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown Worker Error';
            const safeErrorMessage = errorMessage.replace(/[\n\r]/g, ' '); // Prevent Log Injection
            const isProd = (env.ABS_MODE || 'runtime') === 'runtime' && !(env.ABS_MODE || '').includes('dev');
            const body = isProd ? `Worker Error: ${safeErrorMessage}` : `Worker Error: ${errorMessage}\n${(err as Error).stack || ''}`;
            return new Response(body, { status: 500 });
        }
    },

    // Queue Consumer Handler (v2.0)
    queue: async (batch: MessageBatch<QueueMessage>, env: Bindings) => {
        
        // Initialize Signer with Secret
        signer.init(env.ABS_SECRET_KEY);

        setDB(new D1Adapter(env.DB as D1Database));
        
        const processor = new EventProcessor(
            new D1Adapter(env.DB as D1Database),
            {
                llmProvider: env.LLM_PROVIDER || 'mock',
                llmApiKey: env.OPENAI_API_KEY || env.GEMINI_API_KEY,
                mode: env.ABS_MODE || 'runtime'
            }
        );

        for (const message of batch.messages) {
            let logger: Logger | null = null;
            try {
                const { event, enqueuedAt, traceId } = message.body;
                
                // Reconstruct Context
                const context: TraceContext = {
                    traceId: traceId || event.correlation_id || message.id, // Fallback to message ID
                    spanId: message.id, // New span for worker processing
                    tenantId: event.tenant_id
                };
                logger = new Logger(context);

                const queueLatency = Date.now() - new Date(enqueuedAt).getTime();
                
                logger.info(`Processing event from queue`, { 
                    event_id: event.event_id, 
                    queue_latency_ms: queueLatency 
                });
                
                const result = await processor.process(event);

                // --- EXECUTION RECEIPT LOGIC (ADR-008) ---
                const receiptId = crypto.randomUUID();
                const executionId = crypto.randomUUID();
                const timestamp = new Date().toISOString();
                
                // 1. Validate Applicability Gates
                // For MVP, we pass all gates. In PROD, this calls external services.
                const gates: Record<string, { result: 'PASS' | 'FAIL' | 'SKIPPED', checked_at: string, source: string }> = {};
                const requiredChecks = result.envelope.applicability?.required_checks || [];
                
                let blocked = false;
                for (const gate of requiredChecks) {
                    // TODO: Connect to real Policy/Incident/Tenant Services
                    // Mock: If gate is TENANT_ACTIVE, check logic...
                    gates[gate] = {
                        result: 'PASS',
                        checked_at: new Date().toISOString(),
                        source: 'internal-mock-registry'
                    };
                }

                // 2. Determine Outcome
                // If verdict is DENY, we effectively 'EXECUTED' a denial.
                // If Monitor Mode, we 'EXECUTED' a simulation.
                // If gates failed, we 'BLOCKED'.
                const outcome = blocked ? 'BLOCKED' : 'EXECUTED';
                
                // 3. Emit Receipt
                const receipt = {
                    receipt_id: receiptId,
                    decision_id: result.envelope.decision_id,
                    execution_id: executionId,
                    timestamp: timestamp,
                    executor_id: 'abs-kernel-worker', // Should come from env
                    execution_context: {
                        tenant_id: event.tenant_id,
                        environment: env.ABS_MODE || 'runtime'
                    },
                    gates: gates,
                    outcome: outcome,
                    details: blocked ? 'Applicability Check Failed' : `Verdict: ${result.envelope.verdict}`
                };
                
                logger.info('Execution Receipt Emitted', { receipt });

                // Update event status to processed
                const db = new D1Adapter(env.DB as D1Database);
                await db.run(
                    `UPDATE events_store SET status = ? WHERE id = ?`,
                    result.envelope.verdict === 'ALLOW' && !blocked ? 'processed' : 'reviewed',
                    event.event_id
                );
                
                logger.info(`Event processed successfully`, { verdict: result.envelope.verdict, receipt_id: receiptId });
                
                // Acknowledge the message
                message.ack();
                
            } catch (error) {
                // If logger wasn't initialized, create a fallback
                if (!logger) {
                    console.error('Critical failure before logger init', error);
                } else {
                    logger.error(`Failed to process event`, { error: String(error) });
                }
                // Retry will happen automatically (max_retries = 3)
                message.retry();
            }
        }
    }
};
