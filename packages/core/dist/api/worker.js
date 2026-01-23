"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../infra/db");
const db_d1_1 = require("../infra/db-d1");
const processor_1 = require("../core/processor");
const factory_1 = require("./factory");
const logger_1 = require("../core/logger");
const signer_1 = require("../crypto/signer");
// Create Unified App
const app = (0, factory_1.createApp)();
exports.default = {
    // HTTP Handler
    fetch: async (request, env, ctx) => {
        try {
            // Initialize Signer with Secret
            signer_1.signer.init(env.ABS_SECRET_KEY);
            // Inject D1 Adapter
            (0, db_1.setDB)(new db_d1_1.D1Adapter(env.DB));
            // Allow app to access env bindings
            return await app.fetch(request, env, ctx);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown Worker Error';
            const safeErrorMessage = errorMessage.replace(/[\n\r]/g, ' '); // Prevent Log Injection
            const isProd = (env.ABS_MODE || 'runtime') === 'runtime' && !(env.ABS_MODE || '').includes('dev');
            const body = isProd ? `Worker Error: ${safeErrorMessage}` : `Worker Error: ${errorMessage}\n${err.stack || ''}`;
            return new Response(body, { status: 500 });
        }
    },
    // Queue Consumer Handler (v2.0)
    queue: async (batch, env) => {
        // Initialize Signer with Secret
        signer_1.signer.init(env.ABS_SECRET_KEY);
        (0, db_1.setDB)(new db_d1_1.D1Adapter(env.DB));
        const processor = new processor_1.EventProcessor(new db_d1_1.D1Adapter(env.DB), {
            llmProvider: env.LLM_PROVIDER || 'mock',
            llmApiKey: env.OPENAI_API_KEY || env.GEMINI_API_KEY,
            mode: env.ABS_MODE || 'runtime'
        });
        for (const message of batch.messages) {
            let logger = null;
            try {
                const { event, enqueuedAt, traceId } = message.body;
                // Reconstruct Context
                const context = {
                    traceId: traceId || event.correlation_id || message.id, // Fallback to message ID
                    spanId: message.id, // New span for worker processing
                    tenantId: event.tenant_id
                };
                logger = new logger_1.Logger(context);
                const queueLatency = Date.now() - new Date(enqueuedAt).getTime();
                logger.info(`Processing event from queue`, {
                    event_id: event.event_id,
                    queue_latency_ms: queueLatency
                });
                const result = await processor.process(event);
                // Update event status to processed
                const db = new db_d1_1.D1Adapter(env.DB);
                await db.run(`UPDATE events_store SET status = ? WHERE id = ?`, result.decision === 'ALLOW' ? 'processed' : 'reviewed', event.event_id);
                logger.info(`Event processed successfully`, { decision: result.decision });
                // Acknowledge the message
                message.ack();
            }
            catch (error) {
                // If logger wasn't initialized, create a fallback
                if (!logger) {
                    console.error('Critical failure before logger init', error);
                }
                else {
                    logger.error(`Failed to process event`, { error: String(error) });
                }
                // Retry will happen automatically (max_retries = 3)
                message.retry();
            }
        }
    }
};
