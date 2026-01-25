/**
 * ABS Conformance Test Suite
 * 
 * Provides test vectors for validating ABS implementations against:
 * - Decision Envelope v1 (ADR-008)
 * - OWASP LLM Top 10 scenarios
 * - Policy evaluation correctness
 * 
 * Usage:
 *   import { runConformanceSuite } from '@abs/conformance';
 *   const results = await runConformanceSuite(yourPolicyEngine);
 */

export { ConformanceVector, ConformanceResult, ConformanceCategory } from './types';
export { decisionEnvelopeVectors } from './vectors/decision-envelope.vectors';
export { excessiveAgencyVectors } from './vectors/owasp-lml08-excessive-agency.vectors';
export { promptInjectionVectors } from './vectors/owasp-lml01-prompt-injection.vectors';
export { runConformanceSuite, ConformanceSuiteOptions, ConformanceSuiteResult } from './runner';
