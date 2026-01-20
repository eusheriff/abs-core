# WORKLOG - ABS Core

## 2026-01-20: Implementação de Code Safety Policies

### Arquivos Criados/Modificados
- `packages/core/src/policies/library/code_safety.ts` [NEW]
  - 4 políticas: protected-files, blocked-commands, edit-size-limit, no-secrets-in-code
  - Modo Shadow por padrão
  - Função matchGlob() nativa (sem minimatch)

- `packages/core/src/mcp/server.ts` [MODIFIED]
  - +2 tools: abs_check_file_edit, abs_check_command
  - Decision Log integrado

### Deploy
- Git push: OK
- Oracle VM pull: OK
- Build: Não necessário (tsx transpila on-the-fly)
- Status: **PRONTO PARA USO**

### Comandos Úteis
```bash
# SSH para servidor
ssh -i ~/.ssh/abs_mcp_key ubuntu@163.176.247.143

# Ver logs
tail -f /opt/abs/logs/mcp.log

# Ativar Gatekeeper
sed -i 's/= "shadow"/= "gatekeeper"/' /opt/abs/packages/core/src/policies/library/code_safety.ts
```

### Próximo Sprint
- [ ] Testar tools no Cursor
- [ ] Coletar feedback de Shadow Mode
- [ ] Ativar Gatekeeper quando validado
- [ ] Dashboard para visualizar decisões
