import { setup } from 'xstate';

// Definition of the Lead Lifecycle Machine
export const leadLifecycleMachine = setup({
  types: {
    context: {} as { leadId?: string; score?: number },
    events: {} as
      | { type: 'lead.qualified'; score: number }
      | { type: 'message.sent' }
      | { type: 'proposal.generated' }
      | { type: 'payment.confirmed' }
      | { type: 'customer.rejected' }
      | { type: 'policy.escalate' }
  },
}).createMachine({
  id: 'leadLifecycle',
  initial: 'NEW',
  context: {},
  states: {
    NEW: {
      on: {
        'lead.qualified': {
          target: 'QUALIFIED',
          actions: ({ context, event }) => {
            context.score = event.score;
          }
        }
      }
    },
    QUALIFIED: {
      on: {
        'message.sent': 'IN_CONTACT'
      }
    },
    IN_CONTACT: {
      on: {
        'proposal.generated': 'PROPOSAL_SENT'
      }
    },
    PROPOSAL_SENT: {
      on: {
        'payment.confirmed': 'WON',
        'customer.rejected': 'LOST'
      }
    },
    WON: {
      type: 'final'
    },
    LOST: {
      type: 'final'
    },
    ESCALATED: {
      type: 'final' // For MVP, escalated is a sink state
    }
  },
  on: {
    'policy.escalate': '.ESCALATED'
  }
});
