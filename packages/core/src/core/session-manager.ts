import { v4 as uuidv4 } from 'uuid';

export interface AgentSession {
    sessionId: string;
    agentId: string;
    startTime: number;
    lastActive: number;
    metadata: Record<string, any>;
    status: 'active' | 'closed' | 'timeout';
}

export class SessionManager {
    private static sessions: Map<string, AgentSession> = new Map();
    private static agentToSession: Map<string, string> = new Map();
    private static TIMEOUT_MS = 30 * 60 * 1000; // 30 min idle timeout

    static startSession(agentId: string, metadata: Record<string, any> = {}): AgentSession {
        // Close existing session if any
        const existingId = this.agentToSession.get(agentId);
        if (existingId) {
            this.closeSession(existingId);
        }

        const session: AgentSession = {
            sessionId: uuidv4(),
            agentId,
            startTime: Date.now(),
            lastActive: Date.now(),
            metadata,
            status: 'active'
        };

        this.sessions.set(session.sessionId, session);
        this.agentToSession.set(agentId, session.sessionId);
        
        return session;
    }

    static getSession(sessionId: string): AgentSession | undefined {
        return this.sessions.get(sessionId);
    }

    static getActiveSession(agentId: string): AgentSession | undefined {
        const sessionId = this.agentToSession.get(agentId);
        if (!sessionId) return undefined;

        const session = this.sessions.get(sessionId);
        if (!session) return undefined;

        // Check timeout
        if (Date.now() - session.lastActive > this.TIMEOUT_MS) {
            this.closeSession(sessionId);
            return undefined;
        }

        // Touch
        session.lastActive = Date.now();
        return session;
    }

    static touch(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session && session.status === 'active') {
            session.lastActive = Date.now();
        }
    }

    static closeSession(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'closed';
            this.agentToSession.delete(session.agentId);
        }
    }
}
