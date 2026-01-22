/**
 * CHI Module - Cognitive Host Interface
 * 
 * Implements ADR-004: Cognitive Host Interface
 * 
 * This module provides:
 * - CognitionProfile: Declarative constraints for agent behavior
 * - LLMPolicy: Governance of model usage (not routing)
 * - CHIAnalysis: Auditable introspection output
 * - Introspection Engine: Analyzes workflows and intents
 */

// Types
export {
  // Cognition Profile
  CognitionProfile,
  LoopType,
  AutonomyLevel,
  MemoryScope,
  RiskThreshold,
  DEFAULT_COGNITION_PROFILE,
  
  // LLM Policy
  LLMPolicy,
  DEFAULT_LLM_POLICY,
  
  // CHI Analysis
  CHIAnalysis,
  ConfidenceLevel,
  InferredRisk,
  SuggestedConstraint,
  RiskForecastContext,
  createEmptyCHIAnalysis,
  
  // Conformance
  CHIConformance,
  validateCHIConformance,
  
  // Layer types (ADR-005)
  TrustLevel,
  LayerMetadata,
  getTrustRank,
  canOverride,
} from './types';

// Introspection Engine
export {
  analyzeIntent,
  analyzeWorkflow,
  validateLLMPolicy,
} from './introspection';
