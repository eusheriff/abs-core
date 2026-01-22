/**
 * @abs/sdk-typescript - Validator
 * 
 * Validation functions that return detailed results (don't throw).
 * Use for inspection, audit, and non-blocking validation.
 * For enforcement, use guards (they throw).
 */

import { z } from 'zod';
import {
  DecisionEnvelope,
  ExecutionReceipt,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ChainValidationResult,
} from './types';

// ============================================
// ZOD SCHEMAS
// ============================================

const SignatureSchema = z.object({
  alg: z.enum(['HMAC-SHA256', 'EdDSA']),
  key_id: z.string().min(1),
  value: z.string().min(1),
});

const AuthoritySchema = z.object({
  policy_name: z.string().min(1),
  policy_version: z.string().min(1),
  evaluated_at: z.string().datetime(),
});

const ApplicabilitySchema = z.object({
  required_checks: z.array(z.string()),
  jurisdiction: z.string().optional(),
  monitor_mode: z.boolean().optional(),
}).optional();

const DecisionContextSchema = z.object({
  tenant_id: z.string().min(1),
  agent_id: z.string().min(1),
  session_id: z.string().optional(),
  event_type: z.string().min(1),
  action_requested: z.string().min(1),
});

const DecisionEnvelopeSchema = z.object({
  contract_version: z.literal('1.0.0'),
  decision_id: z.string().uuid(),
  trace_id: z.string().min(1),
  timestamp: z.string().datetime(),
  valid_until: z.string().datetime().optional(),
  signature: SignatureSchema,
  decision_type: z.enum(['GOVERNANCE', 'OPERATIONAL']),
  verdict: z.enum(['ALLOW', 'DENY', 'REQUIRE_APPROVAL']),
  reason_code: z.enum([
    'POLICY.VIOLATION',
    'RISK.EXCEEDED',
    'BUDGET.EXHAUSTED',
    'RATE.LIMITED',
    'OPS.MAINTENANCE',
  ]),
  reason_human: z.string().min(1),
  risk_score: z.number().min(0).max(100),
  authority: AuthoritySchema,
  applicability: ApplicabilitySchema,
  context: DecisionContextSchema,
});

const GateResultSchema = z.object({
  result: z.enum(['PASS', 'FAIL', 'SKIPPED']),
  checked_at: z.string().datetime(),
  source: z.string().min(1),
  skip_reason: z.string().optional(),
  skip_policy_version: z.string().optional(),
});

const EvidenceSchema = z.object({
  input_hash: z.string().optional(),
  output_hash: z.string().optional(),
  external_refs: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
}).optional();

const ExecutionContextSchema = z.object({
  environment: z.string().min(1),
  tenant_id: z.string().min(1),
}).passthrough(); // Allow additional properties

const ExecutionReceiptSchema = z.object({
  receipt_id: z.string().uuid(),
  decision_id: z.string().uuid(),
  execution_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  executor_id: z.string().min(1),
  execution_context: ExecutionContextSchema,
  gates: z.record(GateResultSchema),
  outcome: z.enum(['EXECUTED', 'BLOCKED', 'SKIPPED']),
  details: z.string().optional(),
  evidence: EvidenceSchema,
  signature: SignatureSchema.optional(),
});

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate a DecisionEnvelope
 * 
 * Returns detailed validation results without throwing.
 */
export function validateEnvelope(envelope: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const result = DecisionEnvelopeSchema.safeParse(envelope);
  
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      });
    }
    return { valid: false, errors, warnings };
  }
  
  // Additional semantic validations
  const env = result.data;
  
  // Check if expired
  if (env.valid_until) {
    const now = new Date();
    const validUntil = new Date(env.valid_until);
    if (now > validUntil) {
      warnings.push({
        path: 'valid_until',
        message: `Envelope has expired (valid_until: ${env.valid_until})`,
      });
    }
  }
  
  // Check monitor mode
  if (env.applicability?.monitor_mode === true) {
    warnings.push({
      path: 'applicability.monitor_mode',
      message: 'Envelope is in monitor mode - execution should be advisory only',
    });
  }
  
  // Check risk score consistency
  if (env.verdict === 'ALLOW' && env.risk_score >= 80) {
    warnings.push({
      path: 'risk_score',
      message: `High risk score (${env.risk_score}) with ALLOW verdict - review policy`,
    });
  }
  
  return { valid: true, errors, warnings };
}

