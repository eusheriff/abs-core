import { describe, it, expect, vi } from 'vitest';
import { EventProcessor } from '../src/core/processor';
import { DatabaseAdapter } from '../src/infra/db-adapter';

// Mock DB
const mockDB = {
    run: vi.fn().mockImplementation(async (...args) => {
        return { isSuccess: true };
    }),
    all: vi.fn(),
    get: vi.fn(),
    exec: vi.fn()
} as unknown as DatabaseAdapter;

import { afterEach } from 'vitest';

describe('Idempotency & Race Conditions', () => {

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should existing decision if found in initial check', async () => {
        const processor = new EventProcessor(mockDB, { 
            llmProvider: 'mock',
            mode: 'runtime' 
        });

        const eventId = '11111111-1111-1111-1111-111111111111';
        const event = {
            event_id: eventId,
            tenant_id: 'tenant-1',
            event_type: 'test.found',
            correlation_id: eventId,
            occurred_at: new Date().toISOString(),
            payload: { data: 'test' },
            source: 'test'
        };

        // Mock DB: Found existing decision immediately
        vi.spyOn(mockDB, 'all').mockResolvedValueOnce([{
            decision_id: 'existing-decision-id',
            execution_status: 'ALLOW',
            full_log_json: JSON.stringify({ decision: 'ALLOW', reason: 'Existing' })
        }]);

        const result = await processor.process(event);

        expect(result.status).toBe('processed_duplicate');
        expect(result.decision_id).toBe('existing-decision-id');
    });

    it('should handle UNIQUE constraint violation (Race Condition) by returning existing decision', async () => {
        // Setup Processor
        const processor = new EventProcessor(mockDB, { 
            llmProvider: 'mock',
            mode: 'runtime' 
        });

        const eventId = '22222222-2222-2222-2222-222222222222';
        const event = {
            event_id: eventId,
            tenant_id: 'tenant-1',
            event_type: 'test.race',
            correlation_id: eventId,
            occurred_at: new Date().toISOString(),
            payload: { data: 'test' },
            source: 'test'
        };

        // Mock DB Sequence:
        // 1. First SELECT (Hard Check) returns empty (not found yet)
        // 2. INSERT throws UNIQUE constraint error (simulating race)
        // 3. Second SELECT (Recovery) returns the winner's data

        vi.spyOn(mockDB, 'all')
            .mockResolvedValueOnce([]) // 1. Not found initially
            .mockResolvedValueOnce([{   // 3. Found after race
                decision_id: 'winner-decision-id',
                execution_status: 'ALLOW',
                full_log_json: JSON.stringify({ decision: 'ALLOW', reason: 'Winner' })
            }]);

        vi.spyOn(mockDB, 'run').mockImplementationOnce(async () => {
             throw new Error('UNIQUE constraint failed: decision_logs.event_id');
        });

        const result = await processor.process(event);

        expect(result.status).toBe('processed_duplicate');
        expect(result.decision_id).toBe('winner-decision-id');
        expect(result.provider).toBe('race_condition_winner');
    });
    
    it('should throw on real DB errors', async () => {
         const processor = new EventProcessor(mockDB, { 
            llmProvider: 'mock',
            mode: 'runtime' 
        });

        const eventId = '11111111-1111-1111-1111-111111111111';
        const event = {
            event_id: eventId,
            tenant_id: 'tenant-1',
            event_type: 'test.race',
            correlation_id: eventId,
            occurred_at: new Date().toISOString(),
            payload: { data: 'test' },
            source: 'test'
        };

        vi.spyOn(mockDB, 'all').mockResolvedValueOnce([]); 
        vi.spyOn(mockDB, 'run').mockRejectedValueOnce(new Error('Connection lost'));

        await expect(processor.process(event)).rejects.toThrow('Decision log failed - Error: Connection lost');
    });
});
