import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { leadLifecycleMachine } from './machine';

describe('Lead Lifecycle Machine', () => {
  it('should start in NEW state', () => {
    const actor = createActor(leadLifecycleMachine).start();
    expect(actor.getSnapshot().value).toBe('NEW');
  });

  it('should transition to QUALIFIED on lead.qualified event', () => {
    const actor = createActor(leadLifecycleMachine).start();
    actor.send({ type: 'lead.qualified', score: 85 });
    
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('QUALIFIED');
    expect(snapshot.context.score).toBe(85);
  });

  it('should escalate on policy.escalate event from any state', () => {
    const actor = createActor(leadLifecycleMachine).start();
    
    // Test from NEW
    actor.send({ type: 'policy.escalate' });
    expect(actor.getSnapshot().value).toBe('ESCALATED');
  });

  it('should complete the full happy path', () => {
    const actor = createActor(leadLifecycleMachine).start();
    
    actor.send({ type: 'lead.qualified', score: 90 });
    expect(actor.getSnapshot().value).toBe('QUALIFIED');

    actor.send({ type: 'message.sent' });
    expect(actor.getSnapshot().value).toBe('IN_CONTACT');

    actor.send({ type: 'proposal.generated' });
    expect(actor.getSnapshot().value).toBe('PROPOSAL_SENT');

    actor.send({ type: 'payment.confirmed' });
    expect(actor.getSnapshot().value).toBe('WON');
  });
});
