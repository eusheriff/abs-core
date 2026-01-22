import { ABSContext } from '../../../core/context';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface WALEntry {
  id: string;
  timestamp: string;
  eventType: string;
  payload: Record<string, unknown>;
  hash: string;
  previousHash: string | null;
}

/**
 * Get the WAL file path for the current workspace
 */
function getWALPath(ctx: ABSContext): string {
  const workspacePath = ctx.workspacePath || process.cwd();
  const walDir = path.join(workspacePath, '_consolidated');
  
  // Ensure directory exists
  if (!fs.existsSync(walDir)) {
    fs.mkdirSync(walDir, { recursive: true });
  }
  
  return path.join(walDir, 'WORKLOG.wal');
}

/**
 * Compute SHA-256 hash for WAL chain integrity
 */
function computeHash(entry: Omit<WALEntry, 'hash'>, previousHash: string | null): string {
  const canonical = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    payload: entry.payload,
    previousHash,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Read last entry from WAL to get previous hash
 */
function getLastEntry(walPath: string): WALEntry | null {
  if (!fs.existsSync(walPath)) {
    return null;
  }
  
  const content = fs.readFileSync(walPath, 'utf-8').trim();
  if (!content) return null;
  
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return null;
  
  try {
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

/**
 * Append entry to WAL (Write-Ahead Log)
 * Invariant I3: WAL entries are hash-chained for integrity
 */
export async function walWrite(
  input: { entry: string; eventType?: string; metadata?: Record<string, unknown> },
  ctx: ABSContext
): Promise<{ success: boolean; entryId: string; hash: string }> {
  const walPath = getWALPath(ctx);
  const lastEntry = getLastEntry(walPath);
  
  const entryId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  const newEntry: Omit<WALEntry, 'hash'> = {
    id: entryId,
    timestamp,
    eventType: input.eventType || 'agr.wal.append',
    payload: {
      content: input.entry,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId,
      ...input.metadata,
    },
    previousHash: lastEntry?.hash || null,
  };
  
  const hash = computeHash(newEntry, lastEntry?.hash || null);
  const fullEntry: WALEntry = { ...newEntry, hash };
  
  // Append to WAL (atomic via newline-delimited JSON)
  fs.appendFileSync(walPath, JSON.stringify(fullEntry) + '\n');
  
  ctx.logger.info(`[AGR-WAL] Entry appended: ${entryId}`);
  
  return {
    success: true,
    entryId,
    hash,
  };
}
