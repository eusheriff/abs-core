"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadLifecycleMachine = void 0;
const xstate_1 = require("xstate");
// Definition of the Lead Lifecycle Machine
exports.leadLifecycleMachine = (0, xstate_1.setup)({
    types: {
        context: {},
        events: {}
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
