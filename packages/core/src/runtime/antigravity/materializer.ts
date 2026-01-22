/**
 * State Materializer
 * 
 * Consolidates WAL entries into STATE.md snapshot.
 * Protocol:
 *   1. Read STATE.md (current snapshot)
 *   2. Replay pending WAL entries since last context_lock
 *   3. Apply changes and update context_lock
 *   4. Write new STATE.md
 */

import { ABSContext } from '../../core/context';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface StateDocument {
  schema_version: string;
  session_id: string;
  mode: 'governed' | 'shadow' | 'emergency';
  context_lock: string | null;
  current_objective: {
    id: string;
    status: string;
    owner: string;
  };
  constraints: {
    allowed_tools: string[];
    forbidden_paths: string[];
  };
  body: string; // Markdown content after frontmatter
}

interface WALEntry {
  id: string;
  timestamp: string;
  eventType: string;
  payload: Record<string, unknown>;
  hash: string;
  previousHash: string | null;
}

/**
 * Parse STATE.md with YAML frontmatter
 */
function parseState(content: string): StateDocument {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    // No frontmatter, return defaults
    return {
      schema_version: '1.0.0',
      session_id: crypto.randomUUID(),
      mode: 'governed',
      context_lock: null,
      current_objective: {
        id: 'unknown',
        status: 'unknown',
        owner: 'unknown',
      },
      constraints: {
        allowed_tools: [],
        forbidden_paths: [],
      },
      body: content,
    };
  }
  
  const frontmatter = yaml.parse(frontmatterMatch[1]);
  return {
    schema_version: frontmatter.schema_version || '1.0.0',
    session_id: frontmatter.session_id || crypto.randomUUID(),
    mode: frontmatter.mode || 'governed',
    context_lock: frontmatter.context_lock || null,
    current_objective: frontmatter.current_objective || { id: 'unknown', status: 'unknown', owner: 'unknown' },
    constraints: frontmatter.constraints || { allowed_tools: [], forbidden_paths: [] },
    body: frontmatterMatch[2],
  };
}

/**
 * Serialize state back to markdown with frontmatter
 */
function serializeState(state: StateDocument): string {
  const frontmatter = yaml.stringify({
    schema_version: state.schema_version,
    session_id: state.session_id,
    mode: state.mode,
    context_lock: state.context_lock,
    current_objective: state.current_objective,
    constraints: state.constraints,
  });
  
  return `---\n${frontmatter}---\n${state.body}`;
}

/**
 * Read WAL entries
 */
function readWAL(walPath: string): WALEntry[] {
  if (!fs.existsSync(walPath)) {
    return [];
  }
  
  const content = fs.readFileSync(walPath, 'utf-8').trim();
  if (!content) return [];
  
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

/**
 * Get pending WAL entries (since last context_lock)
 */
function getPendingEntries(entries: WALEntry[], contextLock: string | null): WALEntry[] {
  if (!contextLock) {
    return entries; // All entries are pending
  }
  
  const lockIndex = entries.findIndex(e => e.hash === contextLock);
  if (lockIndex === -1) {
    return entries; // Lock not found, replay all
  }
  
  return entries.slice(lockIndex + 1);
}

/**
 * Materialize state from WAL
 */
export async function materializeState(ctx: ABSContext): Promise<{
  success: boolean;
  entriesApplied: number;
  newContextLock: string | null;
}> {
  const workspacePath = ctx.workspacePath || process.cwd();
  const consolidatedDir = path.join(workspacePath, '_consolidated');
  const statePath = path.join(consolidatedDir, 'STATE.md');
  const walPath = path.join(consolidatedDir, 'WORKLOG.wal');
  
  // Ensure directory exists
  if (!fs.existsSync(consolidatedDir)) {
    fs.mkdirSync(consolidatedDir, { recursive: true });
  }
  
  // Read current state
  let currentState: StateDocument;
  if (fs.existsSync(statePath)) {
    currentState = parseState(fs.readFileSync(statePath, 'utf-8'));
  } else {
    currentState = {
      schema_version: '1.0.0',
      session_id: ctx.correlationId,
      mode: 'governed',
      context_lock: null,
      current_objective: { id: 'init', status: 'pending', owner: 'system' },
      constraints: { allowed_tools: [], forbidden_paths: [] },
      body: '# STATE\n\n> Initialized by Antigravity Runtime\n',
    };
  }
  
  // Read and filter WAL entries
  const allEntries = readWAL(walPath);
  const pendingEntries = getPendingEntries(allEntries, currentState.context_lock);
  
  if (pendingEntries.length === 0) {
    ctx.logger.info('[AGR-MATERIALIZER] No pending entries to apply');
    return {
      success: true,
      entriesApplied: 0,
      newContextLock: currentState.context_lock,
    };
  }
  
  // Apply entries (append summary to body)
  const summary = pendingEntries
    .map(e => `- [${e.timestamp}] ${e.eventType}: ${JSON.stringify(e.payload.content || e.payload).slice(0, 100)}`)
    .join('\n');
  
  currentState.body += `\n\n## Materialized at ${new Date().toISOString()}\n\n${summary}\n`;
  
  // Update context lock to last entry hash
  const lastEntry = pendingEntries[pendingEntries.length - 1];
  currentState.context_lock = lastEntry.hash;
  
  // Write updated state
  fs.writeFileSync(statePath, serializeState(currentState));
  
  ctx.logger.info(`[AGR-MATERIALIZER] Applied ${pendingEntries.length} entries, new lock: ${lastEntry.hash.slice(0, 8)}...`);
  
  return {
    success: true,
    entriesApplied: pendingEntries.length,
    newContextLock: lastEntry.hash,
  };
}

export default materializeState;
