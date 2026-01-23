import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Import core ABS types and processor
import { EventProcessor, ProcessorConfig } from '../core/processor';
import { DatabaseAdapter } from '../infra/db-adapter';
import { createABSContext, ABSContext } from '../core/context';
import { RuntimePackRegistry } from '../core/runtime-pack';
import { ABSKernel } from '../runtime/kernel';
import { createLogger } from '../core/logger';

// Tool Input Schemas
const EvaluateInputSchema = z.object({
    input: z.string().describe('The user prompt or input to evaluate'),
    output: z.string().describe('The AI response or output to evaluate'),
    tenant_id: z.string().optional().describe('Tenant identifier for multi-tenant setups'),
    metadata: z.record(z.any()).optional().describe('Additional metadata for the evaluation')
});

const LogInputSchema = z.object({
    input: z.string().describe('The user prompt'),
    output: z.string().describe('The AI response'),
    model: z.string().optional().describe('Model name used'),
    metadata: z.record(z.any()).optional().describe('Additional metadata')
});

const CheckPolicyInputSchema = z.object({
    action: z.string().describe('The action to check'),
    context: z.record(z.any()).describe('Context for policy evaluation')
});

const GetDecisionsInputSchema = z.object({
    limit: z.number().optional().default(10).describe('Number of decisions to retrieve'),
    tenant_id: z.string().optional().describe('Filter by tenant')
});

export interface MCPServerOptions {
    license?: {
        plan: 'community' | 'enterprise';
        scopes?: string[];
    };
    logger?: any;
}

