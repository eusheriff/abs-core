<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="License" />
  <img src="https://img.shields.io/badge/status-early--public--core-orange" alt="Status" />
</p>

# OConnector ABS Core

> **Autonomous Business Systems with Governed Decisions**

Infraestrutura aberta para sistemas de negócio autônomos com governança, auditabilidade e controle de risco.

---

## 🎯 O que é o ABS Core?

O ABS Core é a **fundação técnica** para construção de sistemas que automatizam processos de negócio (vendas, atendimento, pricing, cobrança) com **decisões autônomas**, mas com:

- **Governança explícita**: Políticas versionadas e auditáveis
- **Separação decisão/execução**: IA sugere, políticas validam, sistema executa
- **Auditoria completa**: Toda decisão é rastreável (quem, quando, por quê, com quais dados)
- **Autonomia graduada**: Decisões de alto risco exigem humano no loop
- **Degradação controlada**: Kill switches e fallbacks automáticos

## ⚠️ O que NÃO é

| ❌ NÃO é | ✅ É |
|----------|------|
| Um chatbot / framework de UI | Uma camada de decisão backend |
| Um auto-agent sem controle | Um sistema com governança explícita |
| Uma plataforma de RPA | Uma arquitetura event-driven para processos |
| Produto pronto para produção | Especificação + implementação de referência |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CANAIS (OBot, CRM, etc)                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ Eventos
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        EVENT INGESTION                              │
│            Valida, normaliza, publica Event Envelope                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PROCESS ORCHESTRATOR                           │
│         State Machine + Saga • Carrega estado • Orquestra fluxo     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│    DECISION SERVICE      │    │      STATE STORE         │
│  Contexto + RAG + LLM    │    │   Persistência + Replay  │
│  → DecisionProposal      │    └──────────────────────────┘
└────────────┬─────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        POLICY ENGINE                                │
│     Regras explícitas • allow | deny | escalate • Policy Trace      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  ACTION GATEWAY  │  │ HUMAN-IN-THE-LOOP│  │   AUDIT LOGGER   │
│  Executa ações   │  │  Fila de aprovação│  │  Decision Logs   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 📦 Estrutura do Repositório

```
oconnector-abs-core/
├── docs/                    # Documentação conceitual
│   ├── vision.md            # Visão de longo prazo
│   ├── architecture.md      # Arquitetura detalhada
│   ├── governance.md        # Modelo de governança do projeto
│   ├── autonomy-model.md    # Níveis de risco e autonomia
│   └── faq.md               # Perguntas frequentes
├── specs/                   # Especificações formais (YAML)
│   ├── event-envelope.yaml
│   ├── decision-proposal.yaml
│   ├── policy-decision.yaml
│   └── decision-log.yaml
├── contracts/               # Contratos de API e domínio
│   ├── events/              # Eventos por domínio
│   ├── processes/           # State machines
│   ├── decisions/           # Tipos de decisão
│   └── policies/            # Estruturas de políticas
├── core/                    # Implementação de referência (stubs)
├── examples/                # Exemplos educacionais
│   └── lead_qualification_demo/
└── roadmap/                 # Evolução pública
```

---

## 🚀 Quick Start

Este repositório é uma **especificação + referência**, não um pacote instalável.

### 1. Entenda os conceitos

- Leia [docs/vision.md](docs/vision.md) para a motivação
- Leia [docs/architecture.md](docs/architecture.md) para a arquitetura
- Leia [docs/autonomy-model.md](docs/autonomy-model.md) para níveis de risco

### 2. Explore as especificações

```bash
# Veja os schemas
cat specs/event-envelope.yaml
cat specs/decision-proposal.yaml
cat specs/decision-log.yaml
```

### 3. Veja um exemplo

```bash
# Fluxo completo de Lead Qualification
ls examples/lead_qualification_demo/
```

---

## 📜 Princípios Fundamentais

1. **IA nunca executa ações diretamente** — IA apenas sugere, o sistema valida e executa
2. **Decisão separada de execução** — DecisionProposal → PolicyDecision → Action
3. **Tudo é auditável** — Decision Logs imutáveis com contexto completo
4. **Governança é requisito** — Não é opcional, não é pós-trabalho
5. **Autonomia graduada** — Risco alto = humano obrigatório
6. **Falhas controladas** — Kill switches e degradação automática

---

## 🤝 Contribuindo

Leia [CONTRIBUTING.md](CONTRIBUTING.md) para entender:
- Princípios obrigatórios para contribuições
- O que é aceito e o que não é
- Processo de review

---

## 📄 Licença

Este projeto está licenciado sob [Apache License 2.0](LICENSE).

O core aberto define contratos, interfaces e arquitetura. Componentes operacionais avançados (policy packs, conectores enterprise, dashboards) são mantidos em repositórios comerciais separados.

---

## 🏢 Mantido por

**OConnector Technology**

*"Autonomia sem governança é risco. ABS Core é sobre confiança em escala."*
