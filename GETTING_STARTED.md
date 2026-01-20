# Getting Started with ABS Core

> Complete guide to understanding and using ABS Core for governed AI decision-making.

## Table of Contents

1. [What is ABS Core?](#what-is-abs-core)
2. [How It Works](#how-it-works)
3. [Quick Start](#quick-start)
4. [Understanding Events](#understanding-events)
5. [Built-in Policies](#built-in-policies)
6. [Creating Custom Policies](#creating-custom-policies)
7. [LLM Providers](#llm-providers)
8. [Troubleshooting](#troubleshooting)

---

## What is ABS Core?

ABS Core is a **governed runtime** that sits between your AI/LLM and your execution layer.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Event     │ ──► │  LLM        │ ──► │  Policy     │ ──► │  Execution  │
│   Source    │     │  Proposal   │     │  Gate       │     │  (if ALLOW) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │  Decision   │
                                        │  Log (D1)   │
                                        └─────────────┘
```

**Key Principle:** Nothing executes without a logged decision. If the DB insert fails, the action never happens.

---

## How It Works

### The Governance Loop

1. **Event Arrives** → Validated against schema
2. **LLM Proposes** → Gemini/OpenAI suggests action + risk level
3. **Sanitizer Checks** → Detects prompt injection attempts
4. **Policy Evaluates** → ALLOW, DENY, or HANDOFF
5. **Decision Logged** → Immutable record in D1
6. **Action Executes** → Only if policy allows

### Request Flow (v2.0)

```
POST /v1/events ──► Ingest ──► Queue ──► Process ──► Log
        │                         │
        ▼                         ▼
   202 Accepted              Gemini API
     (~5ms)                  + Policy Gate
```

---

## Quick Start

### Option 1: Use Hosted API

```bash
curl -X POST https://abs.oconnector.tech/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-demo-abs-v0" \
  -d '{
    "event_id": "evt-001",
    "tenant_id": "demo",
    "event_type": "ticket.created",
    "source": "api",
    "occurred_at": "2026-01-19T00:00:00Z",
    "payload": {"subject": "Need help with order"},
    "correlation_id": "corr-001"
  }'
```

**Response:**
```json
{
  "status": "accepted",
  "mode": "queue",
  "event_id": "evt-001"
}
```

### Option 2: Self-Host

```bash
# Clone and setup
git clone https://github.com/eusheriff/abs-core.git
cd abs-core && npm install

# Configure
cp packages/core/wrangler.toml.example packages/core/wrangler.toml
npx wrangler d1 create abs-core-db
# Edit wrangler.toml with your database_id

# Deploy
npm run deploy
```

---

## Understanding Events

### Event Schema

```typescript
interface EventEnvelope {
  event_id: string;       // Unique ID (UUID recommended)
  tenant_id: string;      // Multi-tenant isolation
  event_type: string;     // e.g., "ticket.created", "bot.action"
  source: string;         // Origin system
  occurred_at: string;    // ISO 8601 timestamp
  payload: object;        // Event-specific data
  correlation_id: string; // For tracing
}
```

### Event Types

| Prefix | Use Case | Example |
|--------|----------|---------|
| `ticket.*` | Support tickets | `ticket.created`, `ticket.escalated` |
| `bot.*` | Bot actions | `bot.message`, `bot.handoff` |
| `whatsapp.*` | WhatsApp events | `whatsapp.message`, `whatsapp.reply` |
| `order.*` | E-commerce | `order.placed`, `order.refund` |

---

## Built-in Policies

### BotOperationalPolicy (Policy Pack v0)

5 policies for governing bot actions:

| ID | Trigger | Action | When |
|----|---------|--------|------|
| **P-01** | Outside hours | HANDOFF | 7h-22h BRT |
| **P-02** | Commercial promise | HANDOFF | Discounts, guarantees |
| **P-03** | Low confidence | DENY | <70% confidence |
| **P-04** | Lead escalation | DENY | Missing signals |
| **P-05** | Repetition | DENY | Same action <5min |

### Example: P-01 (Outside Hours)

```typescript
// Event at 23:00
{
  "event_type": "bot.reply",
  "payload": { 
    "message": "Vou te ajudar!",
    "context": { "timestamp": "2026-01-19T23:00:00-03:00" }
  }
}

// Result: HANDOFF
// Reason: "Fora do horário comercial (7h-22h)"
```

---

## Creating Custom Policies

### Step 1: Create Policy File

```typescript
// packages/core/src/core/policy-custom.ts
import { PolicyEngine, PolicyResult } from './interfaces';
import { DecisionProposal } from './schemas';

export class CustomPolicy implements PolicyEngine {
  evaluate(event: any, proposal: DecisionProposal): PolicyResult {
    // Your logic here
    
    // Example: Block high-value refunds
    if (event.payload?.amount > 1000) {
      return {
        decision: 'deny',
        reason: 'Refund > $1000 requires manual approval',
        policy_id: 'CUSTOM-01'
      };
    }
    
    return {
      decision: proposal.recommended_action,
      reason: proposal.explanation,
      policy_id: 'DEFAULT'
    };
  }
}
```

### Step 2: Register Policy

```typescript
// packages/core/src/core/policy-registry.ts
import { CustomPolicy } from './policy-custom';

PolicyRegistry.register('refund', new CustomPolicy());
```

### Step 3: Deploy

```bash
npm run deploy
```

---

## LLM Providers

### Supported Providers

| Provider | Model | Key Rotation | Setup |
|----------|-------|--------------|-------|
| **Gemini** | gemini-1.5-flash | ✅ 6 keys | `wrangler secret put GEMINI_API_KEY` |
| **OpenAI** | gpt-4o-mini | ❌ | `wrangler secret put OPENAI_API_KEY` |
| **Mock** | — | — | Default for testing |

### Configuring Provider

```toml
# wrangler.toml
[vars]
LLM_PROVIDER = "gemini"  # or "openai" or "mock"
```

### Key Rotation (Gemini)

```bash
# Set multiple keys separated by comma
wrangler secret put GEMINI_API_KEY
# Paste: key1,key2,key3,key4,key5,key6
```

The system rotates keys automatically on each request.

---

## Troubleshooting

### Common Issues

#### "Invalid Event Envelope"

**Problem:** Missing required fields in event

**Solution:**
```bash
# Check all required fields are present
{
  "event_id": "required",
  "tenant_id": "required", 
  "event_type": "required",
  "source": "required",
  "occurred_at": "required (ISO 8601)",
  "payload": {},
  "correlation_id": "required"
}
```

#### "Unauthorized"

**Problem:** Missing or invalid API key

**Solution:**
```bash
# Check header format
-H "Authorization: Bearer sk-your-key"
```

#### Queue Not Processing

**Problem:** Events stuck in "accepted" status

**Check:**
```bash
# View worker logs
npx wrangler tail abs-core

# Check queue status
npx wrangler queues list
```

#### Prompt Injection Detected

**Problem:** Event auto-escalated with critical risk

**Cause:** Payload contains injection patterns like:
- "Ignore previous instructions"
- "You are now..."
- "Forget everything"

**Solution:** Sanitize user input before sending to ABS.

---

## Next Steps

- [Architecture Overview](ARCHITECTURE.md)
- [Security Policy](SECURITY.md)
- [Policy Pack Reference](docs/decisions/policy_pack_v0.md)
- [API Reference](docs/api.md)

---

## Need Help?

- **Issues:** [GitHub Issues](https://github.com/eusheriff/abs-core/issues)
- **Discussions:** [GitHub Discussions](https://github.com/eusheriff/abs-core/discussions)
