#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const server_1 = require("../api/server");
const db_1 = require("../infra/db");
const db_local_1 = require("../infra/db-local");
const uuid_1 = require("uuid");
const program = new commander_1.Command();
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
    const dbPath = path_1.default.resolve(options.db);
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
    (0, server_1.startServer)(port);
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
            const resolvedPath = path_1.default.resolve(options.file);
            if (!fs_1.default.existsSync(resolvedPath)) {
                throw new Error(`File not found: ${resolvedPath}`);
            }
            const content = fs_1.default.readFileSync(resolvedPath, 'utf-8');
            payload = JSON.parse(content);
        }
        else if (options.payload) {
            payload = JSON.parse(options.payload);
        }
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('❌ Failed to parse payload:', msg);
        process.exit(1);
    }
    const body = {
        event_id: (0, uuid_1.v4)(),
        event_type: eventType,
        source: 'cli',
        correlation_id: (0, uuid_1.v4)(),
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
            console.log(`\n⏳  Accepted for Async Processing. Event ID: ${result.event_id}`);
            console.log('    Polling database for results...');
            // Polling Loop
            // Require DB connection
            try {
                (0, db_1.setDB)(new db_local_1.LocalDBAdapter(options.db));
                const db = new db_local_1.LocalDBAdapter(options.db);
                const eventId = result.event_id;
                let attempts = 0;
                let foundLog = null;
                while (attempts < 20 && !foundLog) {
                    await new Promise(r => setTimeout(r, 500)); // Sleep 500ms
                    process.stdout.write('.');
                    const rows = await db.run('SELECT * FROM decision_logs WHERE event_id = ?', eventId);
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
                }
                else {
                    console.log('⚠️  Timed out waiting for result. Check logs later with:');
                    console.log(`    abs replay --id ${eventId}`);
                }
            }
            catch (dbErr) {
                console.warn('\n⚠️  Could not poll DB (is path correct?). Check server logs.');
            }
            return;
        }
        console.log('\n✅ Decision Result:');
        console.log(JSON.stringify(result, null, 2));
        if (result.decision === 'DENY') {
            console.log('\n🛡️  Blocked by Policy Gate.');
        }
        else {
            if (result.decision === 'ALLOW') {
                console.log('\n🚀 Allowed for Execution.');
            }
            else {
                console.log(`\n🛑 Blocked: ${result.decision}`);
            }
        }
    }
    catch (error) {
        console.error('❌ Simulation failed.');
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Error: ${err.message}`);
        if ('cause' in err && err.cause.code === 'ECONNREFUSED') {
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
        (0, db_1.setDB)(new db_local_1.LocalDBAdapter(options.db));
        const limit = parseInt(options.limit, 10);
        console.log(`Reading last ${limit} logs from ${options.db}...`);
        const logs = await (0, db_1.getRecentLogs)(limit);
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
    }
    catch (error) {
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
        (0, db_1.setDB)(new db_local_1.LocalDBAdapter(options.db));
        const db = new db_local_1.LocalDBAdapter(options.db); // Direct access needed for custom queries
        // 1. Fetch Event
        // Type casting result as unknown first, then to expected shape since driver returns unknown/any
        const eventRow = await db.run('SELECT * FROM events_store WHERE event_id = ?', options.id);
        if (!eventRow || !eventRow.results || eventRow.results.length === 0) {
            console.error('❌ Event not found in Store.');
            return;
        }
        const event = eventRow.results[0];
        const payload = JSON.parse(event.payload);
        console.log(`\nReplaying Event [${event.event_type}] from ${event.ingested_at}`);
        console.log(`Payload: ${JSON.stringify(payload).substring(0, 50)}...`);
        // 2. Fetch Original Decision (for comparison)
        const logRow = await db.run('SELECT * FROM decision_logs WHERE event_id = ?', options.id);
        const originalLog = (logRow && logRow.results && logRow.results.length > 0) ? logRow.results[0] : null;
        if (originalLog) {
            const origData = JSON.parse(originalLog.full_log_json);
            console.log(`\n⏮️  Original Decision: ${origData.policy_decision}`);
        }
        else {
            console.log('\n⏮️  Original Decision: <Not Found>');
        }
        // 3. Re-Execute Logic (Mocked Runtime for CLI)
        // Ideally this imports the exact same logic as API
        const { PolicyRegistry } = await Promise.resolve().then(() => __importStar(require('../core/policy-registry')));
        const { SimplePolicyEngine } = await Promise.resolve().then(() => __importStar(require('../core/policy')));
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
            explanation: { summary: 'Replay', rationale: 'Replay', evidence_refs: [] }
        };
        const result = policy.evaluate(proposal, { event_type: event.event_type, payload });
        console.log(`\n▶️  Current Policy Result: ${result}`);
        if (originalLog) {
            const origData = JSON.parse(originalLog.full_log_json);
            if (origData.policy_decision !== result) {
                console.log('⚠️  MISMATCH: Policy drift detected!');
            }
            else {
                console.log('✅  MATCH: Decision consistent.');
            }
        }
    }
    catch (err) {
        console.error('❌ Replay failed:', err);
    }
});
// -----------------------------------------------------------------------------
// 5. SUPERVISE (Gatekeeper)
// -----------------------------------------------------------------------------
const supervise_1 = require("./commands/supervise");
(0, supervise_1.registerSuperviseCommand)(program);
// -----------------------------------------------------------------------------
// 6. AUDIT (Integrity)
// -----------------------------------------------------------------------------
const audit_1 = require("./commands/audit");
(0, audit_1.registerAuditCommand)(program);
// -----------------------------------------------------------------------------
// 7. POLICIES
// -----------------------------------------------------------------------------
const policies_1 = require("./commands/policies");
(0, policies_1.registerPoliciesCommand)(program);
program.parse();
