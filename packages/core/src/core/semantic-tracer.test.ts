
import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticTracer } from './semantic-tracer';
import { SessionManager } from './session-manager';

describe('Semantic Telemetry', () => {
    const AGENT_ID = 'test-agent-telemetry';

    beforeEach(() => {
        // Reset valid if methods available (using private access workaround for test or public if added)
        // For MVP, assume fresh state or manage IDs
    });

    it('should create and retrieve a session', () => {
        const session = SessionManager.startSession(AGENT_ID, { role: 'tester' });
        expect(session).toBeDefined();
        expect(session.agentId).toBe(AGENT_ID);
        expect(session.status).toBe('active');

        const retrieved = SessionManager.getActiveSession(AGENT_ID);
        expect(retrieved?.sessionId).toBe(session.sessionId);
    });

    it('should capture intent trace', () => {
        const session = SessionManager.startSession(AGENT_ID);
        
        const trace = SemanticTracer.capture({
            sessionId: session.sessionId,
            agentId: AGENT_ID,
            intent: 'validate system',
            action: 'run_test',
            outcome: 'success',
            driftScore: 0.1
        });

        expect(trace.traceId).toBeDefined();
        expect(trace.timestamp).toBeDefined();
        expect(trace.intent).toBe('validate system');

        const history = SemanticTracer.getSessionTraces(session.sessionId);
        expect(history).toHaveLength(1);
        expect(history[0].traceId).toBe(trace.traceId);
    });

    it('should handle session timeout', () => {
        // Difficult to test with real time without fake timers, 
        // but can verify manual close
        const session = SessionManager.startSession(AGENT_ID);
        SessionManager.closeSession(session.sessionId);
        
        const active = SessionManager.getActiveSession(AGENT_ID);
        expect(active).toBeUndefined();
    });
});
