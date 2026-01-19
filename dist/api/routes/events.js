"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const hono_1 = require("hono");
const uuid_1 = require("uuid");
const schemas_1 = require("../../core/schemas");
const db_1 = require("../../infra/db");
const openai_1 = require("../../infra/openai");
const gemini_1 = require("../../infra/gemini");
const mock_1 = require("../../infra/mock");
const machine_1 = require("../../core/machine");
const xstate_1 = require("xstate");
const events = new hono_1.Hono();
exports.eventsRouter = events;
// Provider Factory (Lazy)
let providerInstance; // Type generic to avoid import cycles or complex types for now
const getProvider = () => {
    if (providerInstance)
        return providerInstance;
    // process.env is polyfilled in worker.ts entrypoint for Cloudflare
    // In Node.js it works natively.
    const type = process.env.LLM_PROVIDER || 'mock';
    if (type === 'gemini') {
        const keys = (process.env.GEMINI_KEYS || process.env.GEMINI_API_KEY || '').split(',').filter(Boolean);
        console.log('🤖 Using Gemini Provider (Multi-Key Support)');
        return (providerInstance = new gemini_1.GeminiDecisionProvider(keys));
    }
    if (type === 'openai') {
        console.log('🤖 Using OpenAI Provider');
        return (providerInstance = new openai_1.OpenAIDecisionProvider(process.env.OPENAI_API_KEY || 'sk-placeholder'));
    }
    console.log('⚠️ Using Mock Decision Provider');
    return (providerInstance = new mock_1.MockDecisionProvider());
};
events.post('/', async (c) => {
    try {
        const rawBody = await c.req.json();
        // 1. Validate Input (Schema Enforcement)
        const validation = schemas_1.EventEnvelopeSchema.safeParse(rawBody);
        if (!validation.success) {
            return c.json({ error: 'Invalid Event Envelope', details: validation.error.format() }, 400);
        }
        const event = validation.data;
        const db = (0, db_1.getDB)();
        console.log(`📥 Received Event: ${event.event_type} [${event.event_id}]`);
        // 2. Load Process State (Mocked logic for MVP: always start fresh machine or load generic)
        // In production, we would SELECT * FROM process_instances WHERE correlation_id = event.correlation_id
        // Here we just instantiate a new machine for demonstration
        const actor = (0, xstate_1.createActor)(machine_1.leadLifecycleMachine);
        actor.start();
        const currentState = actor.getSnapshot().value.toString();
        // 3. Decision Phase (LLM)
        // Only ask LLM if we are not in a final state
        let proposal = null;
        if (currentState !== 'WON' && currentState !== 'LOST') {
            const provider = getProvider();
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
            decision_id: (0, uuid_1.v4)(),
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
        await db.run(`
        INSERT INTO decision_logs (decision_id, tenant_id, event_id, correlation_id, timestamp, full_log_json)
        VALUES (?, ?, ?, ?, ?, ?)
    `, logEntry.decision_id, logEntry.tenant_id, logEntry.event_id, logEntry.correlation_id, logEntry.timestamp, logEntry.full_log_json);
        // 6. Response
        return c.json({
            status: 'accepted',
            correlation_id: event.correlation_id,
            decision_id: logEntry.decision_id,
            computed_proposal: proposal
        }, 202);
    }
    catch (err) {
        console.error(err);
        return c.json({ error: 'Internal Server Error', message: err.message }, 500);
    }
});
