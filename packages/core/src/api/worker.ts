import { setDB } from '../infra/db';
import { D1Adapter } from '../infra/db-d1';
import { EventProcessor } from '../core/processor';
import { createApp, Bindings } from './factory';

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
}

export default {
    // HTTP Handler
    fetch: async (request: Request, env: Bindings, ctx: ExecutionContext) => {
        try {
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
        console.log(`📥 Processing batch of ${batch.messages.length} messages from queue`);
        
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
            try {
                const { event, enqueuedAt } = message.body;
                const queueLatency = Date.now() - new Date(enqueuedAt).getTime();
                
                console.log(`⚙️ Processing event ${event.event_id} (queued ${queueLatency}ms ago)`);
                
                const result = await processor.process(event);
                
                // Update event status to processed
                const db = new D1Adapter(env.DB as D1Database);
                await db.run(
                    `UPDATE events_store SET status = ? WHERE id = ?`,
                    result.decision === 'ALLOW' ? 'processed' : 'reviewed',
                    event.event_id
                );
                
                console.log(`✅ Event ${event.event_id} processed: ${result.decision}`);
                
                // Acknowledge the message
                message.ack();
                
            } catch (error) {
                console.error(`❌ Failed to process event:`, error);
                // Retry will happen automatically (max_retries = 3)
                message.retry();
            }
        }
    }
};
