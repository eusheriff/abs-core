/**
 * CHI-Enhanced Policy
 * 
 * Integrates the Cognitive Host Interface (ADR-004) with the Policy Decision Point.
 * 
 * This policy:
 * 1. Uses CHI introspection to analyze intent before decision
 * 2. Applies cognition profile constraints
 * 3. Enriches DecisionResult with CHI analysis
 * 
 * FLOW:
 *   Intent → CHI Analysis → Cognition Profile → Decision Envelope → PEP
 */

import { Policy, DecisionResult } from '../core/interfaces';
import {
  analyzeIntent,
  CognitionProfile,
  CHIAnalysis,
  DEFAULT_COGNITION_PROFILE,
} from '../chi';
import {
  ABSProfile,
  ABSWorkspace,
  ResolvedConfig,
  resolveConfig,
  DEFAULT_PROFILE,
  DEFAULT_WORKSPACE,
} from '../layers';

// ============================================
// CHI POLICY
// ============================================

/**
 * Extended decision result with CHI analysis
 */
export interface CHIDecisionResult extends Omit<DecisionResult, keyof string> {
  decision: 'ALLOW' | 'ALLOW_WITH_CONSTRAINTS' | 'REQUIRE_APPROVAL' | 'DENY' | 'SAFE_MODE';
  reason?: string;
  score?: number;
  domain: string;
  tags: string[];
  
  /** CHI Analysis that informed the decision */
  chi_analysis: CHIAnalysis;
  
  /** Constraints to apply (if ALLOW_WITH_CONSTRAINTS) */
  constraints?: string[];
  
  /** Required actions before proceeding (if REQUIRE_APPROVAL) */
  required_actions?: string[];
}

/**
 * CHI-Enhanced Policy
 * 
 * Uses cognitive introspection to make governance decisions.
 */
export class CHIPolicy implements Policy {
  readonly name = 'chi_policy';
  readonly description = 'Cognitive Host Interface policy using ADR-004 introspection';
  
  private config: ResolvedConfig;
  private cognitionProfile: CognitionProfile;
  
  constructor(
    profile: ABSProfile = DEFAULT_PROFILE,
    workspace: ABSWorkspace = DEFAULT_WORKSPACE,
  ) {
    this.config = resolveConfig(profile, workspace);
    this.cognitionProfile = this.config.cognition;
  }
  
  /**
   * Evaluate a proposal using CHI introspection
   */
  evaluate(proposal: any, event: any): CHIDecisionResult {
    // Extract intent from proposal/event
    const intentText = this.extractIntentText(proposal, event);
    const traceId = event?.trace_id || crypto.randomUUID();
    
    // Run CHI introspection
    const analysis = analyzeIntent(intentText, this.cognitionProfile, traceId);
    
    // Convert CHI analysis to decision
    return this.analysisToDecision(analysis);
  }
  
