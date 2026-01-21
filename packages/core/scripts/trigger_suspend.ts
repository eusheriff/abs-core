
import { EventProcessor } from '../src/core/processor';
import { LocalDBAdapter } from '../src/infra/db-local';
import { signer } from '../src/crypto/signer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Force Interactive Mode
process.env.ABS_INTERACTIVE = 'true';
process.env.ABS_SECRET_KEY = 'dev-secret-key';
process.env.DATABASE_URL = 'benchmark.db'; 
// Using benchmark.db or creating a temp one? 
// supervise CLI default uses `abs_core.db`? No, CLI commands/supervise.ts calls startServer...
// Wait, `startServer` uses `process.env.DATABASE_URL || 'abs_core.db'`.
// So I should match that.

async function main() {
    const dbPath = path.resolve('abs_core.db');
    signer.init('dev-secret-key');
    const db = new LocalDBAdapter(dbPath);
    await db.init();

    const processor = new EventProcessor(db, {
        llmProvider: 'mock',
        mode: 'runtime',
        interactive_mode: true // Explicitly set it too
    });

    console.log('⚡ Triggering Low Confidence Event (Should ESCALATE + SUSPEND)...');

    // Mock an event that the mock provider will return low confidence/escalate for?
    // Or just rely on PolicyRegistry logic?
    // Unnamed policy defaults to simple pass-through unless risk score is high.
    // I need a risk score between 30 and 79.
    // The processor logic:
    // if (decisionStr === 'ESCALATE') -> Suspend.
    
    // I can force ESCALATE if the mock provider returns it?
    // Mock Provider creates a random-ish response?
    // Actually `src/core/provider-factory.ts` defaults to MockLLM.
    // I don't recall MockLLM logic being controllable easily.

    // BUT `processor.ts` has:
    /*
        if (decisionScore >= 30) {
             if (decisionStr === 'ALLOW') { ... decisionStr = 'ESCALATE'; }
        }
    */
    // So if I can get risk score >= 30.
    
    // Mock provider usually returns low risk.
    // However, I can manually insert a suspended log directly into DB to simulate "Processor Just Did This".
    // That's more reliable for verifying the CLI "Pickup" logic.

    const decisionId = uuidv4();
    const eventId = uuidv4();
    
    const payload = {
        decision_id: decisionId,
        tenant_id: 'default',
        event_id: eventId,
        policy_name: 'manual_trigger',
        provider: 'script',
        decision: 'ESCALATE',
        risk_score: 45,
        execution_response: 'Suspended for Manual Review',
        full_log_json: JSON.stringify({
            policy_decision: 'ESCALATE',
            risk_score: 45,
            policy_trace: { computed_fields: { user: 'test_user', action: 'delete_prod_db' } }
        }),
        timestamp: new Date().toISOString(),
        signature: 'mock_sig'
    };

    await db.run(`
        INSERT INTO decision_logs (decision_id, tenant_id, event_id, policy_name, provider, decision, risk_score, execution_response, execution_status, full_log_json, timestamp, signature)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'suspended', ?, ?, ?)
    `, 
        payload.decision_id, payload.tenant_id, payload.event_id, payload.policy_name, payload.provider, payload.decision,
        payload.risk_score, payload.execution_response, payload.full_log_json, payload.timestamp, payload.signature
    );

    console.log(`✅ Inserted Suspended Task ID: ${decisionId}`);
    console.log('   Run `abs supervise` now to approve/reject it.');
}

main().catch(console.error);
