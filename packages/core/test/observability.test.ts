import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventProcessor } from '../src/core/processor';
import { DatabaseAdapter } from '../src/infra/db-adapter';

// Mock DB Adapter
const mockDB: DatabaseAdapter = {
    init: vi.fn(),
    close: vi.fn(),
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn(),
};

describe('Forensic Observability (Vector 6)', () => {
    
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should persist granular latency breakdown and trace_id in decision metadata', async () => {
        const processor = new EventProcessor(mockDB, { 
            llmProvider: 'mock',
            mode: 'runtime' 
        });

        const traceId = '77777777-7777-7777-7777-777777777777';
        const event = {
            event_id: '88888888-8888-8888-8888-888888888888',
            tenant_id: 'tenant-1',
            event_type: 'test.observability',
            correlation_id: traceId,
            occurred_at: new Date().toISOString(),
            payload: { data: 'test data' },
            source: 'test'
        };

        // Mocks
        // 1. Idempotency Check (Empty = Not processed)
        vi.spyOn(mockDB, 'all').mockResolvedValueOnce([]); 
        
        // 2. Log Decision (Capture arguments)
        const logDecisionSpy = vi.spyOn(mockDB, 'run').mockResolvedValue({ isSuccess: true });

        const result = await processor.process(event);

        expect(result.status).toBe('processed');
        expect(result.trace_id).toBe(traceId);

        // Verify Log Arguments
        const insertCall = logDecisionSpy.mock.calls[0];
        // [query, decId, tenantId, eventId, policy, provider, decision, reason, metadataJSON, timestamp]
        // Metadata is approximately argument index 7 or 8.
        // Let's find the one that looks like JSON
        
        const metadataArg = insertCall.find(arg => typeof arg === 'string' && arg.startsWith('{'));
        const metadata = JSON.parse(metadataArg as string);

        // Assertions Forensic
        expect(metadata.trace_id).toBe(traceId);
        expect(metadata.latency_breakdown).toBeDefined();
        
        const breakdown = metadata.latency_breakdown;
        expect(breakdown.validation_ms).toBeGreaterThanOrEqual(0);
        expect(breakdown.llm_ms).toBeGreaterThanOrEqual(0);
        expect(breakdown.overhead_ms).toBeGreaterThanOrEqual(0);
        // db_ms is captured at the very end
        expect(breakdown.db_ms).toBeGreaterThanOrEqual(0);
    });

    it('should include sanitization latency in breakdown if flagged', async () => {
        const processor = new EventProcessor(mockDB, { 
            llmProvider: 'mock',
            mode: 'runtime' 
        });

        const event = {
            event_id: '99999999-9999-9999-9999-999999999999',
            tenant_id: 'tenant-1',
            event_type: 'test.observability',
            correlation_id: 'trace-sanitizer',
            occurred_at: new Date().toISOString(),
            payload: { data: 'safe text' },
            source: 'test'
        };
        
        vi.spyOn(mockDB, 'all').mockResolvedValueOnce([]); 
        const logDecisionSpy = vi.spyOn(mockDB, 'run').mockResolvedValue({ isSuccess: true });

        await processor.process(event);
        
        const metadataArg = logDecisionSpy.mock.calls[0].find(arg => typeof arg === 'string' && arg.startsWith('{'));
        const metadata = JSON.parse(metadataArg as string);

        expect(metadata.latency_breakdown.sanitization_ms).toBeDefined();
    });
});
