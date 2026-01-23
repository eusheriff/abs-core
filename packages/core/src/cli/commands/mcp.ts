
import { Command } from 'commander';
import { runMCPServer } from '../../mcp/server';

export function registerMcpCommand(program: Command) {
    program
        .command('mcp')
        .description('Start the ABS Model Context Protocol (MCP) Server over Stdio')
        .action(async () => {
            // Using stderr for logs because stdout is used for MCP JSON-RPC
            console.error('🚀 Starting ABS MCP Server...');
            await runMCPServer();
        });
}
