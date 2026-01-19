import { Hono } from 'hono';
import { EventEnvelopeSchema } from '../../core/schemas';
import { getDB } from '../../infra/db';
import { EventProcessor } from '../../core/processor';
import { requireScope } from '../middleware/auth';
import { Integrity } from '../../core/integrity';

const events = new Hono();

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

    // 3. Persist Event (Source of Truth) - IMMUTABLE
    
    // 3a. Get Previous Hash (Chain Link)
    const [lastEvent] = await db.all<{ hash: string }>(`
        SELECT hash FROM events_store ORDER BY rowid DESC LIMIT 1
    `);
    const previousHash = lastEvent?.hash || null;

    // 3b. Compute New Hash (Payload + PrevHash)
    const hash = Integrity.computeHash(JSON.stringify(event), previousHash);

    // 3c. Insert with Integrity Data
    await db.run(
        `INSERT INTO events_store (
            event_id, tenant_id, event_type, payload, ingested_at, correlation_id, 
            previous_hash, hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        event.event_id,
        event.tenant_id,
        event.event_type,
        JSON.stringify(event.payload),
        new Date().toISOString(),
        event.correlation_id,
        previousHash,
        hash
    );

    // 4. Process (Sync or Async)
    // ---------------------------------------------------------
    // 2. Processing (Sync vs Async)
    // ---------------------------------------------------------
    const processor = new EventProcessor(db);
    const isAsync = c.req.query('async') === 'true';

    if (isAsync) {
        // Fire and Forget (but log errors)
        processor.process(event).catch(err => {
            console.error(`⚠️ Async processing failed for ${event.event_id}:`, err);
        });

        return c.json({
            status: 'accepted',
            message: 'Event persisted and queued for processing.',
            event_id: event.event_id,
            correlation_id: event.correlation_id,
            mode: 'async'
        }, 202);
    }

    // Default: Synchronous Processing
    const result = await processor.process(event);

    return c.json(result, 200);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(err);
    return c.json({ error: 'Internal Server Error', message }, 500);
  }
});

export { events as eventsRouter };
