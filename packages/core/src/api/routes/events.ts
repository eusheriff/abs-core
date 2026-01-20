import { Hono } from 'hono';
import { EventEnvelopeSchema } from '../../core/schemas';
import { getDB } from '../../infra/db';
import { EventProcessor } from '../../core/processor';
import { requireScope } from '../middleware/auth';
import { Integrity } from '../../core/integrity';

interface EventsEnv {
    EVENTS_QUEUE?: Queue<unknown>;
    LLM_PROVIDER?: string;
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    ABS_MODE?: 'scanner' | 'runtime';
}

const events = new Hono<{ Bindings: EventsEnv }>();

events.post('/', requireScope('events:write'), async (c) => {
  try {
    const rawBody = await c.req.json();
    
    // 1. Validate Input (Schema Enforcement)
    const validation = EventEnvelopeSchema.safeParse(rawBody);
    if (!validation.success) {
      return c.json({ error: 'Invalid Event Envelope', details: validation.error.format() }, 400);
    }
    
    const event = validation.data;
    const db = getDB();

    // 2. Persist Event (Source of Truth) - IMMUTABLE
    try {
        const [lastEvent] = await db.all<{ hash: string }>(`
            SELECT hash FROM events_store ORDER BY rowid DESC LIMIT 1
        `);
        const previousHash = lastEvent?.hash || null;
        const hash = Integrity.computeHash(JSON.stringify(event), previousHash);

        await db.run(
            `INSERT INTO events_store (
                id, tenant_id, type, payload, source, timestamp, status, hash, previous_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            event.event_id,
            event.tenant_id,
            event.event_type,
            JSON.stringify(event.payload),
            event.source,
            new Date().toISOString(),
            'pending',
            hash,
            previousHash
        );
    } catch (e: any) {
        // Idempotency Check: If event ID exists, treat as success (already accepted)
        if (e.message?.includes('CONSTRAINT') || e.code === 'SQLITE_CONSTRAINT' || e.message?.includes('UNIQUE')) {
            console.warn(`⚠️ Duplicate event received: ${event.event_id}. Treating as idempotent success.`);
            return c.json({
                status: 'accepted',
                message: 'Event already received (idempotent)',
                event_id: event.event_id,
                correlation_id: event.correlation_id,
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
            enqueuedAt: new Date().toISOString()
        });
        
        console.log(`📤 Event ${event.event_id} enqueued for processing`);
        
        return c.json({
            status: 'accepted',
            message: 'Event persisted and queued for async processing.',
            event_id: event.event_id,
            correlation_id: event.correlation_id,
            mode: 'queue'
        }, 202);
    }

    // Fallback: Sync processing if queue not available
    console.log(`⚠️ Queue not available, processing synchronously`);
    const llmProvider = c.env?.LLM_PROVIDER || 'mock';
    const llmApiKey = c.env?.OPENAI_API_KEY || c.env?.GEMINI_API_KEY;
    
    const processor = new EventProcessor(db, {
        llmProvider,
        llmApiKey,
        mode: (c.env?.ABS_MODE || 'runtime') as 'scanner' | 'runtime'
    });
    const result = await processor.process(event);

    return c.json(result, 200);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(err);
    return c.json({ error: 'Internal Server Error', message }, 500);
  }
});

export { events as eventsRouter };
