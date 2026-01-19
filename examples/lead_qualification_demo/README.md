# Exemplo: Lead Qualification (Demo)

Este diretório contém artefatos de exemplo (JSON/YAML) demonstrando como o ABS Core processa um ciclo completo de venda.

## Cenário

1.  **Lead Created**: OBot recebe "Olá, gostaria de saber sobre a consultoria".
2.  **Qualification**: ABS decide responder perguntando tamanho da empresa.
3.  **Proposal**: Cliente responde "Somos 500 funcionários". ABS propõe plano Enterprise.
4.  **Policy Check**: Preço requer aprovação? Não (Low Risk).
5.  **Execution**: OBot envia proposta.

## Conteúdo

*   `events/`: Payloads dos eventos de entrada.
*   `decisions/`: O que o Decision Service (LLM) propôs.
*   `logs/`: O Decision Log final gerado.
