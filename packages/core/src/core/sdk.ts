import { BotOperationalPolicy, DecisionEnvelope, PolicyDecisionResult } from './policy-bot-operational';

/**
 * ABS Core SDK for Bot Integration
 * 
 * Easy-to-use interface for integrating governance into bot applications.
 * Based on ADR-003 and Policy Pack v0.
 */

// Singleton instance
let policyInstance: BotOperationalPolicy | null = null;

/**
 * Initialize the ABS Core SDK
 */
export function initABS(): BotOperationalPolicy {
  if (!policyInstance) {
    policyInstance = new BotOperationalPolicy();
  }
  return policyInstance;
}

/**
 * Evaluate a bot action before execution
 * 
 * @param envelope - The decision envelope describing the action
 * @returns PolicyDecisionResult with outcome, policy_id, and reason
 * 
 * @example
 * const result = await evaluateAction({
 *   id: crypto.randomUUID(),
 *   timestamp: new Date().toISOString(),
 *   environment: 'runtime',
 *   actor: { type: 'bot', name: 'NetCarBot', channel: 'whatsapp' },
 *   intent: 'escalar_humano',
 *   proposal: { action: 'handoff_to_human', parameters: {} },
 *   context: { confidence: 0.85, signals: ['financiamento', 'entrada'] },
 *   risk_level: 'medium'
 * });
 * 
 * if (result.outcome === 'allow') {
 *   // Execute the action
 * } else if (result.outcome === 'handoff') {
 *   // Transfer to human
 * } else {
 *   // Action denied, log and skip
 * }
 */
export function evaluateAction(envelope: DecisionEnvelope): PolicyDecisionResult {
  const policy = initABS();
  return policy.evaluateEnvelope(envelope);
}

/**
 * Helper to create a DecisionEnvelope from common bot context
 */
export function createEnvelope(params: {
  botName: string;
  channel: 'whatsapp' | 'telegram' | 'api';
  intent: string;
  action: string;
  actionParams?: Record<string, any>;
  leadId?: string;
  conversationId?: string;
  confidence?: number;
  signals?: string[];
  messageContent?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}): DecisionEnvelope {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    environment: 'runtime',
    actor: {
      type: 'bot',
      name: params.botName,
      channel: params.channel
    },
    intent: params.intent,
    proposal: {
      action: params.action,
      parameters: params.actionParams || {}
    },
    context: {
      lead_id: params.leadId,
      conversation_id: params.conversationId,
      confidence: params.confidence,
      signals: params.signals,
      message_content: params.messageContent
    },
    risk_level: params.riskLevel || 'low'
  };
}

/**
 * Structured logging for decisions
 */
export interface DecisionLogEntry {
  timestamp: string;
  envelope: DecisionEnvelope;
  result: PolicyDecisionResult;
}

const decisionLog: DecisionLogEntry[] = [];

/**
 * Evaluate and log the decision
 */
export function evaluateAndLog(envelope: DecisionEnvelope): PolicyDecisionResult {
  const result = evaluateAction(envelope);
  
  const entry: DecisionLogEntry = {
    timestamp: new Date().toISOString(),
    envelope,
    result
  };
  
  decisionLog.push(entry);
  
  // Console log for debugging
  console.log(`[ABS] ${result.outcome.toUpperCase()} | ${result.policy_id} | ${result.reason}`);
  
  return result;
}

/**
 * Get the decision log
 */
export function getDecisionLog(): DecisionLogEntry[] {
  return [...decisionLog];
}

/**
 * Clear the decision log
 */
export function clearDecisionLog(): void {
  decisionLog.length = 0;
}

// Re-export types for convenience
export { DecisionEnvelope, PolicyDecisionResult } from './policy-bot-operational';
