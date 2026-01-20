import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventProcessor } from '../src/core/processor';
import { DatabaseAdapter } from '../src/infra/db-adapter';
import { LLMProvider, ProviderType } from '../src/core/provider-factory';

// Mock DB
const mockDB = {
    run: vi.fn().mockResolvedValue({ isSuccess: true }),
    all: vi.fn(),
    exec: vi.fn(),
    get: vi.fn()
} as unknown as DatabaseAdapter;

// Mock Provider Factory
vi.mock('../src/core/provider-factory', async () => {
    const actual = await vi.importActual('../src/core/provider-factory');
    return {
        ...actual,
        getProvider: (type: string) => ({
            name: type,
            propose: vi.fn().mockResolvedValue({
                recommended_action: 'block',
                explanation: { summary: 'Should be blocked' },
                confidence: 0.9,
                risk_level: 'high'
            })
        })
    };
});

// Mock Policy Registry to force DENY
vi.mock('../src/core/policy-registry', () => ({
    PolicyRegistry: {
        getPolicy: () => ({
            name: 'mock-policy',
            evaluate: () => 'DENY' // Always deny
        })
    }
}));


describe('Scanner Mode Logic', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Default: No existing decision
        (mockDB.all as any).mockResolvedValue([]);
    });

    it('should suppress DENY and return MONITOR in scanner mode', async () => {
        const processor = new EventProcessor(mockDB, {
            llmProvider: 'mock',
            mode: 'scanner'
        });

        const event = {
            event_id: '123e4567-e89b-12d3-a456-426614174000',
            tenant_id: 'tenant_1',
            event_type: 'test_event',
            source: 'test',
            occurred_at: new Date().toISOString(),
            payload: { user_input: 'bad input' },
            correlation_id: '123e4567-e89b-12d3-a456-426614174001'
        };

        const result = await processor.process(event);

        // 1. Client receives MONITOR (or ALLOW with override status)
        expect(result.decision).toBe('MONITOR');

        // 2. DB Log contains DENY (the real intent)
        expect(mockDB.run).toHaveBeenCalledTimes(1);
        const insertCall = (mockDB.run as any).mock.calls[0];
        const insertSQL = insertCall[0];
        const params = insertCall.slice(1);
        
        // Find 'DENY' in params (param index 5 based on schema)
        // decision_id, tenant_id, event_id, policy_name, provider, decision...
        expect(params[5]).toBe('DENY');
        
        // Find metadata with override flag
        const metadata = JSON.parse(params[7]);
        expect(metadata.scanner_override).toBe(true);
    });

    it('should enforce DENY in runtime mode', async () => {
        const processor = new EventProcessor(mockDB, {
            llmProvider: 'mock',
            mode: 'runtime'
        });

        const event = {
            event_id: '123e4567-e89b-12d3-a456-426614174002',
            tenant_id: 'tenant_1',
            event_type: 'test_event',
            source: 'test',
            occurred_at: new Date().toISOString(),
            payload: { user_input: 'bad input' },
            correlation_id: '123e4567-e89b-12d3-a456-426614174003'
        };

        const result = await processor.process(event);

        expect(result.decision).toBe('DENY');
        
        const insertCall = (mockDB.run as any).mock.calls[0];
        const params = insertCall.slice(1);
        expect(params[5]).toBe('DENY');
        
        const metadata = JSON.parse(params[7]);
        expect(metadata.scanner_override).toBe(false);
    });

});
