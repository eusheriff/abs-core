/**
 * Rate Limits Policy
 * 
 * Enforces resource quotas per tenant/tool/time period.
 * Part of RFC Antigravity Execution Plane constraints.
 */

import { Policy, PolicyInput, PolicyResult } from '../../core/interfaces';

interface RateBucket {
  count: number;
  resetAt: number; // Unix timestamp
}

// In-memory rate limit store (per process)
// Production: Use Redis or D1
const rateLimitStore = new Map<string, RateBucket>();

// Default limits
const LIMITS = {
  DEFAULT_REQUESTS_PER_MINUTE: 100,
  DEFAULT_TOKENS_PER_HOUR: 50000,
  DANGER_ACTIONS_PER_MINUTE: 10, // rm, delete, etc.
};

const DANGER_ACTIONS = [
  'fs.delete',
  'command.execute',
  'tool.shell',
  'net.external',
];

export const rateLimitsPolicy: Policy = {
  name: 'rate_limits',
  description: 'Enforces rate limiting per tenant/tool to prevent resource exhaustion',
  version: '1.0.0',

  async evaluate(input: PolicyInput): Promise<PolicyResult> {
    const tenantId = input.tenantId || 'default';
    const action = input.action;
    const now = Date.now();

    // Determine limit based on action type
    const isDanger = DANGER_ACTIONS.some(d => action.includes(d));
    const limit = isDanger 
      ? LIMITS.DANGER_ACTIONS_PER_MINUTE 
      : LIMITS.DEFAULT_REQUESTS_PER_MINUTE;
    const windowMs = 60000; // 1 minute

    // Build bucket key
    const bucketKey = `${tenantId}:${isDanger ? 'danger' : 'default'}`;

    // Get or create bucket
    let bucket = rateLimitStore.get(bucketKey);
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(bucketKey, bucket);
    }

    // Increment
    bucket.count++;

    // Check limit
    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      return {
        decision: 'DENY',
        reason: `Rate limit exceeded: ${bucket.count}/${limit} per minute. Retry after ${retryAfter}s.`,
        riskScore: 70,
        metadata: {
          retryAfterSeconds: retryAfter,
          currentCount: bucket.count,
          limit,
        },
      };
    }

    // Warn if approaching limit (80%)
    if (bucket.count > limit * 0.8) {
      return {
        decision: 'ALLOW',
        riskScore: 40,
        reason: `Approaching rate limit: ${bucket.count}/${limit}`,
      };
    }

    return {
      decision: 'ALLOW',
      riskScore: 0,
    };
  },
};

export default rateLimitsPolicy;
