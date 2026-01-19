# STATE.md — OConnector ABS Core

> Fonte da verdade para continuidade entre sessões e LLMs.

## Projeto

| Campo          | Valor                                           |
| -------------- | ----------------------------------------------- |
| **Nome**       | oconnector-abs-core                             |
| **Estratégia** | Open Core (Apache-2.0 + componentes comerciais) |
| **Estágio**    | early-public-core                               |
| **Maintainer** | OConnector Technology                           |
| **Autor**      | Rodrigo Gomes                                   |
| **Início**     | 2026-01-19                                      |

## Visão

Definir o padrão técnico aberto para construção de Autonomous Business Systems (ABS), separando decisão de execução, com governança, auditabilidade e controle de risco.

## Princípios Imutáveis

1. IA nunca executa ações diretamente
2. Canal (OBot) nunca decide; ABS Core decide
3. Decisão sempre separada de execução
4. Tudo é auditável
5. Governança é requisito, não opcional
6. Autonomia é graduada por risco e degradável automaticamente

## Estado Atual

- **Fase**: Planejamento v0.1
- **Status**: Criando estrutura inicial do repositório
- **Bloqueios**: Nenhum

## Roadmap

| Versão | Goal                                     | Status          |
| ------ | ---------------------------------------- | --------------- |
| v0.1   | Publicar especificações e contratos base | 🔄 Em andamento |
| v0.2   | Framework mínimo de orquestração         | ⏳ Planejado    |
| v1.0   | Padrão de mercado para ABS Core          | ⏳ Planejado    |

## Próximos Passos

1. [ ] Criar estrutura de diretórios do repositório
2. [ ] Criar README.md, LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md
3. [ ] Criar specs: event-envelope.yaml, decision-proposal.yaml, policy-decision.yaml, decision-log.yaml
4. [ ] Criar documentação conceitual (vision.md, architecture.md, governance.md)
5. [ ] Criar exemplos educacionais mínimos

## Decisões Fixas

- Licença: Apache-2.0 para core aberto
- Modelo de governança: BDFL (OConnector Technology)
- Stack de specs: YAML + JSON Schema
- Documentação: Markdown
