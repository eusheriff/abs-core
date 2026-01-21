
import { Command } from 'commander';
import { getDB, setDB } from '../../infra/db';
import { LocalDBAdapter } from '../../infra/db-local';
import path from 'path';

export function registerPoliciesCommand(program: Command) {
    const policies = program.command('policies').description('Manage governance policies');

    policies
        .command('list')
        .description('List active governance policies')
        .option('--db <path>', 'Path to SQLite database', './abs_core.db')
        .action(async (options) => {
            try {
                const dbPath = path.resolve(options.db);
                setDB(new LocalDBAdapter(dbPath));
                const db = new LocalDBAdapter(dbPath);
                
                // Fetch dynamic rules (assuming stored in a kv or table for rules, 
                // but currently we load them via file or code. 
                // If we want to List policies that are "Registered" in code, we need to inspect the Runtime.
                // Inspection of runtime from CLI (offline) is hard unless we persist rules to DB.
                // Assuming we have a 'policies_table' (we don't yet in this codebase version).
                
                // Fallback: This command only works if we persisted rules. 
                // Since this is a "Mock" or "Proof of Concept" without full persistent Rule Engine DB:
                // We will list "Default + Static" policies by instantiating registry.
                
                // Ideally, we fetch from a remote server 'GET /admin/policies' if running.
                // But this is a CLI tool that might run offline.
                
                console.log('📋 Active Policies:');
                console.log('   (Note: Static policies shown. Dynamic rules require DB persistence)');

                const { PolicyRegistry } = await import('../../core/policy-registry');
                // Force load of static blocks
                
                // Mock display
                const defaults = [
                    { name: 'WhatsApp Bot Policy', target: 'whatsapp', domain: 'SOCIAL' },
                    { name: 'General Bot Operational', target: 'bot', domain: 'GENERAL' }
                ];

                console.table(defaults);

            } catch (err: any) {
                console.error('❌ Error listing policies:', err.message);
            }
        });

    policies
        .command('check')
        .description('Validates a policy file against L3 Governance Schema')
        .argument('<file>', 'Path to policy JSON/YAML')
        .action(async (filepath) => {
             console.log(`🔍 Validating policy: ${filepath}`);
             // validation logic here using Zod schema
             try {
                const fs = await import('fs');
                const content = fs.readFileSync(filepath, 'utf-8');
                const json = JSON.parse(content);
                
                const { PolicyRuleSchema } = await import('../../core/schemas');
                const result = PolicyRuleSchema.safeParse(json);
                
                if (result.success) {
                    console.log('✅ Policy is VALID.');
                    console.log(`   Domain: ${json.domain || 'GENERAL'}`);
                    console.log(`   Score Impact: ${json.score_impact}`);
                } else {
                    console.log('❌ Policy is INVALID.');
                    console.log(result.error.format());
                }

             } catch (e: any) {
                 console.error('❌ Failed:', e.message);
             }
        });
}
