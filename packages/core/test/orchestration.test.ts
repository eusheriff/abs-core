
import { describe, test, expect, beforeAll } from 'vitest';
import { EventProcessor } from '../src/core/processor';
import { LocalDBAdapter } from '../src/infra/db-local';
import { SimpleOrchestrationAdapter } from '../src/orchestration/adapter-simple';
import { EventEnvelope } from '../src/core/schemas';
import { v4 as uuidv4 } from 'uuid';

describe('Orchestration Integration', () => {
    let db: LocalDBAdapter;
    let adapter: SimpleOrchestrationAdapter;
    let processor: EventProcessor;

    beforeAll(async () => {
        db = new LocalDBAdapter(':memory:');
        await db.init();
        await db.exec(`
          CREATE TABLE IF NOT EXISTS decision_logs (
            decision_id TEXT PRIMARY KEY,
            tenant_id TEXT,
            event_id TEXT,
            policy_name TEXT,
            provider TEXT,
            decision TEXT,
            execution_response TEXT,
            execution_status TEXT,
            full_log_json TEXT,
            timestamp TEXT
          );
        `);

        adapter = new SimpleOrchestrationAdapter();
        await adapter.connect();

        processor = new EventProcessor(db, {
            llmProvider: 'mock',
            orchestrator: adapter
        });
        
        // Start worker to listen for events
        await processor.startWorker();
    });

    test('Should submit event asynchronously and process it', async () => {
        const eventId = uuidv4();
        const event: EventEnvelope = {
            event_id: eventId,
            event_type: 'orchestration.test',
            source: 'test',
            tenant_id: 't1',
            correlation_id: uuidv4(),
            occurred_at: new Date().toISOString(),
            payload: { message: 'hello async' }
        };

        const taskId = await processor.submitAsync(event);
        expect(taskId).toBe(eventId); // Task ID should match Event ID for idempotency

        // Wait for async processing (SimpleAdapter uses small timeout)
        await new Promise(resolve => setTimeout(resolve, 50));

        // Verify processing happened by checking DB
        const logs = await db.all<any>('SELECT * FROM decision_logs WHERE event_id = ?', eventId);
        expect(logs.length).toBe(1);
        expect(JSON.parse(logs[0].full_log_json).input_event.payload.message).toBe('hello async');
    });

    test('Should throw if orchestrator is not configured', async () => {
        const simpleProcessor = new EventProcessor(db);
        const event: EventEnvelope = {
            event_id: uuidv4(),
            event_type: 'fail.test',
            source: 'test',
            tenant_id: 't1',
            correlation_id: uuidv4(),
            occurred_at: new Date().toISOString(),
            payload: {}
        };

        await expect(simpleProcessor.submitAsync(event))
            .rejects.toThrow('Orchestration not configured');
    });
});