export async function createMCPServer(db: DatabaseAdapter, config?: ProcessorConfig, options: MCPServerOptions = {}) {
    const { license = { plan: 'community', scopes: [] } } = options;
    const isEnterprise = license.plan === 'enterprise' || license.scopes?.includes('coding_agent');

    const processor = new EventProcessor(db, config);
    
    const server = new McpServer({
        name: 'abs-governance',
        version: '2.7.0'
    });

    // --- ABS Kernel Integration ---
    const logger = options.logger || createLogger('abs-mcp');
    const absContext = createABSContext(
        db,
        logger,
        { mode: isEnterprise ? 'runtime' : 'scanner' },
        'default',
        process.cwd()
    );
    
    const absKernel = new ABSKernel({ workspacePath: process.cwd() });
    await absKernel.init(absContext);
    
    // Register ABS Kernel tools with MCP server
    const kernelTools = absKernel.getTools();
    for (const tool of kernelTools) {
        server.tool(
            tool.name,
            tool.description,
            tool.inputSchema as any,
            async (args: any) => {
                try {
                    const result = await tool.handler(args, absContext);
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({ error: String(error) })
                        }],
                        isError: true
                    };
                }
            }
        );
    }
    logger.info(`[ABS] Registered ${kernelTools.length} Antigravity tools`);
    // --- End Antigravity Runtime Pack ---

    // Tool: abs_evaluate
    server.tool(
        'abs_evaluate',
        'Evaluate an AI interaction (prompt/response) against governance policies. Returns ALLOW, DENY, or ESCALATE.',
        {
            input: z.string().describe('The user prompt or input to evaluate'),
            output: z.string().describe('The AI response or output to evaluate'),
            tenant_id: z.string().optional().describe('Tenant identifier for multi-tenant setups'),
            metadata: z.record(z.any()).optional().describe('Additional metadata for the evaluation')
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
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ error: String(error) })
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool: abs_log
    server.tool(
        'abs_log',
        'Log an AI event for audit purposes (Scanner mode - fire-and-forget).',
        {
            input: z.string().describe('The user prompt'),
            output: z.string().describe('The AI response'),
            model: z.string().optional().describe('Model name used'),
            metadata: z.record(z.any()).optional().describe('Additional metadata')
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
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ logged: false, error: String(error) })
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool: abs_check_policy
    server.tool(
        'abs_check_policy',
        'Check if a proposed action violates any policy (dry-run, no logging).',
        {
            action: z.string().describe('The action to check'),
            context: z.record(z.any()).describe('Context for policy evaluation')
        },
        async (args) => {
            // Import PolicyRegistry for direct policy check
            const { PolicyRegistry } = await import('../core/policy-registry');
            
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
                    risk_level: 'low' as const
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
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ allowed: true, error: String(error), note: 'No matching policy found, defaulting to allow' })
                    }]
                };
            }
        }
    );

    // Tool: abs_get_decisions
    server.tool(
        'abs_get_decisions',
        'Retrieve recent decision logs for audit and review.',
        {
            limit: z.number().optional().default(10).describe('Number of decisions to retrieve'),
            tenant_id: z.string().optional().describe('Filter by tenant')
        },
        async (args) => {
            try {
                let query = `SELECT decision_id, event_id, tenant_id, policy_name, decision, timestamp FROM decision_logs ORDER BY timestamp DESC LIMIT ?`;
                const params: any[] = [args.limit || 10];
                
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
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ decisions: [], error: String(error) })
                    }],
                    isError: true
                };
            }
        }
    );

    // ===========================================
    // CODE SAFETY TOOLS (for Coding Agents)
    // ===========================================
    // Only available for Enterprise Plan

    if (isEnterprise) {
        const CheckFileEditSchema = z.object({
            file_path: z.string().describe('Absolute path of the file to edit'),
            operation: z.enum(['create', 'modify', 'delete']).describe('Type of file operation'),
            content_preview: z.string().optional().describe('Preview of content'),
            line_count: z.number().optional().describe('Number of lines')
        });

        const CheckCommandSchema = z.object({
            command: z.string().describe('Terminal command to execute'),
            cwd: z.string().optional().describe('Working directory')
        });

        // Tool: abs_check_file_edit
        server.tool(
            'abs_check_file_edit',
            'Check if a file edit operation is allowed by governance policies.',
            {
                file_path: z.string().describe('Absolute path of the file to edit'),
                operation: z.enum(['create', 'modify', 'delete']).describe('Type of file operation'),
                content_preview: z.string().optional().describe('Preview of content'),
                line_count: z.number().optional().describe('Number of lines')
            },
            async (args) => {
                const { CODE_SAFETY_POLICIES } = await import('../policies/library/code_safety');
                
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
                    risk_level: 'low' as const
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
                    await db.run(
                        `INSERT INTO decision_logs (decision_id, event_id, tenant_id, policy_name, decision, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        crypto.randomUUID(), event.event_id, 'default', 'code_safety', finalDecision, event.timestamp, JSON.stringify(event.payload)
                    );

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
                } catch (error) {
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({ allowed: true, error: String(error), note: 'Policy check failed, defaulting to allow' })
                        }]
                    };
                }
            }
        );

        // Tool: abs_check_command
        server.tool(
            'abs_check_command',
            'Check if a terminal command is allowed by governance policies.',
            {
                command: z.string().describe('Terminal command to execute'),
                cwd: z.string().optional().describe('Working directory')
            },
            async (args) => {
                const { CODE_SAFETY_POLICIES } = await import('../policies/library/code_safety');
                
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
                    risk_level: 'low' as const
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
                    await db.run(
                        `INSERT INTO decision_logs (decision_id, event_id, tenant_id, policy_name, decision, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        crypto.randomUUID(), event.event_id, 'default', 'code_safety', finalDecision, event.timestamp, JSON.stringify(event.payload)
                    );

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
                } catch (error) {
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({ allowed: true, error: String(error), note: 'Policy check failed, defaulting to allow' })
                        }]
                    };
                }
            }
        );

        // Tool: abs_npm_audit (Typed Protocol)
        server.tool(
            'abs_npm_audit',
            'Run npm audit securely with structured arguments.',
            {
                path: z.string().optional().describe('Path to package.json directory'),
                level: z.enum(['low', 'moderate', 'high', 'critical']).optional(),
                fix: z.boolean().optional()
            },
            async (args) => {
               // Security: Force 'npm' executable from trusted path
               const cwd = args.path || process.cwd();
               if (!cwd.startsWith(process.cwd())) {
                   return { isError: true, content: [{ type: 'text', text: "🚫 Path Traversal Blocked: Must be within workspace" }]};
               }
               
               const cmdArgs = ['audit', '--json'];
               if (args.level) cmdArgs.push(`--audit-level=${args.level}`);
               if (args.fix) cmdArgs.push('--fix');

                return await executeSecurely(db, 'npm', cmdArgs, cwd, 'npm_audit');
            }
        );

        // Tool: abs_node_run (Typed Protocol)
         server.tool(
            'abs_node_run',
            'Run a node.js script securely.',
            {
                script_path: z.string().describe('Relative path to script'),
                args: z.array(z.string()).optional()
            },
            async (args) => {
               const cwd = process.cwd();
               // Security: Prevent path traversal
               if (args.script_path.includes('..') || args.script_path.startsWith('/')) {
                     return { isError: true, content: [{ type: 'text', text: "🚫 Security: Script path must be relative to workspace" }]};
               }
               
               const cmdArgs = [args.script_path, ...(args.args || [])];
               return await executeSecurely(db, 'node', cmdArgs, cwd, 'node_run');
            }
        );

        // Tool: abs_python_run (Typed Protocol)
         server.tool(
            'abs_python_run',
            'Run a python script securely.',
            {
                script_path: z.string().describe('Relative path to script'),
                args: z.array(z.string()).optional()
            },
            async (args) => {
               const cwd = process.cwd();
               // Security: Prevent path traversal
               if (args.script_path.includes('..') || args.script_path.startsWith('/')) {
                     return { isError: true, content: [{ type: 'text', text: "🚫 Security: Script path must be relative to workspace" }]};
               }
               
               const cmdArgs = [args.script_path, ...(args.args || [])];
               return await executeSecurely(db, 'python3', cmdArgs, cwd, 'python_run');
            }
        );

        // Tool: abs_secure_exec (Legacy / Restricted)
        server.tool(
            'abs_secure_exec',
            'LEGACY: Execute a terminal command securely. Use typed tools if possible.',
            {
                command: z.string().describe('Terminal command to execute'),
                cwd: z.string().optional().describe('Working directory'),
                reason: z.string().optional().describe('Reason for execution (for audit log)')
            },
            async (args) => {
                 // Security Check: Deny complex shell commands unless explicitly allowed
                 if (args.command.includes('&&') || args.command.includes('|') || args.command.includes(';')) {
                      return { isError: true, content: [{ type: 'text', text: "🚫 Shell Chaining/Piping blocked in secure_exec." }]};
                 }
                 
                 const cwd = args.cwd || process.cwd();
                 // Split by space (naive, but safer for simple commands)
                 const [bin, ...cmdArgs] = args.command.split(' ');
                 
                 // Allowlist of binaries
                 const ALLOWED_BINS = ['ls', 'cat', 'grep', 'git', 'echo', 'mkdir', 'touch'];
                 if (!ALLOWED_BINS.includes(bin)) {
                      return { isError: true, content: [{ type: 'text', text: `🚫 Binary '${bin}' not in Allowlist for secure_exec. Use specific tools.` }]};
                 }

                 return await executeSecurely(db, bin, cmdArgs, cwd, 'legacy_exec');
            }
        );

         // Helper: Isolated Execution Logic
         async function executeSecurely(db: any, bin: string, args: string[], cwd: string, policyAction: string) {
            const { execFile } = await import('child_process');
            const util = await import('util');
            const execFileAsync = util.promisify(execFile);
            
             // 1. Policy Check
                const event = {
                    event_type: 'agent.command',
                    event_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    tenant_id: 'default',
                    payload: {
                        command: `${bin} ${args.join(' ')}`,
                        cwd: cwd,
                        tool_action: policyAction
                    }
                };

                // Simple auto-allow logic for trusted tools (can be expanded to used PolicyRegistry)
                // For now we log and allow if the tool logic passed checks.
                
                 await db.run(
                        `INSERT INTO decision_logs (decision_id, event_id, tenant_id, policy_name, decision, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        crypto.randomUUID(), event.event_id, 'default', 'code_safety', 'ALLOW', event.timestamp, JSON.stringify(event.payload)
                );

            // 2. Execution (No Shell)
            try {
                const { stdout, stderr } = await execFileAsync(bin, args, { cwd, maxBuffer: 10 * 1024 * 1024 });
                return {
                        content: [{
                            type: 'text',
                            text: stdout || stderr ? (stdout + (stderr ? `\n[STDERR]\n${stderr}` : '')) : '[No Output]'
                        }]
                };
            } catch (err: any) {
                 return { isError: true, content: [{ type: 'text', text: `Exec Error: ${err.message}` }]};
            }
         }


    } else {
        console.error('[ABS MCP] 🔒 Hiding Coding Tools (Enterprise Plan required)');
    }

    return server;
}

// CLI Entry Point (for stdio transport)
export async function runMCPServer() {
    // 0. Validate License / Token (Enterprise Check)
    const token = process.env.ABS_TOKEN;
    if (!token) {
        console.error('[ABS MCP] ❌ FATAL: Missing ABS_TOKEN environment variable.');
        console.error('[ABS MCP] Please run "abs login" or generate a token at https://abscore.app/dashboard');
        process.exit(1);
    }

    let licensePlan: 'community' | 'enterprise' = 'community';
    let licenseScopes: string[] = [];

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
        if (license.plan) licensePlan = license.plan;
        // if (license.scopes) licenseScopes = license.scopes; // Future
        
        // Mock Override for Enterprise testing
        if (license.email && (license.email.includes("oconnector.tech") ||  license.email.includes("admin"))) {
             licensePlan = 'enterprise';
        }

    } catch (err) {
        console.error('[ABS MCP] ⚠️ WARNING: Could not verify license server (Network Error). Proceeding in Offline Mode.');
    }

    // For CLI usage, we need a simple in-memory or SQLite DB adapter
    const { SQLiteAdapter } = await import('../infra/sqlite-adapter');
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

    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('[ABS MCP] Server started on stdio');
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMCPServer().catch(console.error);
}
