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
exports.registerPoliciesCommand = registerPoliciesCommand;
const db_1 = require("../../infra/db");
const db_local_1 = require("../../infra/db-local");
const path_1 = __importDefault(require("path"));
function registerPoliciesCommand(program) {
    const policies = program.command('policies').description('Manage governance policies');
    policies
        .command('list')
        .description('List active governance policies')
        .option('--db <path>', 'Path to SQLite database', './abs_core.db')
        .action(async (options) => {
        try {
            const dbPath = path_1.default.resolve(options.db);
            (0, db_1.setDB)(new db_local_1.LocalDBAdapter(dbPath));
            const db = new db_local_1.LocalDBAdapter(dbPath);
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
            const { PolicyRegistry } = await Promise.resolve().then(() => __importStar(require('../../core/policy-registry')));
            // Force load of static blocks
            // Mock display
            const defaults = [
                { name: 'WhatsApp Bot Policy', target: 'whatsapp', domain: 'SOCIAL' },
                { name: 'General Bot Operational', target: 'bot', domain: 'GENERAL' }
            ];
            console.table(defaults);
        }
        catch (err) {
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
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const content = fs.readFileSync(filepath, 'utf-8');
            const json = JSON.parse(content);
            const { PolicyRuleSchema } = await Promise.resolve().then(() => __importStar(require('../../core/schemas')));
            const result = PolicyRuleSchema.safeParse(json);
            if (result.success) {
                console.log('✅ Policy is VALID.');
                console.log(`   Domain: ${json.domain || 'GENERAL'}`);
                console.log(`   Score Impact: ${json.score_impact}`);
            }
            else {
                console.log('❌ Policy is INVALID.');
                console.log(result.error.format());
            }
        }
        catch (e) {
            console.error('❌ Failed:', e.message);
        }
    });
}
