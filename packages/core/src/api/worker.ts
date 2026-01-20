import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eventsRouter } from './routes/events';
import { Dashboard } from '../ui/dashboard';
import { setDB, getRecentLogs } from '../infra/db';
import { D1Adapter } from '../infra/db-d1';
import { EventProcessor } from '../core/processor';

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

type Bindings = {
    DB: D1Database;
    LLM_PROVIDER: string;
    OPENAI_API_KEY: string;
    GEMINI_API_KEY: string;
    EVENTS_QUEUE: Queue<QueueMessage>;
}

const app = new Hono<{ Bindings: Bindings }>();

// Middlewares
app.use('*', cors());

// Root
app.get('/', (c) => c.text('ABS Core v2.0: Active (Queue-based Processing)'));

// Health
app.get('/health', (c) => c.json({ 
    status: 'ok', 
    runtime: 'worker', 
    version: 'v2.0-scale',
    features: ['queue-processing', 'prompt-sanitization', 'key-rotation']
}));

// Dashboard
app.get('/dashboard', async (c) => {
    const logs = await getRecentLogs(50);
    return c.html(Dashboard({ logs }).toString());
});

// Events API
app.route('/v1/events', eventsRouter);

import { adminRouter } from './routes/admin';
app.route('/admin', adminRouter);

export default {
    // HTTP Handler
    fetch: async (request: Request, env: Bindings, ctx: ExecutionContext) => {
        try {
            setDB(new D1Adapter(env.DB));
            
            const globalProcess = (globalThis as any).process || {};
            const currentEnv = globalProcess.env || {};
            (globalThis as any).process = { 
                env: { 
                    ...currentEnv,
                    ...env, 
                    EXECUTION_WEBHOOK_URL: 'mock-webhook'
                } 
            };

            return await app.fetch(request, env, ctx);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown Worker Error';
            return new Response(`Worker Error: ${errorMessage}\n${(err as Error).stack || ''}`, { status: 500 });
        }
    },

    // Queue Consumer Handler (v2.0)
    queue: async (batch: MessageBatch<QueueMessage>, env: Bindings) => {
        console.log(`📥 Processing batch of ${batch.messages.length} messages from queue`);
        
        setDB(new D1Adapter(env.DB));
        
        const processor = new EventProcessor(
            new D1Adapter(env.DB),
            {
                llmProvider: env.LLM_PROVIDER || 'mock',
                llmApiKey: env.OPENAI_API_KEY || env.GEMINI_API_KEY
            }
        );

        for (const message of batch.messages) {
            try {
                const { event, enqueuedAt } = message.body;
                const queueLatency = Date.now() - new Date(enqueuedAt).getTime();
                
                console.log(`⚙️ Processing event ${event.event_id} (queued ${queueLatency}ms ago)`);
                
                const result = await processor.process(event);
                
                // Update event status to processed
                const db = new D1Adapter(env.DB);
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
