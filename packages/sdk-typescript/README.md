# @oconnector/abs-sdk-typescript

The official ABS SDK for TypeScript — **governance for AI agents that actually works**.

## What is this?

A type-safe SDK that enforces governance decisions before your AI agent can act. If the SDK compiles, your agent can't bypass policy. If it throws, ownership is clear.

## Why does it exist?

AI agents make mistakes. When they do, you need to know:
1. **What decision was made?** → `DecisionEnvelope`
2. **Was it allowed?** → `guardExecutable()` throws if not
3. **What actually happened?** → `ExecutionReceipt`

This SDK makes incorrect integration **impossible** by design.

## Installation

```bash
npm install @oconnector/abs-sdk-typescript
```

## Quickstart (5 minutes)

```typescript
import { 
  ABSClient, 
  DecisionEnvelopeBuilder,
  guardExecutable 
} from '@oconnector/abs-sdk-typescript';

// 1. Create client
const client = new ABSClient({
  tenantId: 'my-tenant',
  agentId: 'my-agent',
});

// 2. Build a decision envelope
const envelope = new DecisionEnvelopeBuilder()
  .setDecisionId(crypto.randomUUID())
  .setTraceId('trace-123')
  .setVerdict('ALLOW')
  .setReasonCode('POLICY.VIOLATION')
  .setReasonHuman('Action approved by policy')
  .setRiskScore(25)
  .setAuthority({
    policy_name: 'bot-policy',
    policy_version: '1.0.0',
    evaluated_at: new Date().toISOString(),
  })
  .setContext({
    tenant_id: 'my-tenant',
    agent_id: 'my-agent',
    event_type: 'bot.message',
    action_requested: 'send_message',
  })
  .setValidUntil(300) // 5 minute TTL
  .build();

// 3. Guard before execution (throws if not allowed)
guardExecutable(envelope);

// 4. Execute with receipt
const result = await client.execute(envelope, async () => {
  return await sendMessage('Hello!');
});

console.log(result.status);         // 'executed'
console.log(result.receipt.outcome); // 'EXECUTED'
```

## ⚠️ Understanding Errors (Read This First)

The SDK **throws hard errors** on invariant violations. This is intentional.

### `ABSMonitorModeError`

```
Decision abc123 is in monitor mode - execution not allowed
```

**What happened:** The envelope has `monitor_mode: true`. This means it's advisory only — the decision was logged but **not enforced**.

**Fix:** If you want real enforcement, ensure your ABS policy doesn't set `monitor_mode: true` in production.

### `ABSExpiredError`

```
Decision expired at 2024-01-01T00:00:00Z (current time: 2024-01-01T00:05:00Z)
```

**What happened:** The envelope's `valid_until` timestamp has passed. Stale decisions cannot be executed.

**Fix:** Process events faster, or increase TTL with `.setValidUntil(600)` (10 min).

### `ABSVerdictError`

```
Verdict is DENY (POLICY.VIOLATION) - execution not allowed
```

**What happened:** The policy evaluated the request and said no.

**Fix:** This is working as intended. Check your policy rules.

### `ABSGateError`

```
Gate check failed: TENANT_ACTIVE=FAIL
```

**What happened:** An applicability gate failed. Maybe the tenant is suspended.

**Fix:** Check the gate source to understand why. Don't skip gates without authorization.

## Advanced: SKIPPED Gates

Skipping a gate requires explicit acknowledgment:

```typescript
// ❌ This will throw
builder.addGateSkipped('TENANT_ACTIVE', 'manual');

// ✅ This works
builder.addGateSkipped('TENANT_ACTIVE', 'admin', {
  iKnowWhatImDoing: true,
  policyVersion: 'emergency-override-1.0',
  reason: 'Emergency maintenance window',
});
```

## Chain Validation

Validate the full chain from decision to execution:

```typescript
import { validateChain } from '@oconnector/abs-sdk-typescript';

const result = validateChain(envelope, [receipt]);

if (!result.valid) {
  console.error('Chain broken at:', result.breakPoint);
}
```

## API Reference

### Guards (throw on failure)

| Guard | Throws | When |
|-------|--------|------|
| `guardExecutable(env)` | `ABSMonitorModeError`, `ABSExpiredError`, `ABSVerdictError` | Combined check |
| `guardNotMonitorMode(env)` | `ABSMonitorModeError` | `monitor_mode` is true |
| `guardNotExpired(env)` | `ABSExpiredError` | `valid_until` has passed |
| `guardAllowed(env)` | `ABSVerdictError` | Verdict is not ALLOW |
| `guardGatesPassed(receipt)` | `ABSGateError` | Any gate is FAIL or unauthorized SKIP |

### Validators (return results)

| Validator | Returns |
|-----------|---------|
| `validateEnvelope(env)` | `{ valid: boolean, errors: [], warnings: [] }` |
| `validateReceipt(receipt)` | `{ valid: boolean, errors: [], warnings: [] }` |
| `validateChain(env, receipts)` | `{ valid: boolean, breakPoint?: {...} }` |

## Design Principles

1. **If the SDK allows it, it's allowed.** If it doesn't expose it, it doesn't exist.
2. **Guards throw, validators return.** Use guards for enforcement, validators for audit.
3. **SKIPPED requires confession.** You can't accidentally skip a gate.
4. **Receipts link to envelopes.** The chain of custody is always traceable.

## Related

- [ADR-008: Public Decision Contract](https://github.com/eusheriff/abs-core/blob/main/docs/ADR-008-public-decision-contract.md)
- [ABS Core](https://github.com/eusheriff/abs-core)
- [abscore.app](https://abscore.app)

## License

Apache-2.0
