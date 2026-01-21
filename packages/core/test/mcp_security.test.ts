
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalDBAdapter } from '../src/infra/db-local';
import { createMCPServer } from '../src/mcp/server';

// Mock McpServer
const mockTool = vi.fn();
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
    return {
        McpServer: class {
            constructor() {}
            tool(name: string, ...args: any[]) {
                mockTool(name, ...args);
            }
        }
    };
});

describe('MCP Security (RBAC)', () => {
    let db: LocalDBAdapter;

    beforeEach(() => {
        db = new LocalDBAdapter(':memory:');
        mockTool.mockClear();
    });

    it('should NOT register Code Safety tools for Community Plan', async () => {
        await createMCPServer(db, { llmProvider: 'mock' }, {
            license: { plan: 'community', scopes: [] }
        });

        // Verify standard tools exist
        expect(mockTool).toHaveBeenCalledWith('abs_evaluate', expect.any(String), expect.any(Object), expect.any(Function));
        expect(mockTool).toHaveBeenCalledWith('abs_log', expect.any(String), expect.any(Object), expect.any(Function));
        expect(mockTool).toHaveBeenCalledWith('abs_check_policy', expect.any(String), expect.any(Object), expect.any(Function));

        // Verify restricted tools DO NOT exist
        const calls = mockTool.mock.calls.map(c => c[0]);
        expect(calls).not.toContain('abs_check_file_edit');
        expect(calls).not.toContain('abs_check_command');
    });

    it('should register Code Safety tools for Enterprise Plan', async () => {
        await createMCPServer(db, { llmProvider: 'mock' }, {
            license: { plan: 'enterprise', scopes: [] }
        });

        const calls = mockTool.mock.calls.map(c => c[0]);
        expect(calls).toContain('abs_check_file_edit');
        expect(calls).toContain('abs_check_command');
    });

    it('should register Code Safety tools for "coding_agent" Scope', async () => {
        await createMCPServer(db, { llmProvider: 'mock' }, {
            license: { plan: 'community', scopes: ['coding_agent'] }
        });

        const calls = mockTool.mock.calls.map(c => c[0]);
        expect(calls).toContain('abs_check_file_edit');
        expect(calls).toContain('abs_check_command');
    });
});
