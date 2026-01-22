#!/usr/bin/env node
/**
 * AGR CLI - Antigravity Runtime Command Line Interface
 * 
 * Usage:
 *   agr run     - Start governed session
 *   agr freeze  - Snapshot memory (materialize WAL to STATE.md)
 *   agr audit   - Replay and display decision logs
 *   agr verify  - Verify WAL integrity
 *   agr status  - Show runtime health
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const program = new Command();

program
  .name('agr')
  .description('Antigravity Runtime CLI - Governed Autonomy for AI Agents')
  .version('1.0.0');

// Helper: Get workspace paths
function getPaths(cwd: string = process.cwd()) {
  const consolidated = path.join(cwd, '_consolidated');
  return {
    consolidated,
    state: path.join(consolidated, 'STATE.md'),
    wal: path.join(consolidated, 'WORKLOG.wal'),
  };
}

// Helper: Read WAL entries
function readWAL(walPath: string): any[] {
  if (!fs.existsSync(walPath)) return [];
  const content = fs.readFileSync(walPath, 'utf-8').trim();
  if (!content) return [];
  return content.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

// Command: agr run
program
  .command('run')
  .description('Start a governed session (initialize AGR)')
  .option('-w, --workspace <path>', 'Workspace path', process.cwd())
  .action((options) => {
    const paths = getPaths(options.workspace);
    
    // Ensure _consolidated exists
    if (!fs.existsSync(paths.consolidated)) {
      fs.mkdirSync(paths.consolidated, { recursive: true });
      console.log(`✅ Created ${paths.consolidated}`);
    }
    
    // Check if STATE.md exists
    if (!fs.existsSync(paths.state)) {
      const initialState = `---
schema_version: "1.0.0"
session_id: "${crypto.randomUUID()}"
mode: "governed"
context_lock: null
current_objective:
  id: "session-init"
  status: "active"
  owner: "agr-cli"
constraints:
  allowed_tools: []
  forbidden_paths: ["/etc/*", "*.pem", "*.key"]
---

# STATE

> Initialized by AGR CLI at ${new Date().toISOString()}
`;
      fs.writeFileSync(paths.state, initialState);
      console.log(`✅ Created ${paths.state}`);
    }
    
    // Check WAL
    const entries = readWAL(paths.wal);
    
    console.log('\n🚀 Antigravity Runtime Session Started');
    console.log(`   Workspace: ${options.workspace}`);
    console.log(`   WAL Entries: ${entries.length}`);
    console.log(`   Mode: governed`);
    console.log('\n   Use MCP tools or agr commands to interact.\n');
  });

// Command: agr freeze
program
  .command('freeze')
  .description('Snapshot memory (materialize WAL to STATE.md)')
  .option('-w, --workspace <path>', 'Workspace path', process.cwd())
  .action((options) => {
    const paths = getPaths(options.workspace);
    const entries = readWAL(paths.wal);
    
    if (entries.length === 0) {
      console.log('ℹ️  No WAL entries to materialize.');
      return;
    }
    
    // Read current state
    let stateContent = fs.existsSync(paths.state) 
      ? fs.readFileSync(paths.state, 'utf-8') 
      : '# STATE\n';
    
    // Append summary
    const summary = entries
      .slice(-10) // Last 10 entries
      .map(e => `- [${e.timestamp}] ${e.eventType}`)
      .join('\n');
    
    const lastHash = entries[entries.length - 1].hash;
    
    // Update context_lock in frontmatter
    stateContent = stateContent.replace(
      /context_lock: .*/,
      `context_lock: "${lastHash}"`
    );
    
    // Append materialization record
    stateContent += `\n\n## Freeze at ${new Date().toISOString()}\n\n${summary}\n`;
    
    fs.writeFileSync(paths.state, stateContent);
    
    console.log(`✅ Materialized ${entries.length} WAL entries`);
    console.log(`   Context Lock: ${lastHash.slice(0, 16)}...`);
  });

// Command: agr audit
program
  .command('audit')
  .description('Replay and display decision logs')
  .option('-w, --workspace <path>', 'Workspace path', process.cwd())
  .option('-n, --limit <number>', 'Number of entries to show', '20')
  .action((options) => {
    const paths = getPaths(options.workspace);
    const entries = readWAL(paths.wal);
    const limit = parseInt(options.limit, 10);
    
    if (entries.length === 0) {
      console.log('ℹ️  No audit log entries found.');
      return;
    }
    
    console.log(`\n📋 Antigravity Audit Log (${entries.length} total, showing last ${limit})\n`);
    console.log('─'.repeat(80));
    
    entries.slice(-limit).forEach((e, i) => {
      console.log(`#${i + 1} | ${e.timestamp}`);
      console.log(`   Event: ${e.eventType}`);
      console.log(`   Hash:  ${e.hash.slice(0, 16)}...`);
      if (e.payload.content) {
        console.log(`   Content: ${String(e.payload.content).slice(0, 60)}...`);
      }
      console.log('─'.repeat(80));
    });
  });

// Command: agr verify
program
  .command('verify')
  .description('Verify WAL hash chain integrity')
  .option('-w, --workspace <path>', 'Workspace path', process.cwd())
  .action((options) => {
    const paths = getPaths(options.workspace);
    const entries = readWAL(paths.wal);
    
    if (entries.length === 0) {
      console.log('ℹ️  No WAL entries to verify.');
      return;
    }
    
    console.log(`\n🔍 Verifying ${entries.length} WAL entries...\n`);
    
    let valid = true;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedPrev = i === 0 ? null : entries[i - 1].hash;
      
      if (entry.previousHash !== expectedPrev) {
        console.log(`❌ Entry #${i + 1}: Previous hash mismatch`);
        valid = false;
        break;
      }
      
      // Recompute hash
      const canonical = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        eventType: entry.eventType,
        payload: entry.payload,
        previousHash: entry.previousHash,
      });
      const recomputed = crypto.createHash('sha256').update(canonical).digest('hex');
      
      if (recomputed !== entry.hash) {
        console.log(`❌ Entry #${i + 1}: Hash mismatch (tampered?)`);
        valid = false;
        break;
      }
    }
    
    if (valid) {
      console.log(`✅ WAL integrity verified: ${entries.length} entries, chain unbroken`);
    } else {
      console.log(`\n⚠️  WAL INTEGRITY COMPROMISED - Entering SAFE_MODE recommended`);
    }
  });

// Command: agr status
program
  .command('status')
  .description('Show runtime health status')
  .option('-w, --workspace <path>', 'Workspace path', process.cwd())
  .action((options) => {
    const paths = getPaths(options.workspace);
    
    const stateExists = fs.existsSync(paths.state);
    const walExists = fs.existsSync(paths.wal);
    const entries = readWAL(paths.wal);
    
    console.log('\n📊 Antigravity Runtime Status\n');
    console.log(`   Workspace:     ${options.workspace}`);
    console.log(`   STATE.md:      ${stateExists ? '✅ exists' : '❌ missing'}`);
    console.log(`   WORKLOG.wal:   ${walExists ? '✅ exists' : '❌ missing'}`);
    console.log(`   WAL Entries:   ${entries.length}`);
    
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      console.log(`   Last Entry:    ${last.timestamp}`);
      console.log(`   Last Hash:     ${last.hash.slice(0, 16)}...`);
    }
    
    console.log('');
  });

program.parse();
