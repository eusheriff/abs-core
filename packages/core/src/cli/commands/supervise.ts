
import { Command } from 'commander';
import { startServer } from '../../api/server';
import * as readline from 'readline';
import { getDB } from '../../infra/db';

export function registerSuperviseCommand(program: Command) {
    program
        .command('supervise')
        .description('Starts the Gatekeeper (Server + Interactive Supervisor)')
        .option('-p, --port <number>', 'Port to listen on', '3000')
        .option('--poll <ms>', 'Polling interval in ms', '2000')
        .action(async (options) => {
            const port = parseInt(options.port, 10);
            const pollInterval = parseInt(options.poll, 10);

            console.log('🛡️  Starting ABS Gatekeeper...');
            console.log('   Mode: Interactive Supervisor');
            console.log(`   Port: ${port}`);
            
            // 1. Force Interactive Mode
            process.env.ABS_MODE = 'runtime'; // Runtime with interactive supervision
            // We use a different Env var or config to tell Internal Processor to be interactive?
            // Actually, for now, the processor uses "interactive_mode" config locally.
            // But startServer creates processor via API routes which don't read "interactive_mode" from generic env yet easily.
            // However, the "suspended" state is handled by the Processor logic I added: 
            // `if (this.interactive) ... status: 'suspended'`
            // I need to make sure the Server init uses this.
            // In factory.ts: 
            /*
             mode: (c.env?.ABS_MODE || 'runtime') as 'scanner' | 'runtime'
            */
            // I need to inject `interactive_mode` into the request or env.
            // Let's rely on the fact that if I set a global var or env, `events.ts` needs to pick it up.
            // In `events.ts`, I see:
            /*
             const processor = new EventProcessor(db, { ... mode: ... })
            */
            // It does NOT pass `interactive_mode` from env.
            // I should update `events.ts` to read `ABS_INTERACTIVE` env var.
            
            process.env.ABS_INTERACTIVE = 'true';

            // 2. Start Server (Non-blocking ideally, but serve is blocking??)
            // @hono/node-server serve is blocking? valid question.
            // Usually in Node it sets up the listener and returns? calling `serve(...)` returns a Server object.
            // `startServer` calls `run` which calls `serve`.
            
            startServer(port); 

            // 3. Start TUI Loop
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            console.log('\n✅ Gatekeeper Active. Monitoring for Suspended Tasks...\n');

            const checkSuspended = async () => {
                try {
                    const db = getDB();
                    // Look for Suspended Decision Logs
                    // Or Pending Reviews that are associated with a suspended state
                    // The Processor returns status='suspended' and decision='ESCALATE'.
                    // It logs to decision_logs with these values.
                    
                    const rows = await db.all<any>(`
                        SELECT * FROM decision_logs 
                        WHERE execution_status = 'suspended' 
                        ORDER BY timestamp ASC 
                        LIMIT 1
                    `);

                    if (rows && rows.length > 0) {
                        const task = rows[0];
                        const meta = JSON.parse(task.full_log_json);
                        
                        console.log('\n🛑 INTERCEPTED HIGH RISK ACTION');
                        console.log(`   ID: ${task.decision_id}`);
                        console.log(`   Policy: ${task.policy_name || 'N/A'}`);
                        console.log(`   Reason: ${meta.policy_decision}`); // ESCALATE
                        console.log(`   Risk Score: ${meta.risk_score || 'N/A'}`);
                        console.log(`   Payload: ${JSON.stringify(meta.policy_trace?.computed_fields || {}).substring(0, 100)}...`);
                        
                        // Pause polling
                        return task;
                    }
                } catch (e: any) {
                    console.error('Check loop error:', e.message);
                }
                return null;
            };

            const processTask = (task: any) => {
                return new Promise<void>((resolve) => {
                    rl.question('   ❓ Approve this action? [y/N]: ', async (answer) => {
                        const approved = answer.toLowerCase() === 'y';
                        const endpoint = approved ? '/v1/supervise/approve' : '/v1/supervise/reject';
                        
                        try {
                            const res = await fetch(`http://localhost:${port}${endpoint}`, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Bearer sk-admin-abs-v0'
                                },
                                body: JSON.stringify({
                                    decision_id: task.decision_id,
                                    note: `Gatekeeper CLI: ${approved ? 'Approved' : 'Rejected'}`
                                })
                            });
                            
                            if (res.ok) {
                                console.log(`\n   ✅ Action ${approved ? 'APPROVED' : 'REJECTED'}`);
                            } else {
                                console.log(`\n   ❌ Error: ${res.status} ${await res.text()}`);
                            }
                        } catch (err) {
                            console.log('   ❌ Failed to contact server.');
                        }
                        resolve();
                    });
                });
            };

            // Main Loop
            const loop = async () => {
                const task = await checkSuspended();
                if (task) {
                    await processTask(task);
                    setTimeout(loop, 100); // Resume fast
                } else {
                    setTimeout(loop, pollInterval);
                }
            };

            // Wait a bit for DB init
            setTimeout(loop, 2000);
        });
}
