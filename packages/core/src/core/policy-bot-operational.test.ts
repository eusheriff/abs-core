import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BotOperationalPolicy, DecisionEnvelope } from './policy-bot-operational';

describe('BotOperationalPolicy', () => {
  let policy: BotOperationalPolicy;

  beforeEach(() => {
    policy = new BotOperationalPolicy();
  });

  const createEnvelope = (overrides: Partial<DecisionEnvelope> = {}): DecisionEnvelope => ({
    id: 'test-id',
    timestamp: new Date().toISOString(),
    environment: 'runtime',
    actor: {
      type: 'bot',
      name: 'TestBot',
      channel: 'whatsapp'
    },
    intent: 'test_action',
    proposal: {
      action: 'send_message',
      parameters: {}
    },
    context: {
      lead_id: 'lead_123',
      conversation_id: 'conv_456',
      confidence: 0.85,
      signals: ['signal_1', 'signal_2']
    },
    risk_level: 'low',
    ...overrides
  });

  describe('P-01: Ação Fora de Horário', () => {
    it('should handoff outside business hours', () => {
      // Mock date to 3am
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T03:00:00'));
      
      const envelope = createEnvelope();
      const result = policy.evaluateEnvelope(envelope);
      
      expect(result.outcome).toBe('handoff');
      expect(result.policy_id).toBe('P-01');
      
      vi.useRealTimers();
    });

    it('should allow during business hours', () => {
      // Mock date to 10am
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T10:00:00'));
      
      const envelope = createEnvelope();
      const result = policy.evaluateEnvelope(envelope);
      
      expect(result.outcome).toBe('allow');
      
      vi.useRealTimers();
    });
  });

  describe('P-02: Promessa Comercial', () => {
    it('should handoff on discount promise', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T10:00:00'));
      
      const envelope = createEnvelope({
        context: {
          confidence: 0.9,
          signals: ['interest'],
          message_content: 'posso verificar um desconto para você'
        }
      });
      
      const result = policy.evaluateEnvelope(envelope);
      
      expect(result.outcome).toBe('handoff');
      expect(result.policy_id).toBe('P-02');
      
      vi.useRealTimers();
    });

    it('should handoff on reservation promise', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T10:00:00'));
      
      const envelope = createEnvelope({
        context: {
          confidence: 0.9,
          signals: ['interest'],
          message_content: 'vou reservar para você'
        }
      });
      
      const result = policy.evaluateEnvelope(envelope);
      
      expect(result.outcome).toBe('handoff');
      expect(result.policy_id).toBe('P-02');
      
      vi.useRealTimers();
    });
  });

  describe('P-03: Baixa Confiança', () => {
    it('should deny on low confidence', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T10:00:00'));
      
      const envelope = createEnvelope({
        context: {
          confidence: 0.5,
          signals: ['signal']
        }
      });
      
      const result = policy.evaluateEnvelope(envelope);
      
      expect(result.outcome).toBe('deny');
      expect(result.policy_id).toBe('P-03');
      
      vi.useRealTimers();
    });

    it('should deny on undefined confidence', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T10:00:00'));
      
      const envelope = createEnvelope({
        context: {
          signals: ['signal']
          // confidence not defined
        }
      });
      
      const result = policy.evaluateEnvelope(envelope);
      
      expect(result.outcome).toBe('deny');
      expect(result.policy_id).toBe('P-03');
      
      vi.useRealTimers();
    });
  });

  describe('P-04: Escalada de Lead', () => {
    it('should allow escalation with enough signals', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T10:00:00'));
      
      const envelope = createEnvelope({
        intent: 'escalar_humano',
        proposal: {
          action: 'handoff_to_human',
          parameters: {}
        },
        context: {
          confidence: 0.85,
          signals: ['mencionou financiamento', 'perguntou sobre entrada']
        }
      });
      
      const result = policy.evaluateEnvelope(envelope);
      
      expect(result.outcome).toBe('allow');
      expect(result.policy_id).toBe('P-04');
      
      vi.useRealTimers();
    });

    it('should deny escalation without enough signals', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T10:00:00'));
      
      const envelope = createEnvelope({
        intent: 'escalar_humano',
        proposal: {
          action: 'handoff_to_human',
          parameters: {}
        },
        context: {
          confidence: 0.85,
          signals: ['apenas um sinal']
        }
      });
      
      const result = policy.evaluateEnvelope(envelope);
      
      expect(result.outcome).toBe('deny');
      expect(result.policy_id).toBe('P-04');
      
      vi.useRealTimers();
    });
  });

  describe('P-05: Repetição de Ação', () => {
    it('should deny repeated action within cooldown', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-19T10:00:00'));
      
      const envelope = createEnvelope({
        context: {
          confidence: 0.85,
          conversation_id: 'same_conv',
          signals: ['s1', 's2']
        }
      });
      
      // First call should pass
      const result1 = policy.evaluateEnvelope(envelope);
      expect(result1.outcome).toBe('allow');
      
      // Second call should be denied
      const result2 = policy.evaluateEnvelope(envelope);
      expect(result2.outcome).toBe('deny');
      expect(result2.policy_id).toBe('P-05');
      
      vi.useRealTimers();
    });
  });
});
