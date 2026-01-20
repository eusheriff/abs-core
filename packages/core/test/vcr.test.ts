import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { EventProcessor } from '../src/core/processor';
import { DatabaseAdapter } from '../src/infra/db-adapter';

// Mock DB
const mockDB = {
    run: vi.fn().mockResolvedValue({ success: true }),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    exec: vi.fn()
} as unknown as DatabaseAdapter;

const CASSETTES_DIR = path.join(__dirname, 'cassettes');

describe('Deterministic Replay (VCR)', () => {
    
    // Clean up cassettes before test
    beforeAll(() => {
        // Ensure directory exists but empty for test isolation?
        // Actually VCRProvider logic creates dir if missing.
        // We might want to clear it to ensure "Record" actually generates file.
        if (fs.existsSync(CASSETTES_DIR)) {
            fs.rmSync(CASSETTES_DIR, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        delete process.env.ABS_VCR_MODE;
    });

    it('should RECORD a new interaction', async () => {
        process.env.ABS_VCR_MODE = 'record';
        
        const processor = new EventProcessor(mockDB, { 
            llmProvider: 'mock',
            mode: 'runtime' 
        });

        // Use valid UUIDs to pass schema validation
        const eventId = '11111111-1111-1111-1111-111111111111';
        const event = {
            event_id: eventId,
            tenant_id: 'tenant-1',
            event_type: 'vcr.test.record',
            correlation_id: eventId, // Required by schema
            occurred_at: new Date().toISOString(), // Required by schema
            payload: { data: 'test-record' },
            source: 'test'
        };

        const result = await processor.process(event);
        
        // Should be processed now handling is correct
        expect(result.status).toBe('processed');
        
        // Check if cassette file exists
        const files = fs.readdirSync(CASSETTES_DIR);
        expect(files.length).toBe(1);
        expect(files[0].endsWith('.json')).toBe(true);
        
        const content = JSON.parse(fs.readFileSync(path.join(CASSETTES_DIR, files[0]), 'utf-8'));
        expect(content.recommended_action).toBeDefined();
    });

    it('should REPLAY from existing interaction', async () => {
        process.env.ABS_VCR_MODE = 'replay';
        
        const processor = new EventProcessor(mockDB, { 
            llmProvider: 'mock',
            mode: 'runtime' 
        });

        // Must match exact payload/type for hasing
        const eventId = '22222222-2222-2222-2222-222222222222';
        const event = {
            event_id: eventId,
            tenant_id: 'tenant-1',
            event_type: 'vcr.test.record', // SAME event type as record
            correlation_id: eventId,
            occurred_at: new Date().toISOString(),
            payload: { data: 'test-record' }, // SAME payload as record
            source: 'test'
        };

        const start = Date.now();
        const result = await processor.process(event);
        const duration = Date.now() - start;
        
        expect(result.status).toBe('processed');
        expect(duration).toBeLessThan(15); // Allow small buffer
    });

    it('should FAIL if cassette missing in replay mode', async () => {
        process.env.ABS_VCR_MODE = 'replay';
        
        const processor = new EventProcessor(mockDB, { 
            llmProvider: 'mock',
            mode: 'runtime' 
        });

        const eventId = '33333333-3333-3333-3333-333333333333';
        const event = {
            event_id: eventId,
            tenant_id: 'tenant-1',
            event_type: 'vcr.test.missing',
            correlation_id: eventId,
            occurred_at: new Date().toISOString(),
            payload: { data: 'unique' },
            source: 'test'
        };

        await expect(processor.process(event)).rejects.toThrow(/Cassette not found/);
    });
});
