/**
 * ABS Core Governance SDK
 * 
 * Lightweight client for integrating with ABS Core governance.
 * Use this in your workers/services to check governance before executing actions.
 * 
 * @example
 * ```typescript
 * import { GovernanceClient } from '@abs/sdk';
 * 
 * const governance = new GovernanceClient({
 *   apiUrl: 'http://localhost:8787',
 *   apiKey: 'your-key'
 * });
 * 
 * const result = await governance.check({
 *   event_type: 'bot.send_message',
 *   payload: { action: 'send_message', content: { message: 'Hello' } }
 * });
 * 
 * if (result.allowed) {
 *   // Execute action
 * }
 * ```
 */

export interface GovernanceConfig {
    apiUrl: string;
    apiKey: string;
    tenantId?: string;
    source?: string;
    timeout?: number;
    failClosed?: boolean; // If true (default), deny on error
}

export interface EventPayload {
    event_type: string;
    payload: Record<string, unknown>;
    correlation_id?: string;
}

export interface GovernanceDecision {
    decision_id: string;
    event_id: string;
    decision: 'allow' | 'deny' | 'escalate' | 'handoff';
    reason: string;
    policy_id: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    processing_time_ms: number;
    allowed_modifications?: Record<string, unknown>;
}

export interface GovernanceResult {
    allowed: boolean;
    decision: GovernanceDecision;
    error?: string;
}

export class GovernanceClient {
    private config: Required<GovernanceConfig>;

    constructor(config: GovernanceConfig) {
        this.config = {
            tenantId: 'default',
            source: 'sdk',
            timeout: 5000,
            failClosed: true,
            ...config
        };
    }

    /**
     * Check governance for an action
     */
    async check(event: EventPayload): Promise<GovernanceResult> {
        const fullEvent = {
            event_id: crypto.randomUUID(),
            tenant_id: this.config.tenantId,
            correlation_id: event.correlation_id || crypto.randomUUID(),
            event_type: event.event_type,
            source: this.config.source,
            occurred_at: new Date().toISOString(),
            payload: event.payload
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            const response = await fetch(`${this.config.apiUrl}/v1/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(fullEvent),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            return {
                allowed: result.decision === 'allow',
                decision: result
            };

        } catch (error: any) {
            console.error('[ABS SDK] Governance check failed:', error.message);
            
            // Fail closed: deny if governance is unavailable
            if (this.config.failClosed) {
                return {
                    allowed: false,
                    decision: {
                        decision_id: 'error',
                        event_id: fullEvent.event_id,
                        decision: 'deny',
                        reason: `Governance unavailable: ${error.message}`,
                        policy_id: 'SYSTEM_ERROR',
                        risk_level: 'critical',
                        processing_time_ms: 0
                    },
                    error: error.message
                };
            }

            // Fail open (not recommended): allow if governance is unavailable
            return {
                allowed: true,
                decision: {
                    decision_id: 'fallback',
                    event_id: fullEvent.event_id,
                    decision: 'allow',
                    reason: 'Governance unavailable - fail open mode',
                    policy_id: 'SYSTEM_FALLBACK',
                    risk_level: 'high',
                    processing_time_ms: 0
                },
                error: error.message
            };
        }
    }

    /**
     * Shorthand for common bot actions
     */
    async checkBotAction(
        action: 'send_message' | 'create_ticket' | 'apply_discount' | 'handoff',
        payload: {
            conversation: { id: string; phone: string; channel: string };
            content: Record<string, unknown>;
            context: Record<string, unknown>;
        }
    ): Promise<GovernanceResult> {
        return this.check({
            event_type: `bot.${action}`,
            correlation_id: payload.conversation.id,
            payload: {
                action,
                conversation: {
                    customer_phone: payload.conversation.phone,
                    channel: payload.conversation.channel,
                    started_at: new Date().toISOString(),
                    message_count: 1,
                    last_intent: 'unknown'
                },
                content: payload.content,
                context: payload.context
            }
        });
    }
}

// Factory function
export function createGovernanceClient(config: GovernanceConfig): GovernanceClient {
    return new GovernanceClient(config);
}
