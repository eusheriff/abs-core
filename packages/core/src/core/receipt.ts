/**
 * Governance Receipt
 * 
 * Implements ADR-007: Authorized Agent Response Headers
 * 
 * Generates the "ABS System" visible block to inform users/agents
 * that an action was governed.
 */

import { DecisionResult } from './interfaces';

export interface ReceiptOptions {
  format: 'markdown' | 'text' | 'json';
  includeWalParams?: boolean;
}

/**
 * Generate a visual "ABS System" receipt
 */
export function generateReceipt(
  decision: DecisionResult, 
  auditId: string,
  options: ReceiptOptions = { format: 'markdown' }
): string {
  const verdict = typeof decision === 'string' ? decision : decision.decision;
  const reason = typeof decision === 'string' ? '' : decision.reason || '';
  const score = typeof decision === 'string' ? 0 : decision.score || 0;
  
  const icon = getVerdictIcon(verdict);
  const color = getVerdictColor(verdict);
  
  if (options.format === 'markdown') {
    return `
> [!${color}]
> **${icon} ABS System**
>
> **Verdict**: \`${verdict}\` (Risk: ${score}/100)
> **Audit**: \`${auditId.slice(0, 8)}...\`
> ${reason ? `**Reason**: ${reason}` : ''}
`.trim();
  }
  
  if (options.format === 'text') {
    return `[ABS System] ${icon} ${verdict}: ${reason} (Audit: ${auditId.slice(0, 8)})`;
  }
  
  return JSON.stringify({
    source: "ABS Kernel",
    verdict,
    reason,
    audit_id: auditId,
    risk_score: score
  });
}

function getVerdictIcon(verdict: string): string {
  switch (verdict) {
    case 'ALLOW': return '🛡️';
    case 'DENY': return '🛑';
    case 'REQUIRE_APPROVAL': return '👮';
    case 'ALLOW_WITH_CONSTRAINTS': return '⚠️';
    default: return '🤖';
  }
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'ALLOW': return 'NOTE'; // Blue/Green usually
    case 'DENY': return 'CAUTION'; // Red
    case 'REQUIRE_APPROVAL': return 'WARNING'; // Yellow
    case 'ALLOW_WITH_CONSTRAINTS': return 'TIP'; // Green/Yellow
    default: return 'NOTE';
  }
}