  /**
   * Convert CHI analysis to decision result
   */
  private analysisToDecision(analysis: CHIAnalysis): CHIDecisionResult {
    // Start with base decision
    let decision: CHIDecisionResult['decision'] = 'ALLOW';
    let score = 0;
    const constraints: string[] = [];
    const required_actions: string[] = [];
    const reasons: string[] = [];
    
    // Apply constraints based on CHI suggestions
    for (const constraint of analysis.suggested_constraints) {
      switch (constraint) {
        case 'deny':
          decision = 'DENY';
          score = 100;
          reasons.push('CHI detected forbidden action');
          break;
          
        case 'require_approval':
          if (decision !== 'DENY') {
            decision = 'REQUIRE_APPROVAL';
            score = Math.max(score, 50);
            required_actions.push('human_approval');
            reasons.push('Action requires human approval');
          }
          break;
          
        case 'require_wal_event':
          if (decision === 'ALLOW') {
            decision = 'ALLOW_WITH_CONSTRAINTS';
          }
          score = Math.max(score, 30);
          constraints.push('wal_event_required');
          reasons.push('Must record in audit log');
          break;
          
        case 'rate_limit':
          if (decision === 'ALLOW') {
            decision = 'ALLOW_WITH_CONSTRAINTS';
          }
          constraints.push('rate_limit_applied');
          break;
          
        default:
          if (constraint.startsWith('max_scope:')) {
            constraints.push(constraint);
          }
      }
    }
    
    // Risk-based score adjustment
    for (const risk of analysis.inferred_risks) {
      switch (risk) {
        case 'credential_exposure':
          decision = 'DENY';
          score = 100;
          reasons.push('Potential credential exposure detected');
          break;
          
        case 'audit_log_modification':
          decision = 'DENY';
          score = 100;
          reasons.push('Direct audit log modification forbidden');
          break;
          
        case 'irreversible_state_mutation':
          score = Math.max(score, 40);
          if (decision === 'ALLOW') {
            decision = 'ALLOW_WITH_CONSTRAINTS';
            constraints.push('wal_event_required');
          }
          reasons.push('Irreversible state change');
          break;
          
        case 'network_exfiltration':
          score = Math.max(score, 60);
          if (decision === 'ALLOW' || decision === 'ALLOW_WITH_CONSTRAINTS') {
            decision = 'REQUIRE_APPROVAL';
            required_actions.push('network_approval');
          }
          reasons.push('Potential data exfiltration');
          break;
          
        default:
          score = Math.max(score, 20);
      }
    }
    
    // Confidence affects score
    if (analysis.confidence === 'low') {
      score = Math.max(score, 25);
      reasons.push('Low analysis confidence');
    }
    
    return {
      decision,
      reason: reasons.join('; ') || 'CHI analysis complete',
      score: Math.min(100, score),
      domain: 'chi',
      tags: ['chi', 'introspection', ...analysis.detected_intents],
      chi_analysis: analysis,
      constraints: constraints.length > 0 ? constraints : undefined,
      required_actions: required_actions.length > 0 ? required_actions : undefined,
    };
  }
  
  /**
   * Extract intent text from proposal/event
   */
  private extractIntentText(proposal: any, event: any): string {
    const parts: string[] = [];
    
    // From proposal
    if (proposal?.recommended_action) {
      parts.push(proposal.recommended_action);
    }
    if (proposal?.action_params) {
      parts.push(JSON.stringify(proposal.action_params));
    }
    if (proposal?.explanation?.summary) {
      parts.push(proposal.explanation.summary);
    }
    
    // From event
    if (event?.tool_name) {
      parts.push(event.tool_name);
    }
    if (event?.tool_input) {
      parts.push(JSON.stringify(event.tool_input));
    }
    if (event?.file_path) {
      parts.push(event.file_path);
    }
    if (event?.content) {
      parts.push(String(event.content).slice(0, 500)); // Limit size
    }
    
    return parts.join(' ');
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a CHI policy with workspace configuration
 */
export function createCHIPolicy(
  workspacePath?: string,
  profile?: ABSProfile,
): CHIPolicy {
  // Load workspace config if path provided
  let workspace = DEFAULT_WORKSPACE;
  if (workspacePath) {
    try {
      // Import lazily to avoid circular deps
      const { loadWorkspace } = require('../layers');
      workspace = loadWorkspace(workspacePath);
    } catch (e) {
      console.warn('[CHI] Could not load workspace config:', e);
    }
  }
  
  return new CHIPolicy(profile || DEFAULT_PROFILE, workspace);
}

/**
 * Create a CHI policy with custom cognition profile
 */
export function createCHIPolicyWithProfile(
  cognitionProfile: Partial<CognitionProfile>,
): CHIPolicy {
  const workspace: ABSWorkspace = {
    ...DEFAULT_WORKSPACE,
    cognition: cognitionProfile,
  };
  
  return new CHIPolicy(DEFAULT_PROFILE, workspace);
}
