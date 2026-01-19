#!/usr/bin/env node
"use strict";
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
    process.env.DATABASE_URL = options.db;
    const port = parseInt(options.port, 10);
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
    .action(async (eventType, options) => {
    let payload = {};
    try {
        if (options.file) {
            const content = fs_1.default.readFileSync(path_1.default.resolve(options.file), 'utf-8');
            payload = JSON.parse(content);
        }
        else if (options.payload) {
            payload = JSON.parse(options.payload);
        }
    }
    catch (e) {
        console.error('❌ Failed to parse payload:', e.message);
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
    console.log(`🧪 Simulating event: ${eventType} -> ${options.url}`);
    try {
        const response = await fetch(options.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`HTTP ${response.status} ${response.statusText} - ${errBody}`);
        }
        const result = await response.json();
        console.log('\n✅ Decision Result:');
        console.log(JSON.stringify(result, null, 2));
        if (result.decision === 'DENY') {
            console.log('\n🛡️  Blocked by Policy Gate.');
        }
        else {
            console.log('\n🚀 Allowed for Execution.');
        }
    }
    catch (error) {
        console.error('❌ Simulation failed.');
        console.error(`Error: ${error.message}`);
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
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
        console.error(error.message);
        if (error.message.includes('not initialized')) {
            console.log('Tip: Ensure database exists.');
        }
    }
});
// -----------------------------------------------------------------------------
// 4. POLICIES
// -----------------------------------------------------------------------------
const policies = program.command('policies').description('Manage governance policies');
policies
    .command('check')
    .description('Static analysis of policies (Placeholder)')
    .action(() => {
    console.log('✅ Policy integrity check passed (Mock).');
});
program.parse();
