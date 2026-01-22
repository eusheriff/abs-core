import { ABSContext } from '../../../core/context';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'crypto';

interface WALEntry {
  id: string;
  timestamp: string;
  eventType: string;
  payload: Record<string, unknown>;
  hash: string;
  previousHash: string | null;
}

interface VerificationResult {
  valid: boolean;
  entriesChecked: number;
  errors: string[];
  brokenAt?: number;
}

/**
 * Recompute hash for verification
 */
function recomputeHash(entry: WALEntry): string {
  const canonical = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    payload: entry.payload,
    previousHash: entry.previousHash,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Verify WAL integrity (hash chain)
 * Invariant I5: WAL can be verified for tampering
 */
export async function walVerify(ctx: ABSContext): Promise<VerificationResult> {
  const workspacePath = ctx.workspacePath || process.cwd();
  const walPath = path.join(workspacePath, '_consolidated', 'WORKLOG.wal');
  
  if (!fs.existsSync(walPath)) {
    return {
      valid: true,
      entriesChecked: 0,
      errors: [],
    };
  }
  
  const content = fs.readFileSync(walPath, 'utf-8').trim();
  if (!content) {
    return {
      valid: true,
      entriesChecked: 0,
      errors: [],
    };
  }
  
  const lines = content.split('\n').filter(l => l.trim());
  const entries: WALEntry[] = [];
  const errors: string[] = [];
  
  // Parse all entries
  for (let i = 0; i < lines.length; i++) {
    try {
      entries.push(JSON.parse(lines[i]));
    } catch (e) {
      errors.push(`Line ${i + 1}: Invalid JSON`);
    }
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      entriesChecked: lines.length,
      errors,
    };
  }
  
  // Verify hash chain
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPreviousHash = i === 0 ? null : entries[i - 1].hash;
    
    // Check previous hash pointer
    if (entry.previousHash !== expectedPreviousHash) {
      errors.push(`Entry ${i + 1}: Previous hash mismatch`);
      return {
        valid: false,
        entriesChecked: i + 1,
        errors,
        brokenAt: i,
      };
    }
    
    // Recompute and verify hash
    const recomputed = recomputeHash(entry);
    if (recomputed !== entry.hash) {
      errors.push(`Entry ${i + 1}: Hash mismatch (tampered?)`);
      return {
        valid: false,
        entriesChecked: i + 1,
        errors,
        brokenAt: i,
      };
    }
  }
  
  ctx.logger.info(`[AGR-WAL] Verification passed: ${entries.length} entries`);
  
  return {
    valid: true,
    entriesChecked: entries.length,
    errors: [],
  };
}
