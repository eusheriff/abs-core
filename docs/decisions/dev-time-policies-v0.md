# Dev-Time Policies: PR Governance

> ABS não faz a IA "decidir certo". ABS faz o sistema **não executar sem evidência** e **não passar sem política**.

## Use Case: Governar PRs em Paths Sensíveis

### 5 Policies Máximas (v0)

| ID | Trigger | Evidências Requeridas | Ação |
|----|---------|----------------------|------|
| **DP-01** | Toca `/auth/` ou `/billing/` | testes + ADR + revisão humana | HANDOFF |
| **DP-02** | Novo endpoint `/api/` | contrato + teste e2e | ESCALATE |
| **DP-03** | Muda dependência | SBOM + lockfile + scan | ALLOW se passar |
| **DP-04** | Mudança > 500 linhas | decomposição obrigatória | DENY |
| **DP-05** | Toca secrets/env | approval de 2 maintainers | HANDOFF |

### 5 Evidências Máximas (v0)

| ID | Evidência | Verificação | Automatizável |
|----|-----------|-------------|---------------|
| **E-01** | TypeCheck | `npm run typecheck` exit 0 | ✅ |
| **E-02** | Tests | `npm test` exit 0 | ✅ |
| **E-03** | Lint | `npm run lint` exit 0 | ✅ |
| **E-04** | SAST/Secrets | TruffleHog/Trivy exit 0 | ✅ |
| **E-05** | Human Review | GitHub Approval | ⚠️ Manual |

## Implementação

### GitHub Action (CODEOWNERS + Branch Protection)

```yaml
# .github/CODEOWNERS
/src/auth/     @eusheriff @security-team
/src/billing/  @eusheriff @finance-team
*.env*         @eusheriff
```

### ABS Policy Engine (dev-time)

```typescript
const DEV_TIME_POLICIES: Policy[] = [
  {
    id: 'DP-01',
    match: (diff) => diff.paths.some(p => 
      p.includes('/auth/') || p.includes('/billing/')
    ),
    require: ['E-02', 'E-05'], // tests + human review
    action: 'HANDOFF'
  },
  // ...
];
```

## Métricas a Coletar (1 Sprint)

- [ ] Denies por dia
- [ ] Falsos positivos (DENY incorreto)
- [ ] Tempo adicional por merge
- [ ] Bugs evitados (proxy: rollbacks/hotfixes)
