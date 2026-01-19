import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { EventEnvelopeSchema } from '../../core/schemas';
import { getDB } from '../../infra/db';
import { OpenAIDecisionProvider, DecisionProvider } from '../../infra/openai';
import { GeminiDecisionProvider } from '../../infra/gemini';
import { leadLifecycleMachine } from '../../core/machine';
import { createActor } from 'xstate';

const events = new Hono();

// Provider Factory
const getProvider = (): DecisionProvider => {
  if (process.env.LLM_PROVIDER === 'gemini') {
    console.log('🤖 Using Gemini Provider');
    return new GeminiDecisionProvider(process.env.GEMINI_API_KEY || '');
  }
  console.log('🤖 Using OpenAI Provider');
  return new OpenAIDecisionProvider(process.env.OPENAI_API_KEY || 'sk-placeholder');
};

const provider = getProvider();

events.post('/', async (c) => {
  try {
    const rawBody = await c.req.json();
    
    // 1. Validate Input (Schema Enforcement)
    const validation = EventEnvelopeSchema.safeParse(rawBody);
    if (!validation.success) {
      return c.json({ error: 'Invalid Event Envelope', details: validation.error.format() }, 400);
    }
    
    const event = validation.data;
    const db = getDB();

    console.log(`📥 Received Event: ${event.event_type} [${event.event_id}]`);

    // 2. Load Process State (Mocked logic for MVP: always start fresh machine or load generic)
    // In production, we would SELECT * FROM process_instances WHERE correlation_id = event.correlation_id
    // Here we just instantiate a new machine for demonstration
    const actor = createActor(leadLifecycleMachine);
    actor.start();
    const currentState = actor.getSnapshot().value.toString();

    // 3. Decision Phase (LLM)
    // Only ask LLM if we are not in a final state
    let proposal = null;
    if (currentState !== 'WON' && currentState !== 'LOST') {
       proposal = await provider.propose(event.payload, currentState);
    }

    // 4. Policy Check (Mocked for v0.3: Always Allow)
    // In production: PolicyEngine.evaluate(proposal)
    const policyDecision = {
        policy_decision: 'allow',
        execution_result: 'success' 
    };

    // 5. Persist Log (The "Audit Trail")
    const logEntry = {
        decision_id: uuidv4(),
        tenant_id: event.tenant_id,
        event_id: event.event_id,
        correlation_id: event.correlation_id,
        timestamp: new Date().toISOString(),
        full_log_json: JSON.stringify({
            event,
            state_before: currentState,
            proposal,
            policy: policyDecision
        })
    };

    const stmt = db.prepare(`
        INSERT INTO decision_logs (decision_id, tenant_id, event_id, correlation_id, timestamp, full_log_json)
        VALUES (@decision_id, @tenant_id, @event_id, @correlation_id, @timestamp, @full_log_json)
    `);
    
    stmt.run(logEntry);

    // 6. Response
    return c.json({
        status: 'accepted',
        correlation_id: event.correlation_id,
        decision_id: logEntry.decision_id,
        computed_proposal: proposal
    }, 202);

  } catch (err: any) {
    console.error(err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
  }
});

export { events as eventsRouter };
