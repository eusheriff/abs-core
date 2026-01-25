/**
 * Conformance Suite Runner
 * 
 * Executes test vectors against a policy engine implementation
 * and produces a conformance report.
 */

import { ConformanceVector, ConformanceResult, ConformanceCategory } from './types';
import { decisionEnvelopeVectors } from './vectors/decision-envelope.vectors';
import { excessiveAgencyVectors } from './vectors/owasp-lml08-excessive-agency.vectors';
import { promptInjectionVectors } from './vectors/owasp-lml01-prompt-injection.vectors';

export interface PolicyEngine {
  evaluate(event: {
    event_type: string;
    payload: Record<string, unknown>;
    context?: Record<string, unknown>;
  }): Promise<{
    verdict: string;
    reason_code?: string;
    constraints?: string[];
  }>;
}

export interface ConformanceSuiteOptions {
  /** Which categories to run (default: all) */
  categories?: ConformanceCategory[];
  
  /** Filter vectors by tags */
  tags?: string[];
  
  /** Stop on first failure */
  failFast?: boolean;
  
  /** Timeout per test in ms */
  timeoutMs?: number;
  
  /** Verbose logging */
  verbose?: boolean;
}

export interface ConformanceSuiteResult {
  /** Total vectors run */
  total: number;
  
  /** Passed count */
  passed: number;
  
  /** Failed count */
  failed: number;
  
  /** Skipped count */
  skipped: number;
  
  /** Pass rate (0-100) */
  passRate: number;
  
  /** Individual results */
  results: ConformanceResult[];
  
  /** Duration in ms */
  durationMs: number;
  
  /** Summary by category */
  byCategory: Record<ConformanceCategory, { passed: number; failed: number }>;
}

/**
 * Get all test vectors
 */
export function getAllVectors(): ConformanceVector[] {
  return [
    ...decisionEnvelopeVectors,
    ...excessiveAgencyVectors,
    ...promptInjectionVectors
  ];
}

/**
 * Run the conformance suite against a policy engine
 */
export async function runConformanceSuite(
  engine: PolicyEngine,
  options: ConformanceSuiteOptions = {}
): Promise<ConformanceSuiteResult> {
  const {
    categories,
    tags,
    failFast = false,
    timeoutMs = 5000,
    verbose = false
  } = options;
  
  const startTime = performance.now();
  const allVectors = getAllVectors();
  
  // Filter vectors
  let vectors = allVectors;
  
  if (categories && categories.length > 0) {
    vectors = vectors.filter(v => categories.includes(v.category));
  }
  
  if (tags && tags.length > 0) {
    vectors = vectors.filter(v => 
      v.tags?.some(t => tags.includes(t))
    );
  }
  
  const results: ConformanceResult[] = [];
  const byCategory: Record<string, { passed: number; failed: number }> = {};
  
  for (const vector of vectors) {
    if (verbose) {
      console.log(`[CONFORMANCE] Running ${vector.id}: ${vector.name}`);
    }
    
    const testStart = performance.now();
    
    try {
      // Run with timeout
      const result = await Promise.race([
        engine.evaluate({
          event_type: vector.input.event_type,
          payload: vector.input.payload,
          context: vector.input.context
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
      ]);
      
      const durationMs = performance.now() - testStart;
      
      // Check verdict match
      const verdictMatch = 
        result.verdict === vector.expected.verdict ||
        vector.expected.verdict_alternatives?.includes(result.verdict as any);
      
      // Check reason code match (if specified)
      const reasonMatch = 
        !vector.expected.reason_code ||
        result.reason_code === vector.expected.reason_code;
      
      const passed = verdictMatch && reasonMatch;
      
      results.push({
        vector,
        passed,
        actualVerdict: result.verdict,
        actualReasonCode: result.reason_code,
        durationMs,
        error: passed ? undefined : 
          `Expected verdict=${vector.expected.verdict}, got=${result.verdict}. ` +
          `Expected reason=${vector.expected.reason_code}, got=${result.reason_code}`
      });
      
      // Update category stats
      if (!byCategory[vector.category]) {
        byCategory[vector.category] = { passed: 0, failed: 0 };
      }
      if (passed) {
        byCategory[vector.category].passed++;
      } else {
        byCategory[vector.category].failed++;
        
        if (verbose) {
          console.error(`[CONFORMANCE] FAIL ${vector.id}: ${results[results.length - 1].error}`);
        }
        
        if (failFast) {
          break;
        }
      }
      
    } catch (error) {
      const durationMs = performance.now() - testStart;
      
      results.push({
        vector,
        passed: false,
        durationMs,
        error: `Exception: ${error instanceof Error ? error.message : String(error)}`
      });
      
      if (!byCategory[vector.category]) {
        byCategory[vector.category] = { passed: 0, failed: 0 };
      }
      byCategory[vector.category].failed++;
      
      if (verbose) {
        console.error(`[CONFORMANCE] ERROR ${vector.id}: ${error}`);
      }
      
      if (failFast) {
        break;
      }
    }
  }
  
  const totalDuration = performance.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const skipped = vectors.length - results.length;
  
  return {
    total: vectors.length,
    passed,
    failed,
    skipped,
    passRate: vectors.length > 0 ? (passed / vectors.length) * 100 : 0,
    results,
    durationMs: totalDuration,
    byCategory: byCategory as Record<ConformanceCategory, { passed: number; failed: number }>
  };
}

/**
 * Print conformance report to console
 */
export function printConformanceReport(result: ConformanceSuiteResult): void {
  console.log('\n========================================');
  console.log('   ABS CONFORMANCE SUITE REPORT');
  console.log('========================================\n');
  
  console.log(`Total Vectors: ${result.total}`);
  console.log(`Passed: ${result.passed} ✅`);
  console.log(`Failed: ${result.failed} ❌`);
  console.log(`Skipped: ${result.skipped} ⏭️`);
  console.log(`Pass Rate: ${result.passRate.toFixed(1)}%`);
  console.log(`Duration: ${result.durationMs.toFixed(0)}ms\n`);
  
  console.log('By Category:');
  for (const [category, stats] of Object.entries(result.byCategory)) {
    const total = stats.passed + stats.failed;
    const rate = total > 0 ? (stats.passed / total) * 100 : 0;
    console.log(`  ${category}: ${stats.passed}/${total} (${rate.toFixed(0)}%)`);
  }
  
  if (result.failed > 0) {
    console.log('\nFailed Tests:');
    for (const r of result.results.filter(r => !r.passed)) {
      console.log(`  ❌ ${r.vector.id}: ${r.vector.name}`);
      console.log(`     ${r.error}`);
    }
  }
  
  console.log('\n========================================\n');
}
