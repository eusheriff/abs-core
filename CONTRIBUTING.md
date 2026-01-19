# Contributing to ABS Core

Obrigado pelo interesse em contribuir com o OConnector ABS Core!

Este projeto é um esforço para **definir o padrão técnico** da automação de negócios com *governança e responsabilidade*.

## 🚨 Princípios Imutáveis para Contribuições

Qualquer PR que viole estes princípios será rejeitado:

1.  **Separação Decisão vs. Execução**: Nunca misture lógica de "o que fazer" com "como fazer". O Decision Service propõe, o Policy Engine valida, o Action Gateway executa.
2.  **IA como Sugestão**: Modelos de IA (LLMs) nunca devem ter permissão de `execute` direto. Eles apenas geram `DecisionProposal`.
3.  **Auditabilidade**: Toda mudança de estado ou decisão deve produzir um `DecisionLog` ou `EventEnvelope`. Não existem "ações invisíveis".
4.  **Falha Segura**: Sistemas devem ser projetados para falhar de forma controlada (fail-safe) e não catastrófica. Kill-switches são obrigatórios.

## O que aceitamos?

- ✅ Correções e melhorias no core aberto (interfaces, schemas, stubs).
- ✅ Novos exemplos educacionais e demos (toy domains).
- ✅ Melhorias de documentação (tradução, clareza, diagramas).
- ✅ Discussões sobre arquitetura e especificações.

## O que NÃO aceitamos?

- ❌ Código de políticas comerciais reais (ex: regras reais de crédito de um banco).
- ❌ Heurísticas de negócio sensíveis.
- ❌ Integrações enterprise proprietárias (code proprietário).
- ❌ "Prompts mágicos" que tentam resolver governança via engenharia de prompt apenas.

## Processo de Pull Request

1.  **Issue First**: Abra uma issue discutindo a mudança antes de codar.
2.  **Fork & Branch**: Trabalhe em seu fork.
3.  **Testes e Docs**: Se mudar schema, atualize exemplos. Se mudar código, adicione testes.
4.  **Description**: Explique o impacto na governança.
5.  **Review**: Aguarde review do Core Team.

## Style Guide

- **Specs**: YAML + JSON Schema.
- **Docs**: Markdown (GitHub Flavored).
- **Architecture**: Mermaid JS para diagramas.
- **Code (Future)**: TypeScript, seguindo eslint/prettier do projeto.

---

*"Construa como se fosse operar o negócio crítico de alguém. Porque você vai."*
