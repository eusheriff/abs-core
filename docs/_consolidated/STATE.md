# Context Pack: ABS Core Governance

## Estado Atual
- **Projeto:** abs-core (Autonomous Business System Runtime)
- **Objetivo:** Governança para agentes de codificação
- **MCP Server:** Oracle VM (163.176.247.143) via SSH
- **Modo:** Shadow (log only)

## Arquivos Principais
- `packages/core/src/mcp/server.ts` - MCP Server com 6 tools
- `packages/core/src/policies/library/code_safety.ts` - 4 políticas de código
- `cursor-mcp-config.json` - Config para Cursor IDE

## Tools MCP Disponíveis
| Tool | Descrição |
|------|-----------|
| `abs_evaluate` | Avalia interação LLM contra políticas |
| `abs_log` | Log de auditoria (fire-and-forget) |
| `abs_check_policy` | Dry-run de política |
| `abs_get_decisions` | Consulta Decision Logs |
| `abs_check_file_edit` | **Valida edição de arquivo** |
| `abs_check_command` | **Valida comando de terminal** |

## Políticas Ativas
1. `protected-files` - Bloqueia .env, secrets, keys
2. `blocked-commands` - Bloqueia rm -rf, DROP TABLE, etc.
3. `edit-size-limit` - Limita 500 linhas por edição
4. `no-secrets-in-code` - Detecta segredos hardcoded

## Decisões Tomadas
- [2026-01-20] Modo Shadow inicial para validação
- [2026-01-20] Sem dependência de minimatch (glob nativo)
- [2026-01-20] tsx on-the-fly (sem build tsc por OOM)

## Próximos Passos
Ver: `.agent/workflows/abs-governance.md`
