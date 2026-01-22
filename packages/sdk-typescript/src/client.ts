/**
 * @abs/sdk-typescript - ABSClient
 * 
 * Main entry point for ABS SDK.
 * Provides type-safe methods for processing events and executing decisions.
 */

import {
  DecisionEnvelope,
  ExecutionReceipt,
  EventInput,
  ProcessResult,
  ExecutionResult,
  ValidationResult,
  ChainValidationResult,
} from './types';
import { DecisionEnvelopeBuilder } from './envelope';
import { ExecutionReceiptBuilder } from './receipt';
import { validateEnvelope, validateReceipt, validateChain } from './validator';
import { guardExecutable, guardGatesPassed, guardReceiptLinksToEnvelope } from './guards';
import { timeProvider, TimeProvider } from './time';
import { ABSError, ABSInvariantError } from './errors';

/**
 * Configuration for ABSClient
 */
export interface ABSClientConfig {
  /** ABS Core API endpoint (optional - for remote processing) */
  endpoint?: string;
  
  /** API key for authentication */
  apiKey?: string;
  
  /** Tenant ID */
  tenantId: string;
  
  /** Agent ID */
  agentId: string;
  
  /** Default executor ID */
  executorId?: string;
  
  /** Environment (production, staging, dev) */
  environment?: string;
  
  /** Custom time provider (for testing) */
  timeProvider?: TimeProvider;
}

/**
 * ABSClient - Main SDK entry point
 * 
 * Usage:
 * ```typescript
 * const client = new ABSClient({
 *   tenantId: 'my-tenant',
 *   agentId: 'my-agent',
 * });
 * 
 * // Process an event through ABS
 * const result = await client.process({
 *   event_id: 'evt-1',
 *   tenant_id: 'my-tenant',
 *   event_type: 'bot.message',
 *   source: 'whatsapp',
 *   occurred_at: new Date().toISOString(),
 *   payload: { message: 'Hello' },
 * });
 * 
 * // Execute with receipt
 * const execResult = await client.execute(result.envelope, async () => {
 *   // Your execution logic
 *   return { success: true };
 * });
 * ```
 */
export class ABSClient {
  private config: ABSClientConfig;
  private time: TimeProvider;
  
  constructor(config: ABSClientConfig) {
    this.config = config;
    this.time = config.timeProvider ?? timeProvider;
  }
  
  /**
   * Process an event through ABS governance
   * 
   * For remote processing (with endpoint), calls ABS Core API.
   * For local processing, creates a placeholder envelope (useful for testing).
   */
  async process(event: EventInput): Promise<ProcessResult> {
    if (this.config.endpoint) {
      return this.processRemote(event);
    }
    return this.processLocal(event);
  }
  
  /**
   * Execute a decision with receipt generation
   * 
   * @throws ABSExpiredError if decision has expired
   * @throws ABSMonitorModeError if decision is in monitor mode
   * @throws ABSVerdictError if verdict is not ALLOW
   */
  async execute<T>(
    envelope: DecisionEnvelope,
    executor: () => Promise<T>,
    options?: {
      executorId?: string;
      gateSource?: string;
    }
  ): Promise<ExecutionResult<T>> {
    const executorId = options?.executorId ?? this.config.executorId ?? 'sdk-executor';
    const gateSource = options?.gateSource ?? 'abs-sdk';
    
    // Build receipt
    const receiptBuilder = new ExecutionReceiptBuilder(envelope)
      .setExecutorId(executorId)
      .setExecutionContext({
        environment: this.config.environment ?? 'unknown',
        tenant_id: this.config.tenantId,
      });
    
    try {
      // Guard checks (throws on failure)
      guardExecutable(envelope, this.time.now());
      
      // Auto-pass required gates
      receiptBuilder.autoPassRequiredGates(gateSource);
      
      // Execute
      const result = await executor();
      
      // Build success receipt
      const receipt = receiptBuilder
        .setOutcome('EXECUTED')
        .setDetails('Execution completed successfully')
        .setEvidence({
          metadata: { 
            executed_at: this.time.nowISO(),
            sdk_version: '0.1.0',
          },
        })
        .build();
      
      return {
        status: 'executed',
        receipt,
        result,
      };
      
    } catch (error) {
      // Determine if this is a guard failure or execution failure
      if (error instanceof ABSError) {
        const receipt = receiptBuilder
          .setOutcome('BLOCKED')
          .setDetails(error.message)
          .build();
        
        return {
          status: 'blocked',
          receipt,
          error: error,
        };
      }
      
      // Unexpected error during execution
      const receipt = receiptBuilder
        .setOutcome('BLOCKED')
        .setDetails(`Execution failed: ${error instanceof Error ? error.message : String(error)}`)
        .build();
      
      return {
        status: 'blocked',
        receipt,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
  
  /**
   * Validate an envelope
   */
  validate(envelope: DecisionEnvelope): ValidationResult {
    return validateEnvelope(envelope);
  }
  
  /**
   * Validate a receipt
   */
  validateReceipt(receipt: ExecutionReceipt): ValidationResult {
    return validateReceipt(receipt);
  }
  
  /**
   * Validate the chain from envelope to receipts
   */
  validateChain(envelope: DecisionEnvelope, receipts: ExecutionReceipt[]): ChainValidationResult {
    return validateChain(envelope, receipts);
  }
  
  /**
   * Create an envelope builder pre-configured with client context
   */
  createEnvelopeBuilder(): DecisionEnvelopeBuilder {
    return new DecisionEnvelopeBuilder()
      .setContext({
        tenant_id: this.config.tenantId,
        agent_id: this.config.agentId,
        event_type: 'unknown',
        action_requested: 'unknown',
      });
  }
  
  /**
   * Create a receipt builder linked to an envelope
   */
  createReceiptBuilder(envelope: DecisionEnvelope): ExecutionReceiptBuilder {
    return new ExecutionReceiptBuilder(envelope)
      .setExecutorId(this.config.executorId ?? 'sdk-executor')
      .setExecutionContext({
        environment: this.config.environment ?? 'unknown',
        tenant_id: this.config.tenantId,
      });
  }
  
  // ============================================
  // PRIVATE METHODS
  // ============================================
  
  private async processRemote(event: EventInput): Promise<ProcessResult> {
    if (!this.config.endpoint) {
      throw new ABSInvariantError('Endpoint not configured', 'MISSING_ENDPOINT');
    }
    
    const response = await fetch(`${this.config.endpoint}/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new ABSError(`ABS API error: ${error}`, 'API_ERROR');
    }
    
    return response.json() as Promise<ProcessResult>;
  }
  
  private async processLocal(event: EventInput): Promise<ProcessResult> {
    // Local processing - create a mock ALLOW envelope for testing
    const envelope = new DecisionEnvelopeBuilder()
      .setDecisionId(crypto.randomUUID())
      .setTraceId(event.correlation_id ?? crypto.randomUUID())
      .setVerdict('ALLOW')
      .setReasonCode('POLICY.VIOLATION')
      .setReasonHuman('Local SDK processing - no policy evaluation')
      .setRiskScore(0)
      .setAuthority({
        policy_name: 'sdk-local',
        policy_version: '0.1.0',
        evaluated_at: this.time.nowISO(),
      })
      .setContext({
        tenant_id: event.tenant_id,
        agent_id: this.config.agentId,
        event_type: event.event_type,
        action_requested: 'process',
      })
      .setMonitorMode(true) // Local processing is always monitor mode
      .build();
    
    return {
      status: 'processed',
      envelope,
    };
  }
}
