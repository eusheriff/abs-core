import { v4 as uuidv4 } from 'uuid';

export interface IntentTrace {
    traceId: string;
    sessionId: string;
    agentId: string;
    timestamp: number;
    intent: string;      // inferred or declared intent
    goal?: string;       // higher-level goal
    action: string;      // specific operation
    outcome: 'success' | 'failure' | 'blocked' | 'modified';
    driftScore: number;  // 0-1, deviation from main goal
}

export class SemanticTracer {
    private static traces: IntentTrace[] = [];
    private static maxTraces = 5000;

    static capture(trace: Omit<IntentTrace, 'traceId' | 'timestamp' | 'driftScore'> & { driftScore?: number }) {
        const fullTrace: IntentTrace = {
            traceId: uuidv4(),
            timestamp: Date.now(),
            driftScore: trace.driftScore || 0,
            ...trace
        };
        
        this.traces.push(fullTrace);
        
        // Prune if needed
        if (this.traces.length > this.maxTraces) {
            this.traces.shift();
        }
        
        return fullTrace;
    }

    static getSessionTraces(sessionId: string): IntentTrace[] {
        return this.traces.filter(t => t.sessionId === sessionId);
    }

    // In a real system, this might use an LLM or vector DB to calculate drift
    static calculateDrift(currentAction: string, goal: string): number {
        // Placeholder heuristic
        return 0; 
    }
}
