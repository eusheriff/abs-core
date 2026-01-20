import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Import core ABS types and processor
import { EventProcessor, ProcessorConfig } from '../core/processor';
import { DatabaseAdapter } from '../infra/db-adapter';

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

export async function createMCPServer(db: DatabaseAdapter, config?: ProcessorConfig) {
    const processor = new EventProcessor(db, config);
    
    const server = new McpServer({
        name: 'abs-governance',
        version: '2.7.0'
    });

    // Tool: abs_evaluate
    server.tool(
        'abs_evaluate',
        'Evaluate an AI interaction (prompt/response) against governance policies. Returns ALLOW, DENY, or ESCALATE.',
        EvaluateInputSchema.shape,
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
        LogInputSchema.shape,
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
        CheckPolicyInputSchema.shape,
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
        GetDecisionsInputSchema.shape,
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
    } catch (err) {
        console.error('[ABS MCP] ⚠️ WARNING: Could not verify license server (Network Error). Proceeding in Offline Mode.');
    }

    // For CLI usage, we need a simple in-memory or SQLite DB adapter
    const { SQLiteAdapter } = await import('../infra/sqlite-adapter');
    const db = new SQLiteAdapter(':memory:');
    await db.initialize();

    const server = await createMCPServer(db, {
        llmProvider: 'mock',
        mode: 'scanner' // Default to scanner mode for MCP
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('[ABS MCP] Server started on stdio');
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMCPServer().catch(console.error);
}
