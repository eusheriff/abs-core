/**
 * CHI Introspection Engine
 * 
 * Implements ADR-004: Cognitive Host Interface
 * 
 * This module ANALYZES workflows and intents, it NEVER EXECUTES them.
 * 
 * INVARIANTS:
 * - CHI-I1: NEVER executes code
 * - CHI-I2: NEVER calls LLM APIs
 * - CHI-I3: NEVER invokes tools
 * - CHI-I4: ONLY produces analysis and constraints
 */

import {
  CognitionProfile,
  LLMPolicy,
  CHIAnalysis,
  InferredRisk,
  SuggestedConstraint,
  ConfidenceLevel,
  DEFAULT_COGNITION_PROFILE,
  createEmptyCHIAnalysis,
} from './types';

// ============================================
// INTENT PATTERNS
// ============================================

/**
 * Known intent patterns for detection
 */
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  'fs.write': [
    /write.*file/i,
    /create.*file/i,
    /save.*to/i,
    /writeFileSync/i,
    /fs\.write/i,
  ],
  'fs.delete': [
    /delete.*file/i,
    /remove.*file/i,
    /unlink/i,
    /rmSync/i,
    /fs\.rm/i,
  ],
  'fs.read': [
    /read.*file/i,
    /load.*from/i,
    /readFileSync/i,
    /fs\.read/i,
  ],
  'net.call': [
    /fetch\(/i,
    /axios/i,
    /http\.request/i,
    /net\.call/i,
    /api.*call/i,
  ],
  'tool.execute': [
    /execute.*tool/i,
    /run.*command/i,
    /spawn/i,
    /exec/i,
  ],
};

/**
 * Sensitive path patterns
 */
const SENSITIVE_PATHS: Record<string, InferredRisk> = {
  '_consolidated/': 'irreversible_state_mutation',
  'WORKLOG.wal': 'audit_log_modification',
  '.env': 'credential_exposure',
  '*.pem': 'credential_exposure',
  '*.key': 'credential_exposure',
  'secrets/': 'credential_exposure',
};

// ============================================
// INTROSPECTION ENGINE
// ============================================

/**
 * Analyze a workflow or intent
 * 
 * This is the core of CHI. It:
 * 1. Detects intents from text
 * 2. Infers risks based on patterns
 * 3. Suggests constraints
 * 4. Produces auditable output
 * 
 * It NEVER executes anything.
 */
export function analyzeIntent(
  input: string,
  profile: CognitionProfile = DEFAULT_COGNITION_PROFILE,
  traceId: string = crypto.randomUUID(),
): CHIAnalysis {
  const analysis = createEmptyCHIAnalysis(traceId);
  
  // Step 1: Detect intents
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        if (!analysis.detected_intents.includes(intent)) {
          analysis.detected_intents.push(intent);
          analysis.reasoning.push(`Detected intent '${intent}' from pattern: ${pattern}`);
        }
      }
    }
  }
  
  // Step 2: Detect sensitive paths
  for (const [pathPattern, risk] of Object.entries(SENSITIVE_PATHS)) {
    if (input.includes(pathPattern) || input.includes(pathPattern.replace('*', ''))) {
      if (!analysis.inferred_risks.includes(risk)) {
        analysis.inferred_risks.push(risk);
        analysis.reasoning.push(`Inferred risk '${risk}' from path pattern: ${pathPattern}`);
      }
    }
  }
  
  // Step 3: Cross-reference with cognition profile
  for (const intent of analysis.detected_intents) {
    // Check if intent matches forbidden patterns
    for (const forbidden of profile.forbid) {
      if (matchesGlob(intent, forbidden)) {
        analysis.suggested_constraints.push('deny');
        analysis.reasoning.push(`Intent '${intent}' matches forbidden pattern '${forbidden}'`);
      }
    }
    
    // Check if intent requires approval
    for (const approval of profile.requires_approval_on) {
      if (matchesGlob(intent, approval)) {
        if (!analysis.suggested_constraints.includes('require_approval')) {
          analysis.suggested_constraints.push('require_approval');
          analysis.reasoning.push(`Intent '${intent}' requires approval per cognition profile`);
        }
      }
    }
  }
  
  // Step 4: Risk-based constraints
  if (analysis.inferred_risks.includes('irreversible_state_mutation')) {
    if (!analysis.suggested_constraints.includes('require_wal_event')) {
      analysis.suggested_constraints.push('require_wal_event');
      analysis.reasoning.push('State mutation requires WAL event for audit');
    }
  }
  
  if (analysis.inferred_risks.includes('audit_log_modification')) {
    analysis.suggested_constraints.push('deny');
    analysis.reasoning.push('Direct audit log modification is forbidden');
  }
  
  // Step 5: Determine confidence
  analysis.confidence = determineConfidence(analysis);
  
  // Step 6: Request risk forecast if high-risk
  if (
    analysis.inferred_risks.length > 0 &&
    profile.risk_threshold === 'low'
  ) {
    analysis.request_risk_forecast = true;
    analysis.risk_forecast_context = {
      action: analysis.detected_intents[0] || 'unknown',
      target: extractTarget(input),
      scope: profile.memory_scope,
    };
    analysis.reasoning.push('Requesting risk forecast due to detected risks and low threshold');
  }
  
  return analysis;
}

