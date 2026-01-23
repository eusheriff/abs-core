
import { Command } from 'commander';
import { setDB, getDB } from '../../infra/db';
import { LocalDBAdapter } from '../../infra/db-local';
import { Integrity } from '../../core/integrity';
import path from 'path';
import { signer } from '../../crypto/signer';

export function registerAuditCommand(program: Command) {
    const audit = program.command('audit').description('Audit Tools for Integrity Verification');

    audit
        .command('verify')
        .description('Verifies the cryptographic integrity of the local Event Chain')
        .option('--db <path>', 'Path to SQLite database', './abs_core.db')
        .action(async (options) => {
            const dbPath = path.resolve(options.db);
            console.log(`🔍  Starting Integrity Verification on ${dbPath}...`);
            
            // Ensure signer is initialized (picks up ABS_SECRET_KEY or default)
            signer.init(process.env.ABS_SECRET_KEY);

            try {
                // Initialize DB Adapter
                const adapter = new LocalDBAdapter(dbPath);
                // We use direct methods or the adapter inside Integrity
                // Note: verifyFullChain expects an adapter that has .all()
                
                const result = await Integrity.verifyFullChain(adapter);

                if (result.valid) {
                    console.log('\n✅  INTEGRITY CONFIRMED');
                    console.log(`    Scanned ${result.totalEvents} blocks/events.`);
                    console.log('    All hashes match. The Chain is unbreakable.');
                } else {
                    console.log('\n❌  INTEGRITY COMPROMISED (TAMPERING DETECTED)');
                    console.log(`    Failed at Block Index: ${result.brokenIndex}`);
                    console.log(`    Total Events Processed: ${result.totalEvents}`);
                    console.log(`    Details: ${result.details}`);
                    console.log('\n⚠️  SECURITY ALERT: The logs differ from the signature chain!');
                    process.exit(1);
                }

            } catch (err: any) {
                console.error('❌  Verification Error:', err.message);
                process.exit(1);
            }
        });

    // Shim Audit Command
    // Usage: abs audit --tool node --args "script.js"
    audit
        .description('Audit Tools for Integrity Verification & Shim Interception')
        .option('--tool <name>', 'Tool being intercepted (node, python, etc)')
        .option('--args <string>', 'Arguments passed to the tool')
        .action(async (options) => {
            // If called without options, show help (default behavior usually handles this, but let's be safe)
            if (!options.tool) {
                // If it's just 'abs audit' without args, we might want to list audits or show help.
                // For now, if no tool is provided, we assume it's a verify command or help request.
                if (program.args.includes('verify')) return; // Let subcommands handle it
                
                // Fallback to integrity check default? No, better show help.
                audit.help();
                return;
            }

            // SHIM INTERCEPTION LOGIC
            console.log(`🛡️  [ABS Audit] Intercepted: ${options.tool} ${options.args || ''}`);
            
            // TODO: Here we will integrate with Policy Engine to ALLOW/DENY
            // For now, we log and ALLOW (exit 0)
            
            // Log to WAL (Mock)
            // await logToWAL(options.tool, options.args, 'ALLOW');
            
            process.exit(0);
        });

}
