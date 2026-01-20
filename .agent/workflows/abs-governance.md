---
description: Próximos passos para completar a integração ABS como governança de agentes de código
---

# ABS Code Governance - Próximos Passos

## Contexto
O ABS Core foi configurado como camada de governança para agentes de codificação.
- Políticas: `packages/core/src/policies/library/code_safety.ts`
- MCP Tools: `abs_check_file_edit`, `abs_check_command`
- Modo atual: **Shadow** (loga mas não bloqueia)

---

## 1. Testar as novas tools no Cursor
// turbo
Execute no terminal do projeto para testar conexão MCP:
```bash
# Verificar se as tools estão disponíveis (lista tools do MCP)
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | ssh -i ~/.ssh/abs_mcp_key ubuntu@163.176.247.143 "cd /opt/abs/packages/core && NODE_OPTIONS='--max-old-space-size=512' npx tsx src/mcp/server.ts"
```

## 2. Revisar Decision Logs
Após usar o Cursor/Antigravity, verificar logs de decisões:
```bash
ssh -i ~/.ssh/abs_mcp_key ubuntu@163.176.247.143 "sqlite3 /opt/abs/data/decisions.db 'SELECT * FROM decision_logs ORDER BY timestamp DESC LIMIT 10;'"
```

## 3. Ativar Gatekeeper Mode (quando pronto)
Quando confiante que as políticas funcionam, mudar o modo:
```bash
# Editar code_safety.ts e trocar:
# const MODE: "shadow" | "gatekeeper" = "shadow";
# para:
# const MODE: "shadow" | "gatekeeper" = "gatekeeper";

ssh -i ~/.ssh/abs_mcp_key ubuntu@163.176.247.143 "cd /opt/abs && sed -i 's/= \"shadow\"/= \"gatekeeper\"/' packages/core/src/policies/library/code_safety.ts"
```

## 4. Adicionar mais políticas (opcional)
Exemplos de políticas adicionais a considerar:
- Limite de arquivos por commit
- Bloqueio de alterações em branches protegidas
- Validação de formato de commit messages
- Detecção de dependências não autorizadas

## 5. Configurar Dashboard (futuro)
O ABS tem um dashboard web em `packages/web/`:
```bash
cd packages/web && npm run dev
```
Acesse https://abscore.app/dashboard para visualizar decisões.
