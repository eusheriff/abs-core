# Guia de Integração: ABS em Qualquer Projeto

Este guia explica como adicionar o **ABS (Autonomous Business System)** para governar as decisões de IA no seu projeto existente.

---

## 1. O Problema (Sem ABS)
Seu backend tem um código assim:
```typescript
// PERIGO: O LLM decide e executa diretamente
const acao = await openai.chat.completions.create({ messages: [...] });
if (acao.tool_calls) {
   // Execução direta sem auditoria ou bloqueio determinístico
   await database.run(acao.tool_calls[0].function.arguments); 
}
```
Isso viola **OWASP LLM01** e **LLM08**.

---

## 2. A Solução (Com ABS)

### Passo 1: Instalação (Scanner)
Primeiro, verifique onde você está inseguro.
```bash
npx @abs/cli scan .
```
O scanner vai apontar: `[RISCO] src/worker.ts: Execução direta encontrada.`

### Passo 2: Instalação (Runtime)
Adicione o ABS Core como middleware.
```bash
npm install @abs/core
```

### Passo 3: Refatoração para Proposta
Em vez de executar, você pede ao LLM para **propor** uma decisão através do ABS.

```typescript
// NOVO FLUXO
import { ABS } from '@abs/core';

const resultado = await ABS.run({
    evento: { tipo: 'REEMBOLSO_SOLICITADO', valor: 500 },
    razao: "GPT-4 sugere aprovar",
    politica: "financeiro_v1" // ID da política em src/core/policy.ts
});

if (resultado.status === 'APROVADO') {
    // Só executa se o ABS permitiu E logou a decisão
    await database.run(...);
}
```

### Passo 4: Definindo a Política
No arquivo de políticas do ABS (`policy.ts`), você escreve regras que o LLM não pode quebrar.

```typescript
// Regra Determinística
if (evento.valor > 1000 && !usuario.isVIP) {
    return 'DENY'; // Bloqueia mesmo se o GPT disser "Sim"
}
return 'ALLOW';
```

---

## 3. Resultado Final
1.  **Governança**: O LLM virou apenas um conselheiro. Quem manda é o código (Política).
2.  **Dashboard**: O CISO vê em tempo real em `http://localhost:3001` quem tentou aprovar reembolsos acima de 1000 e foi bloqueado.
3.  **Segurança**: Se o LLM alucinar ou sofrer Injection, a política bloqueia a ação final.
