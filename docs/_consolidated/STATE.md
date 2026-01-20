# Estado Atual do Sistema

**Versão**: v2.3 (Release: `v0.6.0-beta` + Scanner Mode)
**Status**: 🟢 DEPLOYED & CONTAINERIZED
**URL**: `https://abs.oconnector.tech`
**Strategy**: Free Scanner vs Paid Runtime (Switchable via `ABS_MODE`)

## Arquitetura Atual

- **Core**: Unified Runtime (`packages/core/src/api/factory.ts`)
  - **Modes**: `scanner` (Free/Passive) vs `runtime` (Paid/Active).
  - **SaaS**: Cloudflare Worker (`worker.ts`)
  - **On-Premise**: Docker Container (`Dockerfile` / `server.ts`)
- **Database**: 
  - **SaaS**: Cloudflare D1
  - **On-Premise**: SQLite (Volume persistente)
- **Queue**: Cloudflare Queues (SaaS only)
- **Auth**: API Keys (Generic / DB-backed)
- **Auth**: API Keys (D1 com hash SHA-256)
- **LLM**: Gemini 1.5 Flash (6 keys em rodízio)
- **Security**: Prompt Injection Sanitizer + Idempotency Check + Metrics Auth
- **Observability**: `/metrics` (Prometheus) protegido por scope `admin:read`

## Integração Ativa

### Bot Manú (WhatsApp)
- **Policy Pack v0**: 5 políticas de governança
  - P-01: Fora de horário → HANDOFF
  - P-02: Promessa comercial → HANDOFF
  - P-03: Baixa confiança → DENY
  - P-04: Escalada sem sinais → DENY
  - P-05: Repetição → DENY

## Fluxo v2.0

```
[Client] → [Ingestion] → 202 Accepted → [Queue] → [Processor] → [Decision]
              (~5ms)                      async       (Gemini)
```

## Roadmap

- [x] v1.1: Production Deploy & Ops
- [x] v1.2: Security Hardening
- [x] v1.3: LLM Integration
- [x] v1.4: Prompt Injection Protection
- [x] v2.0: Scale (Queue-based processing)
- [x] v0.6: Bot Operational Governance (Policy Pack v0)
