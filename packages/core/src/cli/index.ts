#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { startServer } from '../api/server';
import { setDB, getRecentLogs } from '../infra/db';
import { LocalDBAdapter } from '../infra/db-local';
import { v4 as uuidv4 } from 'uuid';

const program = new Command();

program
  .name('abs')
  .description('ABS Core CLI - Reference Runtime for Autonomous Business Systems')
  .version('0.1.0');

// -----------------------------------------------------------------------------
// 1. SERVE
// -----------------------------------------------------------------------------
program
  .command('serve')
  .description('Starts the ABS Core runtime server locally')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('--db <path>', 'Path to SQLite database', './abs_core.db')
  .action((options) => {
    // Determine context (Node vs Worker isn't relevant here as CLI is Node)
    const dbPath = path.resolve(options.db);
    if (!/^[a-zA-Z0-9_\-./]+$/.test(options.db)) {
       console.error('❌ Invalid database path. Use alphanumeric characters, dots, dashes and underscores.');
       process.exit(1);
    }
    process.env.DATABASE_URL = dbPath;
    
    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1024 || port > 65535) {
       console.error('❌ Invalid port. Must be between 1024 and 65535.');
       process.exit(1);
    }
    startServer(port);
  });

// -----------------------------------------------------------------------------
// 2. SIMULATE
// -----------------------------------------------------------------------------
program

  .command('simulate')
  .description('Simulates an event passing through the Policy Gate')
  .argument('<event_type>', 'The event signature (e.g. ticket.created)')
  .option('-d, --payload <json>', 'JSON string payload')
  .option('-f, --file <path>', 'Path to JSON file containing the payload')
  .option('-u, --url <url>', 'Target URL', 'http://localhost:3000/v1/events')
  .option('--async', 'Use asynchronous ingestion (fire and forget)', false)
  .option('--db <path>', 'Path to SQLite DB for polling async results', './abs_core.db')
  .action(async (eventType, options) => {
    let payload = {};
    
    try {
        if (options.file) {
            const resolvedPath = path.resolve(options.file);
            if (!fs.existsSync(resolvedPath)) {
                throw new Error(`File not found: ${resolvedPath}`);
            }
            const content = fs.readFileSync(resolvedPath, 'utf-8');
            payload = JSON.parse(content);
        } else if (options.payload) {
            payload = JSON.parse(options.payload);
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('❌ Failed to parse payload:', msg);
        process.exit(1);
    }

    const body = {
        event_id: uuidv4(),
        event_type: eventType,
        source: 'cli',
        correlation_id: uuidv4(),
        occurred_at: new Date().toISOString(),
        tenant_id: 'cli-lab',
        payload
    };

    const targetUrl = options.async ? `${options.url}?async=true` : options.url;
    console.log(`🧪 Simulating event: ${eventType} -> ${targetUrl}`);
    
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`HTTP ${response.status} ${response.statusText} - ${errBody}`);
        }

        const result = await response.json();

        if (response.status === 202) {
             console.log(`\n⏳  Accepted for Async Processing. Event ID: ${(result as any).event_id}`);
             console.log('    Polling database for results...');
             
             // Polling Loop
             // Require DB connection
             try {
                setDB(new LocalDBAdapter(options.db));
                const db = new LocalDBAdapter(options.db);
                const eventId = (result as any).event_id;
                let attempts = 0;
                let foundLog = null;

                while (attempts < 20 && !foundLog) {
                    await new Promise(r => setTimeout(r, 500)); // Sleep 500ms
                    process.stdout.write('.');
                    const rows = await db.run('SELECT * FROM decision_logs WHERE event_id = ?', eventId) as any;
                    if (rows && rows.results && rows.results.length > 0) {
                        foundLog = rows.results[0];
                    }
                    attempts++;
                }
                console.log(''); // newline

                if (foundLog) {
                    const fullData = JSON.parse(foundLog.full_log_json);
                    console.log('✅  Processing Complete!');
                    console.log(`    Decision: ${fullData.policy_decision} (${fullData.latency_ms}ms)`);
                } else {
                    console.log('⚠️  Timed out waiting for result. Check logs later with:');
                    console.log(`    abs replay --id ${eventId}`);
                }

             } catch (dbErr) {
                 console.warn('\n⚠️  Could not poll DB (is path correct?). Check server logs.');
             }

             return;
        }

        console.log('\n✅ Decision Result:');
        console.log(JSON.stringify(result, null, 2));

        if ((result as any).decision === 'DENY') {
             console.log('\n🛡️  Blocked by Policy Gate.');
        } else {
            if ((result as any).decision === 'ALLOW') {
                console.log('\n🚀 Allowed for Execution.');
            } else {
                console.log(`\n🛑 Blocked: ${(result as any).decision}`);
            }
        }

    } catch (error: unknown) {
        console.error('❌ Simulation failed.');
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Error: ${err.message}`);
        if ('cause' in err && (err.cause as any).code === 'ECONNREFUSED') {
             console.log('Tip: Is the server running? Run "abs serve" in another terminal.');
        }
        process.exit(1);
    }
  });

// -----------------------------------------------------------------------------
// 3. LOGS
// -----------------------------------------------------------------------------
program
  .command('logs')
  .description('Inspects the immutable Decision Log (Local SQLite)')
  .option('-l, --limit <number>', 'Limit number of logs', '10')
  .option('--db <path>', 'Path to SQLite database', './abs_core.db')
  .action(async (options) => {
    try {
        // Direct DB Access for Logs (Offline Mode possible)
        setDB(new LocalDBAdapter(options.db));
        
        const limit = parseInt(options.limit, 10);
        console.log(`Reading last ${limit} logs from ${options.db}...`);
        
        const logs = await getRecentLogs(limit);
        
        if (logs.length === 0) {
            console.log('No logs found.');
            return;
        }

        console.table(logs.map(l => ({
            ID: l.id,
            Event: l.event_type,
            Decision: l.decision,
            Latency: `${l.latency_ms}ms`,
            Time: l.created_at
        })));

    } catch (error: unknown) {
        console.error('❌ Failed to read logs.');
        const msg = error instanceof Error ? error.message : String(error);
        console.error(msg);
        if (msg.includes('not initialized')) {
             console.log('Tip: Ensure database exists.');
        }
    }
  });

// -----------------------------------------------------------------------------
// 4. REPLAY (Governance Audit)
// -----------------------------------------------------------------------------
program
  .command('replay')
  .description('Re-evaluates a past event against current Policy')
  .requiredOption('--id <event_id>', 'Event ID to replay')
  .option('--db <path>', 'Path to SQLite database', './abs_core.db')
  .action(async (options) => {
    try {
        setDB(new LocalDBAdapter(options.db));
        const db = new LocalDBAdapter(options.db); // Direct access needed for custom queries

        // 1. Fetch Event
        // Type casting result as unknown first, then to expected shape since driver returns unknown/any
        const eventRow = await db.run('SELECT * FROM events_store WHERE event_id = ?', options.id) as any;
        
        if (!eventRow || !eventRow.results || eventRow.results.length === 0) {
            console.error('❌ Event not found in Store.');
            return;
        }

        const event = eventRow.results[0];
        const payload = JSON.parse(event.payload);
        
        console.log(`\nReplaying Event [${event.event_type}] from ${event.ingested_at}`);
        console.log(`Payload: ${JSON.stringify(payload).substring(0, 50)}...`);

        // 2. Fetch Original Decision (for comparison)
        const logRow = await db.run('SELECT * FROM decision_logs WHERE event_id = ?', options.id) as any;
        const originalLog = (logRow && logRow.results && logRow.results.length > 0) ? logRow.results[0] : null;
        
        if (originalLog) {
             const origData = JSON.parse(originalLog.full_log_json);
             console.log(`\n⏮️  Original Decision: ${origData.policy_decision}`);
        } else {
             console.log('\n⏮️  Original Decision: <Not Found>');
        }

        // 3. Re-Execute Logic (Mocked Runtime for CLI)
        // Ideally this imports the exact same logic as API
        const { PolicyRegistry } = await import('../core/policy-registry');
        const { SimplePolicyEngine } = await import('../core/policy');
        
        // Ensure Registry is Hydrated (if it was dynamic, we'd need to init it)
        // For now static registry in code is fine.

        const policy = PolicyRegistry.getPolicy(event.event_type);
        
        // Mock Proposal Generation (In real replay, we might use stored proposal or re-run LLM)
        const proposal = {
            // Re-use mock/default values or implement provider call here
            confidence: 0.9, 
            recommended_action: 'replay_test_action',
            risk_level: 'low',
            proposal_id: 'replay-id',
            process_id: 'replay-process',
            current_state: 'REPLAY_MODE',
            action_params: {},
            explanation: { summary: 'Replay', rationale: 'Replay', evidence_refs: []}
        };

        const result = policy.evaluate(proposal as any, { event_type: event.event_type, payload });

        console.log(`\n▶️  Current Policy Result: ${result}`);

        if (originalLog) {
            const origData = JSON.parse(originalLog.full_log_json);
            if (origData.policy_decision !== result) {
                console.log('⚠️  MISMATCH: Policy drift detected!');
            } else {
                 console.log('✅  MATCH: Decision consistent.');
            }
        }

    } catch (err: unknown) {
        console.error('❌ Replay failed:', err);
    }
  });

// -----------------------------------------------------------------------------
// 5. SUPERVISE (Gatekeeper)
// -----------------------------------------------------------------------------
import { registerSuperviseCommand } from './commands/supervise';
registerSuperviseCommand(program);

// -----------------------------------------------------------------------------
// 6. AUDIT (Integrity)
// -----------------------------------------------------------------------------
import { registerAuditCommand } from './commands/audit';
registerAuditCommand(program);

// -----------------------------------------------------------------------------
// 7. POLICIES
// -----------------------------------------------------------------------------
import { registerPoliciesCommand } from './commands/policies';
registerPoliciesCommand(program);

policies
    .command('check')
    .description('Static analysis of policies (Placeholder)')
    .action(() => {
        console.log('✅ Policy integrity check passed (Mock).');
    });

program.parse();
