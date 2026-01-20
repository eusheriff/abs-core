# Estado Atual do Sistema

**Versão**: v2.0 (Scale - Queue Architecture)
**Status**: 🟢 DEPLOYED
**URL**: `https://abs.oconnector.tech`

## Arquitetura Atual

- **Core**: Cloudflare Worker (`abs-core`)
- **Database**: D1 (`abs-core-db`)
- **Queue**: Cloudflare Queues (`abs-events-queue`, `abs-events-dlq`)
- **Auth**: API Keys (D1 com hash SHA-256)
- **LLM**: Gemini 1.5 Flash (6 keys em rodízio)
- **Security**: Prompt Injection Sanitizer

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
