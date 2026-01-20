/**
 * ABS Core - Bot Integration Example
 * 
 * This example shows how to integrate ABS Core into a WhatsApp bot
 * to govern decisions before execution.
 */

import { evaluateAndLog, createEnvelope, DecisionEnvelope, PolicyDecisionResult } from '../core/sdk';

// =============================================================================
// EXAMPLE 1: Simple Lead Escalation
// =============================================================================

async function handleLeadMessage(leadId: string, message: string) {
  // Build the envelope
  const envelope = createEnvelope({
    botName: 'NetCarBot',
    channel: 'whatsapp',
    intent: 'escalar_humano',
    action: 'handoff_to_human',
    leadId,
    conversationId: `conv_${leadId}`,
    confidence: 0.85,
    signals: ['mencionou financiamento', 'perguntou sobre entrada'],
    messageContent: message,
    riskLevel: 'medium'
  });

  // Evaluate with ABS Core
  const decision = evaluateAndLog(envelope);

  // Act based on decision
  switch (decision.outcome) {
    case 'allow':
      console.log('✅ Transferindo para atendente humano...');
      // await transferToHuman(leadId);
      break;
    
    case 'handoff':
      console.log('⚠️ Decisão requer revisão humana:', decision.reason);
      // await notifyManager(leadId, decision);
      break;
    
    case 'deny':
      console.log('❌ Ação bloqueada:', decision.reason);
      // Log and continue without action
      break;
  }
}

// =============================================================================
// EXAMPLE 2: Automatic Follow-up (with time and repetition checks)
// =============================================================================

async function handleFollowUp(leadId: string, conversationId: string) {
  const envelope = createEnvelope({
    botName: 'NetCarBot',
    channel: 'whatsapp',
    intent: 'enviar_followup',
    action: 'send_message',
    actionParams: {
      template: 'followup_interest',
      message: 'Olá! Vi que você demonstrou interesse em nossos veículos...'
    },
    leadId,
    conversationId,
    confidence: 0.90,
    signals: ['visitou_site', 'abriu_email'],
    riskLevel: 'low'
  });

  const decision = evaluateAndLog(envelope);

  if (decision.outcome === 'allow') {
    console.log('✅ Enviando follow-up...');
    // await sendFollowUpMessage(leadId);
  } else {
    console.log(`⏸️ Follow-up bloqueado: ${decision.reason}`);
  }
}

// =============================================================================
// EXAMPLE 3: Commercial Promise Detection
// =============================================================================

async function handleBotResponse(leadId: string, botResponseText: string) {
  const envelope = createEnvelope({
    botName: 'NetCarBot',
    channel: 'whatsapp',
    intent: 'responder_cliente',
    action: 'send_message',
    actionParams: {
      message: botResponseText
    },
    leadId,
    conversationId: `conv_${leadId}`,
    confidence: 0.95,
    signals: [],
    messageContent: botResponseText, // ABS will detect commercial promises here
    riskLevel: 'medium'
  });

  const decision = evaluateAndLog(envelope);

  if (decision.outcome === 'allow') {
    console.log('✅ Enviando resposta...');
    // await sendMessage(leadId, botResponseText);
  } else if (decision.outcome === 'handoff') {
    console.log('⚠️ Resposta contém promessa comercial. Transferindo para humano...');
    // await transferToHuman(leadId);
  }
}

// =============================================================================
// EXAMPLE 4: Real-world Integration Pattern
// =============================================================================

/**
 * Wrapper function for any bot action
 * This is the recommended pattern for integrating ABS Core
 */
async function governedAction<T>(
  envelope: DecisionEnvelope,
  onAllow: () => Promise<T>,
  onHandoff?: () => Promise<void>,
  onDeny?: () => Promise<void>
): Promise<T | null> {
  const decision = evaluateAndLog(envelope);

  switch (decision.outcome) {
    case 'allow':
      return await onAllow();
    
    case 'handoff':
      if (onHandoff) {
        await onHandoff();
      }
      return null;
    
    case 'deny':
      if (onDeny) {
        await onDeny();
      }
      return null;
  }
}

// Usage:
async function exampleUsage() {
  const result = await governedAction(
    createEnvelope({
      botName: 'NetCarBot',
      channel: 'whatsapp',
      intent: 'qualificar_lead',
      action: 'update_lead_status',
      actionParams: { status: 'qualified' },
      leadId: 'lead_123',
      confidence: 0.88,
      signals: ['agendou_visita'],
      riskLevel: 'medium'
    }),
    // onAllow
    async () => {
      console.log('Atualizando status do lead...');
      return { success: true };
    },
    // onHandoff
    async () => {
      console.log('Notificando gerente para revisão...');
    },
    // onDeny
    async () => {
      console.log('Ação negada, logando para auditoria...');
    }
  );

  console.log('Resultado:', result);
}

// Run examples (for testing)
console.log('=== ABS Core Integration Examples ===\n');

console.log('Example 1: Lead Escalation');
handleLeadMessage('lead_001', 'Quero saber sobre financiamento');

console.log('\nExample 2: Follow-up');
handleFollowUp('lead_002', 'conv_002');

console.log('\nExample 3: Commercial Promise Detection');
handleBotResponse('lead_003', 'Posso verificar um desconto especial para você');

console.log('\nExample 4: Governed Action Pattern');
exampleUsage();
