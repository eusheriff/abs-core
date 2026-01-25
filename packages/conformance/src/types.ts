/**
 * Conformance Suite Types
 */

export type ConformanceCategory = 
  | 'DECISION_ENVELOPE'
  | 'OWASP_LLM01_PROMPT_INJECTION'
  | 'OWASP_LLM08_EXCESSIVE_AGENCY'
  | 'POLICY_EVALUATION'
  | 'INTEGRITY';

export type ExpectedVerdict = 
  | 'ALLOW'
  | 'DENY'
  | 'REQUIRE_APPROVAL'
  | 'ALLOW_WITH_CONSTRAINTS'
  | 'SYSTEM_FAILURE';

export interface ConformanceVector {
  /** Unique vector identifier (e.g., "LLM08-001") */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description of what this tests */
  description: string;
  
  /** Category for grouping */
  category: ConformanceCategory;
  
  /** Reference to standard (e.g., OWASP URL, ADR) */
  reference?: string;
  
  /** Input event to test */
  input: {
    event_type: string;
    payload: Record<string, unknown>;
    context?: Record<string, unknown>;
  };
  
  /** Expected output */
  expected: {
    verdict: ExpectedVerdict;
    reason_code?: string;
    constraints?: string[];
    /** If true, any verdict matching this is acceptable */
    verdict_alternatives?: ExpectedVerdict[];
  };
  
  /** Tags for filtering (e.g., ["critical", "bypass-attempt"]) */
  tags?: string[];
}

export interface ConformanceResult {
  /** Vector that was tested */
  vector: ConformanceVector;
  
  /** Whether the test passed */
  passed: boolean;
  
  /** Actual verdict received */
  actualVerdict?: string;
  
  /** Actual reason code received */
  actualReasonCode?: string;
  
  /** Error message if test failed */
  error?: string;
  
  /** Execution time in ms */
  durationMs: number;
}
