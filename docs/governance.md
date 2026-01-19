# Governança e Contribuição

O projeto `oconnector-abs-core` opera sob um modelo **Open Core**.

## Modelo de Governança

Utilizamos o modelo **BDFL (Benevolent Dictator For Life)** para manter a coerência da visão técnica.
*   **Maintainer Principal**: OConnector Technology
*   **Responsabilidade**: Garantir que o core permaneça focado, seguro e alinhado aos princípios de governança.

Não buscamos consenso comunitário para decisões arquiteturais core, mas encorajamos feedback e propostas via Issues/RFCs.

## Divisão Open vs Closed

Entendemos clareza como fundamental para a confiança.

| Camada | Status | Descrição | Licença |
|---|---|---|---|
| **Core Specs** | ✅ Open | Contratos, interfaces, schemas de dados | Apache 2.0 |
| **Basic Runtime** | ✅ Open | Stubs, orquestrador simples, exemplos | Apache 2.0 |
| **Enterprise Policies** | 🔒 Closed | Packs de regras financeiras, jurídicas, setoriais | Commercial |
| **Enterprise Connectors** | 🔒 Closed | Integrações SAP, Salesforce, Legacy Banking | Commercial |
| **Advanced Operations** | 🔒 Closed | Dashboards de KPIs econômicos, SLA | Commercial |

## Contribuições Externas

Aceitamos contribuições que:
1.  Melhorem a robustez e performance do Core.
2.  Clarifiquem documentação e especificações.
3.  Adicionem adaptadores para tecnologias open-source (ex: suporte a RabbitMQ, Postgres).

Não aceitamos contribuições que:
1.  Injete lógica de negócio proprietária no core genérico.
2.  Remova mecanismos de segurança ou auditoria.
