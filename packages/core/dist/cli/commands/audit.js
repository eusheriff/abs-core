"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuditCommand = registerAuditCommand;
const db_local_1 = require("../../infra/db-local");
const integrity_1 = require("../../core/integrity");
const path_1 = __importDefault(require("path"));
const signer_1 = require("../../crypto/signer");
function registerAuditCommand(program) {
    const audit = program.command('audit').description('Audit Tools for Integrity Verification');
    audit
        .command('verify')
        .description('Verifies the cryptographic integrity of the local Event Chain')
        .option('--db <path>', 'Path to SQLite database', './abs_core.db')
        .action(async (options) => {
        const dbPath = path_1.default.resolve(options.db);
        console.log(`🔍  Starting Integrity Verification on ${dbPath}...`);
        // Ensure signer is initialized (picks up ABS_SECRET_KEY or default)
        signer_1.signer.init(process.env.ABS_SECRET_KEY);
        try {
            // Initialize DB Adapter
            const adapter = new db_local_1.LocalDBAdapter(dbPath);
            // We use direct methods or the adapter inside Integrity
            // Note: verifyFullChain expects an adapter that has .all()
            const result = await integrity_1.Integrity.verifyFullChain(adapter);
            if (result.valid) {
                console.log('\n✅  INTEGRITY CONFIRMED');
                console.log(`    Scanned ${result.totalEvents} blocks/events.`);
                console.log('    All hashes match. The Chain is unbreakable.');
            }
            else {
                console.log('\n❌  INTEGRITY COMPROMISED (TAMPERING DETECTED)');
                console.log(`    Failed at Block Index: ${result.brokenIndex}`);
                console.log(`    Total Events Processed: ${result.totalEvents}`);
                console.log(`    Details: ${result.details}`);
                console.log('\n⚠️  SECURITY ALERT: The logs differ from the signature chain!');
                process.exit(1);
            }
        }
        catch (err) {
            console.error('❌  Verification Error:', err.message);
            process.exit(1);
        }
    });
}
