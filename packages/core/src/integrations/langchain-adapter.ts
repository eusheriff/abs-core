/**
 * ABS Core - LangChain Integration Adapter
 * 
 * Provides a drop-in Tool for LangChain/LangGraph agents that validates
 * proposed actions against ABS Core policies before execution.
 * 
 * @example
 * ```typescript
 * import { ABSCheckTool } from '@abs/langchain';
 * 
 * const agent = new AgentExecutor({
 *   tools: [new ABSCheckTool({ apiKey: process.env.ABS_TOKEN })],
 * });
 * ```
 */

// Standalone implementation - does not require @langchain/core as a dependency
// Can be used directly or integrated with LangChain via the StructuredTool interface

export interface ABSToolSchema {
  name: string;
  description: string;
  call: (input: string) => Promise<string>;
}

export interface ABSCheckConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  agentId?: string;
}

export interface ABSCheckResult {
  allowed: boolean;
  reason?: string;
  riskScore: number;
  decisionId: string;
}

/**
 * ABSCheckTool - LangChain-compatible Tool for ABS Core governance validation
 * 
 * This tool should be used by agents to validate proposed actions
 * before executing them. It returns whether the action is allowed
 * and provides a risk score.
 */
export class ABSCheckTool implements ABSToolSchema {
  name = 'abs_check_action';
  description = `
    Validate a proposed action against ABS Core security policies.
    Use this tool BEFORE executing any potentially risky action like:
    - File system operations (create, delete, modify)
    - Database operations (INSERT, UPDATE, DELETE)
    - External API calls
    - Shell command execution
    
    Input: A JSON string describing the action, e.g.:
    {"eventType": "file:delete", "payload": {"path": "/etc/passwd"}}
    
    Output: Whether the action is allowed and a risk score (0-100).
  `;

  private config: Required<ABSCheckConfig>;

  constructor(config: ABSCheckConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ABS_TOKEN || '',
      baseUrl: config.baseUrl || process.env.ABS_API_URL || 'https://abs.oconnector.tech',
      timeout: config.timeout || 5000,
      agentId: config.agentId || 'langchain-agent',
    };
  }

  async call(input: string): Promise<string> {
    try {
      const parsedInput = JSON.parse(input);
      const result = await this.checkAction(parsedInput);
      
      if (!result.allowed) {
        return JSON.stringify({
          status: 'BLOCKED',
          reason: result.reason,
          riskScore: result.riskScore,
          message: `Action blocked by ABS Core. Reason: ${result.reason}. Risk Score: ${result.riskScore}/100`,
        });
      }

      return JSON.stringify({
        status: 'ALLOWED',
        riskScore: result.riskScore,
        decisionId: result.decisionId,
        message: `Action approved. Risk Score: ${result.riskScore}/100. Decision ID: ${result.decisionId}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({
        status: 'ERROR',
        message: `Failed to validate action: ${errorMessage}`,
      });
    }
  }

  private async checkAction(event: { eventType: string; payload: Record<string, unknown> }): Promise<ABSCheckResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Agent-ID': this.config.agentId,
        },
        body: JSON.stringify({
          eventType: event.eventType,
          payload: event.payload,
          source: 'langchain-adapter',
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ABS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as ABSCheckResult;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Fail-safe: If ABS is unreachable, block by default
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          allowed: false,
          reason: 'ABS Core timeout - action blocked for safety',
          riskScore: 100,
          decisionId: 'timeout-fail-safe',
        };
      }
      
      throw error;
    }
  }
}

/**
 * Factory function for creating ABSCheckTool with environment defaults
 */
export function createABSCheckTool(config?: ABSCheckConfig): ABSCheckTool {
  return new ABSCheckTool(config);
}

export default ABSCheckTool;
