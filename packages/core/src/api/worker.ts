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
            return new Response(`Worker Error: ${errorMessage}\n${(err as Error).stack || ''}`, { status: 500 });
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
                
                // Update event status to processed
                const db = new D1Adapter(env.DB as D1Database);
                await db.run(
                    `UPDATE events_store SET status = ? WHERE id = ?`,
                    result.decision === 'ALLOW' ? 'processed' : 'reviewed',
                    event.event_id
                );
                
                logger.info(`Event processed successfully`, { decision: result.decision });
                
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
