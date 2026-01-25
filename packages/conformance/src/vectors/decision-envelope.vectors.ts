/**
 * Decision Envelope v1 Conformance Vectors
 * 
 * Tests that Decision Envelope adheres to ADR-008 contract.
 * Reference: docs/_consolidated/decisions/ADR-008-public-decision-contract.md
 */

import { ConformanceVector } from '../types';

export const decisionEnvelopeVectors: ConformanceVector[] = [
  // ============================================
  // State Consistency Invariants
  // ============================================
  {
    id: 'ENV-001',
    name: 'GOVERNANCE with ALLOW verdict',
    description: 'Valid: GOVERNANCE decision_type with ALLOW verdict',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Invariant 1',
    tags: ['invariant', 'governance'],
    input: {
      event_type: 'tool.execute',
      payload: {
        tool: 'echo',
        command: 'hello world'
      }
    },
    expected: {
      verdict: 'ALLOW',
      reason_code: undefined // Any valid reason code
    }
  },
  {
    id: 'ENV-002',
    name: 'GOVERNANCE with DENY verdict',
    description: 'Valid: GOVERNANCE decision_type with DENY verdict',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Invariant 1',
    tags: ['invariant', 'governance'],
    input: {
      event_type: 'tool.execute',
      payload: {
        tool: 'shell',
        command: 'rm -rf /'
      }
    },
    expected: {
      verdict: 'DENY',
      reason_code: 'POLICY.VIOLATION'
    }
  },
  {
    id: 'ENV-003',
    name: 'GOVERNANCE must not have SYSTEM_FAILURE',
    description: 'Invalid: GOVERNANCE decision_type cannot have SYSTEM_FAILURE verdict',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Invariant 1',
    tags: ['invariant', 'negative-test'],
    input: {
      event_type: 'internal.test',
      payload: {
        force_system_failure: true,
        decision_type: 'GOVERNANCE'
      }
    },
    expected: {
      verdict: 'SYSTEM_FAILURE',
      // This should be rejected by schema validation
    }
  },

  // ============================================
  // Monitor Mode Safety
  // ============================================
  {
    id: 'ENV-010',
    name: 'Monitor Mode produces non-authorizing envelope',
    description: 'When monitor_mode=true, verdict is simulation only',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Invariant 3',
    tags: ['monitor-mode', 'safety'],
    input: {
      event_type: 'tool.execute',
      payload: {
        tool: 'shell',
        command: 'rm -rf /',
        context: { monitor_mode: true }
      }
    },
    expected: {
      verdict: 'DENY', // Still evaluates correctly
      // But monitor_mode=true in output means non-binding
    }
  },

  // ============================================
  // Required Fields
  // ============================================
  {
    id: 'ENV-020',
    name: 'Envelope contains all required fields',
    description: 'Output envelope must have: decision_id, trace_id, timestamp, verdict, reason_code',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Schema',
    tags: ['schema', 'required-fields'],
    input: {
      event_type: 'tool.execute',
      payload: {
        tool: 'ls',
        args: ['-la']
      }
    },
    expected: {
      verdict: 'ALLOW'
      // Validator should also check: decision_id, trace_id, timestamp exist
    }
  },
  {
    id: 'ENV-021',
    name: 'Signature present with valid algorithm',
    description: 'Envelope must have signature with alg and value',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Integrity',
    tags: ['schema', 'integrity'],
    input: {
      event_type: 'tool.execute',
      payload: {
        tool: 'echo',
        args: ['test']
      }
    },
    expected: {
      verdict: 'ALLOW'
      // Validator should check: signature.alg, signature.value exist
    }
  },

  // ============================================
  // Risk Score Semantics
  // ============================================
  {
    id: 'ENV-030',
    name: 'High risk score triggers REQUIRE_APPROVAL',
    description: 'Actions with risk_score > threshold require human approval',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Invariant 2',
    tags: ['risk', 'escalation'],
    input: {
      event_type: 'tool.execute',
      payload: {
        tool: 'git',
        command: 'push --force origin main'
      }
    },
    expected: {
      verdict: 'REQUIRE_APPROVAL',
      reason_code: 'RISK.EXCEEDED'
    }
  },
  {
    id: 'ENV-031',
    name: 'Critical risk score triggers DENY',
    description: 'Actions with risk_score >= critical threshold are denied',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Invariant 2',
    tags: ['risk', 'critical'],
    input: {
      event_type: 'db.execute',
      payload: {
        query: 'DROP DATABASE production',
        database: 'production'
      }
    },
    expected: {
      verdict: 'DENY',
      reason_code: 'RISK.EXCEEDED'
    }
  },

  // ============================================
  // Authority Chain
  // ============================================
  {
    id: 'ENV-040',
    name: 'Authority type is POLICY for automated decisions',
    description: 'Non-human decisions must have authority.type = POLICY',
    category: 'DECISION_ENVELOPE',
    reference: 'ADR-008 Authority',
    tags: ['authority', 'audit'],
    input: {
      event_type: 'tool.execute',
      payload: {
        tool: 'npm',
        command: 'install lodash'
      }
    },
    expected: {
      verdict: 'ALLOW'
      // Validator should check: authority.type = 'POLICY'
    }
  }
];
