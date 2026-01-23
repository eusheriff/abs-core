"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const hono_1 = require("hono");
const schemas_1 = require("../../core/schemas");
const db_1 = require("../../infra/db");
const processor_1 = require("../../core/processor");
const auth_1 = require("../middleware/auth");
const integrity_1 = require("../../core/integrity");
const events = new hono_1.Hono();
exports.eventsRouter = events;
events.post('/', (0, auth_1.requireScope)('events:write'), async (c) => {
    try {
        const rawBody = await c.req.json();
        // 1. Validate Input (Schema Enforcement)
        const validation = schemas_1.EventEnvelopeSchema.safeParse(rawBody);
        if (!validation.success) {
            return c.json({ error: 'Invalid Event Envelope', details: validation.error.format() }, 400);
        }
        const event = validation.data;
        // 0. Observability Context
        const traceId = c.req.header('x-trace-id') || event.correlation_id || crypto.randomUUID();
        c.header('x-trace-id', traceId);
        // Normalize event with trace info if missing
        if (!event.correlation_id)
            event.correlation_id = traceId;
        const db = (0, db_1.getDB)();
        // 2. Persist Event (Source of Truth) - IMMUTABLE
        try {
            const [lastEvent] = await db.all(`
            SELECT hash FROM events_store ORDER BY rowid DESC LIMIT 1
        `);
            const previousHash = lastEvent?.hash || null;
            // Canonical Representation for Audit (Must match Re-verification logic)
            // Format: id:tenant:type:source:timestamp:payload_json
            const timestamp = new Date().toISOString();
            const payloadStr = JSON.stringify(event.payload);
            const canonical = `${event.event_id}:${event.tenant_id}:${event.event_type}:${event.source}:${timestamp}:${payloadStr}`;
            const hash = integrity_1.Integrity.computeHash(canonical, previousHash);
            await db.run(`INSERT INTO events_store (
                id, tenant_id, type, payload, source, timestamp, status, hash, previous_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, event.event_id, event.tenant_id, event.event_type, payloadStr, event.source, timestamp, 'pending', hash, previousHash);
        }
        catch (e) {
            // Idempotency Check: If event ID exists, treat as success (already accepted)
            if (e.message?.includes('CONSTRAINT') || e.code === 'SQLITE_CONSTRAINT' || e.message?.includes('UNIQUE')) {
                console.warn(`⚠️ Duplicate event received: ${event.event_id}. Treating as idempotent success.`);
                return c.json({
                    status: 'accepted',
                    message: 'Event already received (idempotent)',
                    event_id: event.event_id,
                    correlation_id: event.correlation_id,
                    trace_id: traceId,
                    mode: 'deduplicated'
                }, 200);
            }
            throw e; // Rethrow real errors
        }
        // 3. Enqueue for async processing (v2.0 - Queue-based)
        const queue = c.env?.EVENTS_QUEUE;
        if (queue) {
            await queue.send({
                event,
                traceId, // Propagate context to worker
                enqueuedAt: new Date().toISOString()
            });
            console.log(`📤 Event ${event.event_id} enqueued for processing [Trace: ${traceId}]`);
            return c.json({
                status: 'accepted',
                message: 'Event persisted and queued for async processing.',
                event_id: event.event_id,
                correlation_id: event.correlation_id,
                trace_id: traceId,
                mode: 'queue'
            }, 202);
        }
        // Fallback: Sync processing if queue not available
        console.log(`⚠️ Queue not available, processing synchronously [Trace: ${traceId}]`);
        const llmProvider = c.env?.LLM_PROVIDER || 'mock';
        const llmApiKey = c.env?.OPENAI_API_KEY || c.env?.GEMINI_API_KEY;
        const processor = new processor_1.EventProcessor(db, {
            llmProvider,
            llmApiKey,
            mode: (c.env?.ABS_MODE || 'runtime'),
            interactive_mode: c.env?.ABS_INTERACTIVE === 'true' || process.env.ABS_INTERACTIVE === 'true'
        });
        const result = await processor.process(event);
        return c.json({ ...result, trace_id: traceId }, 200);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(err);
        return c.json({ error: 'Internal Server Error', message }, 500);
    }
});