/**
 * Validate an ExecutionReceipt
 * 
 * Returns detailed validation results without throwing.
 */
export function validateReceipt(receipt: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const result = ExecutionReceiptSchema.safeParse(receipt);
  
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      });
    }
    return { valid: false, errors, warnings };
  }
  
  const rec = result.data;
  
  // Check for SKIPPED gates without authorization
  for (const [gateName, gateResult] of Object.entries(rec.gates)) {
    if (gateResult.result === 'SKIPPED' && !gateResult.skip_policy_version) {
      warnings.push({
        path: `gates.${gateName}`,
        message: 'Gate SKIPPED without policy authorization',
      });
    }
  }
  
  // Check for missing evidence on EXECUTED
  if (rec.outcome === 'EXECUTED' && !rec.evidence) {
    warnings.push({
      path: 'evidence',
      message: 'Execution completed without evidence - consider adding for audit trail',
    });
  }
  
  return { valid: true, errors, warnings };
}

/**
 * Validate the chain from envelope to receipts
 * 
 * Ensures:
 * 1. All receipts link to the envelope
 * 2. Required gates are checked
 * 3. Timestamps are in order
 */
export function validateChain(
  envelope: DecisionEnvelope,
  receipts: ExecutionReceipt[]
): ChainValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // First validate envelope
  const envelopeResult = validateEnvelope(envelope);
  if (!envelopeResult.valid) {
    return {
      valid: false,
      errors: envelopeResult.errors,
      warnings: envelopeResult.warnings,
      breakPoint: {
        envelope_id: envelope.decision_id,
        reason: 'Envelope validation failed',
      },
    };
  }
  
  // Validate each receipt
  for (const receipt of receipts) {
    const receiptResult = validateReceipt(receipt);
    if (!receiptResult.valid) {
      return {
        valid: false,
        errors: receiptResult.errors,
        warnings: receiptResult.warnings,
        breakPoint: {
          receipt_id: receipt.receipt_id,
          reason: 'Receipt validation failed',
        },
      };
    }
    
    // Check receipt links to envelope
    if (receipt.decision_id !== envelope.decision_id) {
      return {
        valid: false,
        errors: [{
          path: 'decision_id',
          message: `Receipt decision_id (${receipt.decision_id}) does not match envelope (${envelope.decision_id})`,
          code: 'chain_break',
        }],
        warnings: [],
        breakPoint: {
          envelope_id: envelope.decision_id,
          receipt_id: receipt.receipt_id,
          reason: 'Decision ID mismatch',
        },
      };
    }
    
    // Check timestamp ordering
    const envelopeTime = new Date(envelope.timestamp);
    const receiptTime = new Date(receipt.timestamp);
    if (receiptTime < envelopeTime) {
      warnings.push({
        path: 'timestamp',
        message: `Receipt timestamp (${receipt.timestamp}) is before envelope (${envelope.timestamp})`,
      });
    }
    
    // Check required gates
    const requiredChecks = envelope.applicability?.required_checks ?? [];
    const checkedGates = Object.keys(receipt.gates);
    const missingGates = requiredChecks.filter(gate => !checkedGates.includes(gate));
    
    if (missingGates.length > 0) {
      return {
        valid: false,
        errors: [{
          path: 'gates',
          message: `Required gates not checked: ${missingGates.join(', ')}`,
          code: 'missing_gates',
        }],
        warnings: [],
        breakPoint: {
          receipt_id: receipt.receipt_id,
          reason: 'Missing required gates',
        },
      };
    }
    
    warnings.push(...receiptResult.warnings);
  }
  
  warnings.push(...envelopeResult.warnings);
  
  return { valid: true, errors, warnings };
}
