# FAQ - Perguntas Frequentes

### P: O ABS Core substitui meus funcionários?
**R:** Não. Ele remove o trabalho robótico e repetitivo de seguir regras simples. Seus funcionários passam a atuar como "Gerentes de Políticas" e "Aprovadores de Exceções" (nível tático/estratégico), em vez de executores manuais (nível operacional).

### P: Posso usar qualquer LLM?
**R:** Sim. O `Decision Service` é agnóstico. Recomendamos modelos com bom raciocínio lógico (GPT-4, Claude 3.5 Sonnet) para a tarefa de recomendação, mas o output é validado por código determinístico depois.

### P: O que acontece se a IA alucinar e oferecer um produto de graça?
**R:** O `Policy Engine` pegará isso. Existirá uma regra `price > cost` ou `discount < max_allowed`. Como a regra é código determinístico (não IA), a alucinação será bloqueada com um status `DENY` e o cliente não receberá a oferta errada.

### P: Como integro com meu WhatsApp/Slack?
**R:** O ABS Core não conecta diretamente com usuários finais. Ele recebe eventos do **OBot** (ou outro canal). O OBot gerencia a conexão WhatsApp, recebe a mensagem, envia um evento para o ABS Core, e o ABS Core decide a resposta, devolvendo um comando para o OBot enviar.

### P: É seguro colocar dados financeiros aqui?
**R:** Sim, desde que usando as práticas recomendadas de `Action Gateway`. Nenhuma ação financeira deve ser `Low Risk`. Use sempre `High Risk` (aprovação humana) no início, e migre para regras automatizadas conforme ganha confiança.
