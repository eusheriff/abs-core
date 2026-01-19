# WORKLOG.md — OConnector ABS Core

> Registro de mudanças, comandos e validações.

---

## 2026-01-19 — Sessão 3.2: Multi-Key Load Balancing

### Contexto
- Evitar Rate Limits no Gemini usando múltiplas chaves.

### Ações Realizadas
- [x] Infra: Atualizado `src/infra/gemini.ts` para aceitar `string[]` e rotacionar (`Math.random()`).
- [x] API: Atualizado factory em `events.ts` para ler `GEMINI_KEYS` (CSV).
- [x] Config: `.env.example` reflete suporte a múltiplas chaves.

### Configuração Necessária (User)

No seu `.env`:

```env
LLM_PROVIDER=gemini
# Cole suas 6 chaves separadas APENAS por vírgula (sem espaços é melhor)
GEMINI_KEYS=AIza1...,AIza2...,AIza3...,AIza4...,AIza5...,AIza6...
```