/**
 * Analyze a workflow file (markdown)
 */
export function analyzeWorkflow(
  workflowContent: string,
  profile: CognitionProfile = DEFAULT_COGNITION_PROFILE,
  traceId: string = crypto.randomUUID(),
): CHIAnalysis {
  // Parse workflow steps
  const steps = parseWorkflowSteps(workflowContent);
  
  // Create aggregate analysis
  const analysis = createEmptyCHIAnalysis(traceId);
  
  for (const step of steps) {
    const stepAnalysis = analyzeIntent(step, profile, traceId);
    
    // Merge detected intents
    for (const intent of stepAnalysis.detected_intents) {
      if (!analysis.detected_intents.includes(intent)) {
        analysis.detected_intents.push(intent);
      }
    }
    
    // Merge inferred risks
    for (const risk of stepAnalysis.inferred_risks) {
      if (!analysis.inferred_risks.includes(risk)) {
        analysis.inferred_risks.push(risk);
      }
    }
    
    // Merge suggested constraints (most restrictive wins)
    for (const constraint of stepAnalysis.suggested_constraints) {
      if (!analysis.suggested_constraints.includes(constraint)) {
        analysis.suggested_constraints.push(constraint);
      }
    }
    
    // Merge reasoning
    analysis.reasoning.push(...stepAnalysis.reasoning);
  }
  
  // Determine overall confidence
  analysis.confidence = determineConfidence(analysis);
  
  // Request risk forecast if needed
  if (analysis.inferred_risks.length > 0 && profile.risk_threshold !== 'high') {
    analysis.request_risk_forecast = true;
  }
  
  return analysis;
}

/**
 * Validate LLM policy compliance
 */
export function validateLLMPolicy(
  model: string,
  capabilities: string[],
  policy: LLMPolicy,
): { allowed: boolean; violations: string[] } {
  const violations: string[] = [];
  
  // Check model allowlist
  if (policy.allowed_models.length > 0) {
    if (!policy.allowed_models.includes(model)) {
      violations.push(`Model '${model}' is not in allowed list`);
    }
  }
  
  // Check forbidden capabilities
  for (const capability of capabilities) {
    if (policy.forbid_capabilities.includes(capability)) {
      violations.push(`Capability '${capability}' is forbidden`);
    }
  }
  
  return {
    allowed: violations.length === 0,
    violations,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Simple glob matching (supports * and **)
 */
function matchesGlob(input: string, pattern: string): boolean {
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^:]*')
    .replace(/\./g, '\\.');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(input);
}

/**
 * Determine confidence level based on analysis completeness
 */
function determineConfidence(analysis: CHIAnalysis): ConfidenceLevel {
  const intentCount = analysis.detected_intents.length;
  const riskCount = analysis.inferred_risks.length;
  const reasoningCount = analysis.reasoning.length;
  
  if (intentCount > 0 && reasoningCount >= intentCount) {
    return 'high';
  } else if (intentCount > 0 || riskCount > 0) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Extract target from input text
 */
function extractTarget(input: string): string {
  // Look for file paths
  const pathMatch = input.match(/[\/\w\-\.]+\.[a-z]{2,4}/i);
  if (pathMatch) {
    return pathMatch[0];
  }
  
  // Look for URLs
  const urlMatch = input.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    return urlMatch[0];
  }
  
  return 'unknown';
}

/**
 * Parse workflow steps from markdown
 */
function parseWorkflowSteps(markdown: string): string[] {
  const steps: string[] = [];
  
  // Match numbered lists
  const numberedMatch = markdown.match(/^\d+\.\s+.+$/gm);
  if (numberedMatch) {
    steps.push(...numberedMatch);
  }
  
  // Match bulleted lists
  const bulletMatch = markdown.match(/^[-*]\s+.+$/gm);
  if (bulletMatch) {
    steps.push(...bulletMatch);
  }
  
  // Match code blocks
  const codeMatch = markdown.match(/```[\s\S]*?```/g);
  if (codeMatch) {
    steps.push(...codeMatch);
  }
  
  return steps;
}
