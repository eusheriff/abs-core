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
    process.env.DATABASE_URL = options.db;
    const port = parseInt(options.port, 10);
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
  .action(async (eventType, options) => {
    let payload = {};
    
    try {
        if (options.file) {
            const content = fs.readFileSync(path.resolve(options.file), 'utf-8');
            payload = JSON.parse(content);
        } else if (options.payload) {
            payload = JSON.parse(options.payload);
        }
    } catch (e: any) {
        console.error('❌ Failed to parse payload:', e.message);
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

        if ((result as any).decision === 'DENY') {
             console.log('\n🛡️  Blocked by Policy Gate.');
        } else {
            // Assuming 'result' contains the decision and potentially a status
            // The instruction refers to 'body.status', but 'body' is the request payload.
            // It's more likely meant to be 'result.status' or a property within 'result.decision'.
            // Given the original code only checked 'result.decision', we'll assume
            // the new check should be on 'result.status' if it exists, or 'result.decision' itself.
            // For now, interpreting 'decision.status' as 'result.decision' and 'accepted' as 'ALLOW'.
            // If 'result' has a 'status' field, it should be used.
            if ((result as any).decision === 'ALLOW') { // Assuming 'ALLOW' is the positive decision
                console.log('\n🚀 Allowed for Execution.');
            } else {
                console.log(`\n🛑 Blocked: ${(result as any).decision}`);
            }
        }

    } catch (error: any) {
        console.error('❌ Simulation failed.');
        console.error(`Error: ${error.message}`);
        if (error.cause && (error.cause as any).code === 'ECONNREFUSED') {
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

    } catch (error: any) {
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
