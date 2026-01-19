# Modelo de Autonomia e Risco

O ABS Core não trata toda decisão igual. Utilizamos um modelo de **risco dinâmico** para determinar o nível de autonomia.

## Níveis de Risco (Risk Tiers)

Cada `DecisionProposal` ou `ActionType` carrega uma classificação de risco.

### 🟢 Low Risk (Autonomia Total)
*   **Ação**: Execução automática.
*   **Exemplos**: Enviar saudação, qualificar lead básico, responder FAQ, agendar reunião.
*   **Requisito de Policy**: Validação básica de estrutura.

### 🟡 Medium Risk (Autonomia Supervisionada / Batch)
*   **Ação**: Execução automática OU Aprovação em lote (depende da confiança do modelo).
*   **Exemplos**: Oferecer desconto pequeno (<5%), alterar prioridade de ticket, enviar proposta padrão.
*   **Requisito de Policy**: Verificação estrita de limites numéricos.

### 🔴 High Risk (Human-in-the-Loop Obrigatório)
*   **Ação**: Apenas gera proposta. Execução bloqueada até aprovação humana explícita.
*   **Exemplos**: Aprovar crédito, desconto agressivo (>10%), reembolso, banir usuário.
*   **Requisito de Policy**: Sempre retorna `escalate`.

## Degradação Automática (Circuit Breakers de Autonomia)

O sistema monitora métricas de saúde em tempo real. Se a saúde cai, a autonomia é revogada globalmente.

| Gatilho | Efeito |
|---|---|
| Taxa de erro de API > 5% | Pausa execuções automáticas |
| Confiança média do LLM < 0.7 | Transfere Low Risk -> Medium Risk |
| Violação de margem financeira | **KILL SWITCH**: Tudo vira High Risk (apenas humano aprova) |
| Detecção de Anomalia em Logs | Alerta DevOps + Modo "Audit Only" |

Isso garante que um "bug na IA" ou "alucinação em massa" não quebre o negócio enquanto ninguém está olhando.
