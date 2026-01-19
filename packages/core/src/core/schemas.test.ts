import { describe, it, expect } from 'vitest';
import { EventEnvelopeSchema } from './schemas';

describe('EventEnvelopeSchema', () => {
  it('should validate a correct event', () => {
    const validEvent = {
      event_id: '123e4567-e89b-12d3-a456-426614174000',
      event_type: 'lead.created',
      source: 'obot',
      tenant_id: 't1',
      correlation_id: 'c1',
      occurred_at: '2023-01-01T00:00:00Z',
      payload: { name: 'John' }
    };
    const result = EventEnvelopeSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('should fail on missing fields', () => {
    const invalidEvent = {
      event_type: 'lead.created'
    };
    const result = EventEnvelopeSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});
