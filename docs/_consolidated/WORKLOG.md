# WORKLOG.md — OConnector ABS Core

> Registro de mudanças, comandos e validações.

---

## 2026-01-19 — Sessão 3.1: Gemini Integration

### Contexto
- Adicionar suporte ao Google Gemini como alternativa à OpenAI.

### Ações Realizadas
- [x] Deps: Adicionado `@google/generative-ai`.
- [x] Infra: Criado `src/infra/gemini.ts`.
- [x] API: Atualizado `events.ts` para factory de provider (`LLM_PROVIDER`).
- [x] Config: Atualizado `.env.example`.

### Comandos para Teste (Gemini)

1. **Atualize seu .env**:
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIza... (sua chave)
```

2. **Reinstale e Rode**:
```bash
npm install
npm run start
```

3. **Curl**:
```bash
curl -X POST http://localhost:3000/v1/events \
  -H "Content-Type: application/json" \
  -d @examples/lead_qualification_demo/events/1_message_received.json
```
