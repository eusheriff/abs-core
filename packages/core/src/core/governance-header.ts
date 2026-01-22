/**
 * ABS Governance Header
 * 
 * Provides structured visibility into policy decisions.
 * Every ABS-governed response includes this header as JSON prefix.
 */

export type ABSMode = 'governed' | 'scanner' | 'shadow' | 'safe_mode';
export type ABSVerdict = 'ALLOW' | 'DENY' | 'ESCALATE' | 'REQUIRE_APPROVAL' | 'SAFE_MODE';

export interface ABSGovernanceHeader {
  abs: {
    mode: ABSMode;
    verdict: ABSVerdict;
    policy: string | null;
    risk_score: number;
    wal_entry?: string;
    trace_id: string;
    reason?: string;
    constraints?: Record<string, unknown>;
  };
}

export interface ABSFormattedResponse {
  header: ABSGovernanceHeader;
  headerJson: string;
  body: unknown;
  formatted: string;
}

/**
 * Create a governance header for ABS responses
 */
export function createGovernanceHeader(options: {
  mode?: ABSMode;
  verdict: ABSVerdict;
  policy?: string | null;
  riskScore?: number;
  walEntry?: string;
  traceId?: string;
  reason?: string;
  constraints?: Record<string, unknown>;
}): ABSGovernanceHeader {
  return {
    abs: {
      mode: options.mode || 'governed',
      verdict: options.verdict,
      policy: options.policy || null,
      risk_score: options.riskScore ?? 0,
      wal_entry: options.walEntry,
      trace_id: options.traceId || crypto.randomUUID().slice(0, 8),
      reason: options.reason,
      constraints: options.constraints,
    },
  };
}

/**
 * Format an ABS response with governance header
 * 
 * Output format:
 * ```
 * {"abs":{"mode":"governed","verdict":"ALLOW",...}}
 * ---
 * <body content>
 * ```
 */
export function formatABSResponse(
  header: ABSGovernanceHeader,
  body: unknown
): ABSFormattedResponse {
  const headerJson = JSON.stringify(header);
  const bodyStr = typeof body === 'string' 
    ? body 
    : JSON.stringify(body, null, 2);
  
  return {
    header,
    headerJson,
    body,
    formatted: `${headerJson}\n---\n${bodyStr}`,
  };
}

/**
 * Quick helper to create ALLOW response
 */
export function absAllow(body: unknown, options: {
  policy?: string;
  riskScore?: number;
  traceId?: string;
  walEntry?: string;
  mode?: ABSMode;
} = {}): ABSFormattedResponse {
  return formatABSResponse(
    createGovernanceHeader({
      mode: options.mode,
      verdict: 'ALLOW',
      policy: options.policy,
      riskScore: options.riskScore || 0,
      traceId: options.traceId,
      walEntry: options.walEntry,
    }),
    body
  );
}

/**
 * Quick helper to create DENY response
 */
export function absDeny(reason: string, options: {
  policy?: string;
  riskScore?: number;
  traceId?: string;
  mode?: ABSMode;
} = {}): ABSFormattedResponse {
  return formatABSResponse(
    createGovernanceHeader({
      mode: options.mode,
      verdict: 'DENY',
      policy: options.policy,
      riskScore: options.riskScore || 95,
      traceId: options.traceId,
      reason,
    }),
    { blocked: true, reason }
  );
}

/**
 * Quick helper to create ESCALATE response
 */
export function absEscalate(reason: string, options: {
  policy?: string;
  riskScore?: number;
  traceId?: string;
  mode?: ABSMode;
} = {}): ABSFormattedResponse {
  return formatABSResponse(
    createGovernanceHeader({
      mode: options.mode,
      verdict: 'ESCALATE',
      policy: options.policy,
      riskScore: options.riskScore || 50,
      traceId: options.traceId,
      reason,
    }),
    { escalated: true, reason, action: 'Awaiting human review' }
  );
}

/**
 * Quick helper to create SAFE_MODE response
 */
export function absSafeMode(reason: string, options: {
  traceId?: string;
} = {}): ABSFormattedResponse {
  return formatABSResponse(
    createGovernanceHeader({
      mode: 'safe_mode',
      verdict: 'SAFE_MODE',
      riskScore: 100,
      traceId: options.traceId,
      reason,
    }),
    { halted: true, reason, action: 'All operations suspended' }
  );
}

export default {
  createGovernanceHeader,
  formatABSResponse,
  absAllow,
  absDeny,
  absEscalate,
  absSafeMode,
};
