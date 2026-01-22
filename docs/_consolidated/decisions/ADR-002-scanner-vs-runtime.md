# ADR-002: Estratégia de Confiança Dual (Scanner Free vs Runtime Pago)

| Status | Data | Autores | Tags |
| :--- | :--- | :--- | :--- |
| PROPOSED | 2026-01-20 | Antigravity | #strategy, #architecture, #business |

## Contexto
O ABS Core precisa atender dois perfis de uso distintos sem fragmentar a base de código:
1.  **Scanner Free**: Usuários que buscam observabilidade e detecção de riscos sem fricção ou custo, focados em "Dev-time" e "Checks básicos".
2.  **Runtime Pago**: Empresas que buscam governança real, enforcement de políticas e garantias de execução em ambientes críticos.

A abordagem anterior sugeria pacotes separados, o que aumentaria o custo de manutenção e dificultaria o upgrade.

## Decisão
Implementar uma arquitetura unificada baseada em **Modos de Operação (`ABS_MODE`)**:

1.  **Scanner Mode (`scanner`)**: 
    - Atua como um "Detector de Fumaça".
    - Avalia todas as políticas normalmente.
    - Se a decisão for `DENY`, registra a violação no log (para feedback), mas **não bloqueia** a execução (`ProcessResult` retorna `MONITOR`/`ALLOW`).
    - Alimenta o `Decision Envelope` com evidências.

2.  **Runtime Mode (`runtime`)**:
    - Atua como "Sistema de Sprinklers".
    - Avalia políticas e **bloqueia** efetivamente (`DENY` = 403 Forbidden).
    - Habilita features pagas (Filas, Escalation, Integrações avançadas).

## Consequências
- **Positivas**:
    - **Codebase Único**: Mesma lógica, apenas um *flag* muda o comportamento. Facilita manutenção e testes.
    - **Upsell Simples**: Cliente Free vira Paid apenas mudando uma variável de ambiente (e validando licença futuramente).
    - **Governança Gradual**: Permite adoção suave ("ligue em modo scanner primeiro, depois ative o runtime").
    
- **Negativas**:
    - **Risco de Configuração**: Um cliente pode rodar em modo `scanner` em produção achando que está protegido, quando na verdade está apenas monitorando. (Mitigação: Logs/Dashboards claros sobre o modo ativo).

## Implementação
- Variável `ABS_MODE` injetada via `factory.ts`.
- Lógica de supressão de `DENY` centralizada no `EventProcessor`.
- Metadados `scanner_override` nos logs para auditoria.
