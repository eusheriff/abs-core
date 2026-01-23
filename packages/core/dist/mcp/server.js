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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMCPServer = createMCPServer;
exports.runMCPServer = runMCPServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
// Import core ABS types and processor
const processor_1 = require("../core/processor");
// Tool Input Schemas
const EvaluateInputSchema = zod_1.z.object({
    input: zod_1.z.string().describe('The user prompt or input to evaluate'),
    output: zod_1.z.string().describe('The AI response or output to evaluate'),
    tenant_id: zod_1.z.string().optional().describe('Tenant identifier for multi-tenant setups'),
    metadata: zod_1.z.record(zod_1.z.any()).optional().describe('Additional metadata for the evaluation')
});
const LogInputSchema = zod_1.z.object({
    input: zod_1.z.string().describe('The user prompt'),
    output: zod_1.z.string().describe('The AI response'),
    model: zod_1.z.string().optional().describe('Model name used'),
    metadata: zod_1.z.record(zod_1.z.any()).optional().describe('Additional metadata')
});
const CheckPolicyInputSchema = zod_1.z.object({
    action: zod_1.z.string().describe('The action to check'),
    context: zod_1.z.record(zod_1.z.any()).describe('Context for policy evaluation')
});
const GetDecisionsInputSchema = zod_1.z.object({
    limit: zod_1.z.number().optional().default(10).describe('Number of decisions to retrieve'),
    tenant_id: zod_1.z.string().optional().describe('Filter by tenant')
});
async function createMCPServer(db, config, options = {}) {
    const { license = { plan: 'community', scopes: [] } } = options;
    const isEnterprise = license.plan === 'enterprise' || license.scopes?.includes('coding_agent');
    const processor = new processor_1.EventProcessor(db, config);
    const server = new mcp_js_1.McpServer({
        name: 'abs-governance',
        version: '2.7.0'
    });
    // Tool: abs_evaluate
    'abs_evaluate',
        'Evaluate an AI interaction (prompt/response) against governance policies. Returns ALLOW, DENY, or ESCALATE.',
        {
            input: zod_1.z.string().describe('The user prompt or input to evaluate'),
            output: zod_1.z.string().describe('The AI response or output to evaluate'),
            tenant_id: zod_1.z.string().optional().describe('Tenant identifier for multi-tenant setups'),
            metadata: zod_1.z.record(zod_1.z.any()).optional().describe('Additional metadata for the evaluation')
        },
        async (args) => {
            const event = {
                event_type: 'llm.completion',
                event_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                correlation_id: crypto.randomUUID(),
                tenant_id: args.tenant_id || 'default',
                payload: {
                    input: args.input,
                    output: args.output,
                    ...args.metadata
                }
            };
            try {
                const result = await processor.process(event);
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({
                                decision: result.decision,
                                status: result.status,
                                reason: result.policy_id || 'default',
                                trace_id: result.trace_id,
                                latency_ms: result.latency_ms
                            }, null, 2)
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({ error: String(error) })
                        }],
                    isError: true
                };
            }
        };
    ;
    // Tool: abs_log
    'abs_log',
        'Log an AI event for audit purposes (Scanner mode - fire-and-forget).',
        {
            input: zod_1.z.string().describe('The user prompt'),
            output: zod_1.z.string().describe('The AI response'),
            model: zod_1.z.string().optional().describe('Model name used'),
            metadata: zod_1.z.record(zod_1.z.any()).optional().describe('Additional metadata')
        },
        async (args) => {
            const event = {
                event_type: 'llm.completion',
                event_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                correlation_id: crypto.randomUUID(),
                tenant_id: 'default',
                payload: {
                    input: args.input,
                    output: args.output,
                    model: args.model,
                    ...args.metadata
                }
            };
            try {
                const result = await processor.process(event);
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({
                                logged: result.status === 'processed',
                                event_id: event.event_id,
                                trace_id: result.trace_id
                            }, null, 2)
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({ logged: false, error: String(error) })
                        }],
                    isError: true
                };
            }
        };
    ;
    // Tool: abs_check_policy
    'abs_check_policy',
        'Check if a proposed action violates any policy (dry-run, no logging).',
        {
            action: zod_1.z.string().describe('The action to check'),
            context: zod_1.z.record(zod_1.z.any()).describe('Context for policy evaluation')
        },
        async (args) => {
            // Import PolicyRegistry for direct policy check
            const { PolicyRegistry } = await Promise.resolve().then(() => __importStar(require('../core/policy-registry')));
            try {
                const policy = PolicyRegistry.getPolicy(args.action);
                const mockProposal = {
                    proposal_id: 'dry-run',
                    process_id: 'dry-run',
                    current_state: 'IDLE',
                    recommended_action: args.action,
                    action_params: args.context,
                    explanation: { summary: 'Dry run check', rationale: '', evidence_refs: [] },
                    confidence: 1.0,
                    risk_level: 'low'
                };
                const mockEvent = {
                    event_type: args.action,
                    event_id: 'dry-run',
                    timestamp: new Date().toISOString(),
                    tenant_id: 'default',
                    payload: args.context
                };
                const decision = policy.evaluate(mockProposal, mockEvent);
                const decisionStr = typeof decision === 'string' ? decision : decision.decision;
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({
                                allowed: decisionStr !== 'DENY',
                                decision: decisionStr,
                                matching_policy: policy.name
                            }, null, 2)
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({ allowed: true, error: String(error), note: 'No matching policy found, defaulting to allow' })
                        }]
                };
            }
        };
    ;
    // Tool: abs_get_decisions
    'abs_get_decisions',
        'Retrieve recent decision logs for audit and review.',
        {
            limit: zod_1.z.number().optional().default(10).describe('Number of decisions to retrieve'),
            tenant_id: zod_1.z.string().optional().describe('Filter by tenant')
        },
        async (args) => {
            try {
                let query = `SELECT decision_id, event_id, tenant_id, policy_name, decision, timestamp FROM decision_logs ORDER BY timestamp DESC LIMIT ?`;
                const params = [args.limit || 10];
                if (args.tenant_id) {
                    query = `SELECT decision_id, event_id, tenant_id, policy_name, decision, timestamp FROM decision_logs WHERE tenant_id = ? ORDER BY timestamp DESC LIMIT ?`;
                    params.unshift(args.tenant_id);
                }
                const results = await db.all(query, ...params);
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({ decisions: results, count: results.length }, null, 2)
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({ decisions: [], error: String(error) })
                        }],
                    isError: true
                };
            }
        };
    ;
    // ===========================================
    // CODE SAFETY TOOLS (for Coding Agents)
    // ===========================================
    // Only available for Enterprise Plan
    if (isEnterprise) {
        const CheckFileEditSchema = zod_1.z.object({
            file_path: zod_1.z.string().describe('Absolute path of the file to edit'),
            operation: zod_1.z.enum(['create', 'modify', 'delete']).describe('Type of file operation'),
            content_preview: zod_1.z.string().optional().describe('Preview of content'),
            line_count: zod_1.z.number().optional().describe('Number of lines')
        });
        const CheckCommandSchema = zod_1.z.object({
            command: zod_1.z.string().describe('Terminal command to execute'),
            cwd: zod_1.z.string().optional().describe('Working directory')
        });
        // Tool: abs_check_file_edit
        server.tool('abs_check_file_edit', 'Check if a file edit operation is allowed by governance policies.', {
            file_path: zod_1.z.string().describe('Absolute path of the file to edit'),
            operation: zod_1.z.enum(['create', 'modify', 'delete']).describe('Type of file operation'),
            content_preview: zod_1.z.string().optional().describe('Preview of content'),
            line_count: zod_1.z.number().optional().describe('Number of lines')
        }, async (args) => {
            const { CODE_SAFETY_POLICIES } = await Promise.resolve().then(() => __importStar(require('../policies/library/code_safety')));
            const event = {
                event_type: 'agent.file_edit',
                event_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                tenant_id: 'default',
                payload: {
                    file_path: args.file_path,
                    operation: args.operation,
                    content_preview: args.content_preview,
                    line_count: args.line_count
                }
            };
            const mockProposal = {
                proposal_id: crypto.randomUUID(),
                process_id: 'code-agent',
                current_state: 'EDITING',
                recommended_action: `${args.operation}_file`,
                action_params: { path: args.file_path },
                explanation: { summary: 'File edit operation', rationale: '', evidence_refs: [] },
                confidence: 1.0,
                risk_level: 'low'
            };
            try {
                let finalDecision = 'ALLOW';
                let denyReason = '';
                for (const policy of CODE_SAFETY_POLICIES) {
                    const result = policy.evaluate(mockProposal, event);
                    const decision = typeof result === 'string' ? result : result.decision;
                    if (decision === 'DENY') {
                        finalDecision = 'DENY';
                        denyReason = typeof result === 'object' ? result.reason || policy.name : policy.name;
                        break;
                    }
                }
                // Log decision
                await db.run(`INSERT INTO decision_logs (decision_id, event_id, tenant_id, policy_name, decision, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?)`, crypto.randomUUID(), event.event_id, 'default', 'code_safety', finalDecision, event.timestamp, JSON.stringify(event.payload));
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({
                                allowed: finalDecision === 'ALLOW',
                                decision: finalDecision,
                                file_path: args.file_path,
                                operation: args.operation,
                                reason: denyReason || 'Passed all policies'
                            }, null, 2)
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({ allowed: true, error: String(error), note: 'Policy check failed, defaulting to allow' })
                        }]
                };
            }
        });
        // Tool: abs_check_command
        server.tool('abs_check_command', 'Check if a terminal command is allowed by governance policies.', {
            command: zod_1.z.string().describe('Terminal command to execute'),
            cwd: zod_1.z.string().optional().describe('Working directory')
        }, async (args) => {
            const { CODE_SAFETY_POLICIES } = await Promise.resolve().then(() => __importStar(require('../policies/library/code_safety')));
            const event = {
                event_type: 'agent.command',
                event_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                tenant_id: 'default',
                payload: {
                    command: args.command,
                    cwd: args.cwd
                }
            };
            const mockProposal = {
                proposal_id: crypto.randomUUID(),
                process_id: 'code-agent',
                current_state: 'EXECUTING',
                recommended_action: 'run_command',
                action_params: { command: args.command },
                explanation: { summary: 'Command execution', rationale: '', evidence_refs: [] },
                confidence: 1.0,
                risk_level: 'low'
            };
            try {
                let finalDecision = 'ALLOW';
                let denyReason = '';
                for (const policy of CODE_SAFETY_POLICIES) {
                    const result = policy.evaluate(mockProposal, event);
                    const decision = typeof result === 'string' ? result : result.decision;
                    if (decision === 'DENY') {
                        finalDecision = 'DENY';
                        denyReason = typeof result === 'object' ? result.reason || policy.name : policy.name;
                        break;
                    }
                }
                // Log decision
                await db.run(`INSERT INTO decision_logs (decision_id, event_id, tenant_id, policy_name, decision, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?)`, crypto.randomUUID(), event.event_id, 'default', 'code_safety', finalDecision, event.timestamp, JSON.stringify(event.payload));
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({
                                allowed: finalDecision === 'ALLOW',
                                decision: finalDecision,
                                command: args.command,
                                reason: denyReason || 'Passed all policies'
                            }, null, 2)
                        }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({ allowed: true, error: String(error), note: 'Policy check failed, defaulting to allow' })
                        }]
                };
            }
        });
    }
    else {
        console.error('[ABS MCP] 🔒 Hiding Coding Tools (Enterprise Plan required)');
    }
    return server;
}
// CLI Entry Point (for stdio transport)
async function runMCPServer() {
    // 0. Validate License / Token (Enterprise Check)
    const token = process.env.ABS_TOKEN;
    if (!token) {
        console.error('[ABS MCP] ❌ FATAL: Missing ABS_TOKEN environment variable.');
        console.error('[ABS MCP] Please run "abs login" or generate a token at https://abscore.app/dashboard');
        process.exit(1);
    }
    let licensePlan = 'community';
    let licenseScopes = [];
    try {
        const res = await fetch('https://auth-worker.dev-oconnector.workers.dev/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            console.error('[ABS MCP] 🚫 LICENSE ERROR: Invalid or expired token.');
            process.exit(1);
        }
        const license = await res.json();
        console.error(`[ABS MCP] ✅ License Verified: ${license.email} (User ID: ${license.userId})`);
        // Extract capabilities
        if (license.plan)
            licensePlan = license.plan;
        // if (license.scopes) licenseScopes = license.scopes; // Future
        // Mock Override for Enterprise testing
        if (license.email && (license.email.includes("oconnector.tech") || license.email.includes("admin"))) {
            licensePlan = 'enterprise';
        }
    }
    catch (err) {
        console.error('[ABS MCP] ⚠️ WARNING: Could not verify license server (Network Error). Proceeding in Offline Mode.');
    }
    // For CLI usage, we need a simple in-memory or SQLite DB adapter
    const { SQLiteAdapter } = await Promise.resolve().then(() => __importStar(require('../infra/sqlite-adapter')));
    const db = new SQLiteAdapter(':memory:');
    await db.initialize();
    const server = await createMCPServer(db, {
        llmProvider: 'mock',
        mode: licensePlan === 'enterprise' ? 'runtime' : 'scanner'
    }, {
        license: {
            plan: licensePlan,
            scopes: licenseScopes
        }
    });
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('[ABS MCP] Server started on stdio');
}
// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMCPServer().catch(console.error);
}
