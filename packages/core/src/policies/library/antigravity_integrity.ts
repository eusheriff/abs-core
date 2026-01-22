/**
 * Antigravity Integrity Policy
 * 
 * Enforces Invariant I1: No mutation without WAL event
 * 
 * This policy intercepts file system writes to _consolidated/* 
 * and ensures they have a valid WAL entry or capability token.
 */

import { Policy, PolicyInput, PolicyResult } from '../../core/interfaces';

/**
 * Paths protected by this policy (require WAL attestation)
 */
const PROTECTED_PATHS = [
  '_consolidated/',
  'docs/_consolidated/',
  '.gemini/antigravity/',
];

/**
 * Actions that require WAL attestation
 */
const PROTECTED_ACTIONS = [
  'fs.write',
  'fs.delete',
  'fs.rename',
  'file.create',
  'file.modify',
];

export const antigravityIntegrityPolicy: Policy = {
  name: 'antigravity_integrity',
  description: 'Enforces WAL attestation for mutations to governed state (Invariant I1)',
  version: '1.0.0',

  async evaluate(input: PolicyInput): Promise<PolicyResult> {
    // Check if action requires protection
    if (!PROTECTED_ACTIONS.includes(input.action)) {
      return { decision: 'ALLOW', riskScore: 0 };
    }

    // Check if path is protected
    const resourcePath = input.resource || input.context?.path || '';
    const isProtectedPath = PROTECTED_PATHS.some(p => resourcePath.includes(p));
    
    if (!isProtectedPath) {
      return { decision: 'ALLOW', riskScore: 0 };
    }

    // Check for WAL attestation
    const walEntryId = input.metadata?.walEntryId;
    const capabilityToken = input.metadata?.capabilityToken;
    
    if (!walEntryId && !capabilityToken) {
      return {
        decision: 'DENY',
        reason: 'Invariant I1 Violation: Mutation to governed state requires WAL entry or capability token',
        riskScore: 95,
        remediation: 'Use abs_wal_append tool before modifying files in _consolidated/ or request a capability token.',
      };
    }

    // Attestation present - allow but log
    return {
      decision: 'ALLOW',
      riskScore: 10,
      reason: `WAL attested: ${walEntryId || 'token-based'}`,
    };
  },
};

export default antigravityIntegrityPolicy;
