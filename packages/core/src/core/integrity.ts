import { signer } from '../crypto/signer';

/**
 * Enterprise-grade Integrity verification helper.
 * Implements HMAC-SHA256 hashing for Event Chaining.
 */
export class Integrity {
  /**
   * Computes the HMAC-SHA256 hash of a payload, optionally linking to a previous hash.
   * Format: HMAC(prev_hash + payload)
   */
  static computeHash(payload: string, previousHash: string | null): string {
    const data = (previousHash || '') + payload;
    return signer.sign(data);
  }

  /**
   * Scans the entire Event Chain from DB and verifies each link.
   * Returns validation result.
   */
  static async verifyFullChain(db: any): Promise<{ valid: boolean, brokenIndex?: number, totalEvents: number, details?: string }> {
    // 1. Fetch ALL events ordered by sequence (using rowid as proxy for sequence if auto-increment)
    // We assume 'events_store' exists.
    try {
        const rows = await db.all('SELECT * FROM decision_logs ORDER BY timestamp ASC');
        
        if (!rows || rows.length === 0) {
            return { valid: true, totalEvents: 0, details: 'Chain is empty' };
        }

        let previousHash: string | null = null;

        for (let i = 0; i < rows.length; i++) {
            const event = rows[i];
            
            if (i === 0) previousHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis

            // Use full_log_json as the canonical payload since that's what we signed
            const payload = event.full_log_json;
            if (!payload) {
                 return { valid: false, brokenIndex: i, totalEvents: rows.length, details: `Missing full_log_json at index ${i}` };
            }

            const computed = this.computeHash(payload, previousHash);
            
            if (computed !== event.signature) {
                return { valid: false, brokenIndex: i, totalEvents: rows.length, details: `Hash Mismatch at index ${i} (ID: ${event.decision_id || event.decision_id})` };
            }
            
            // Note: DB doesn't store previous_hash column in decision_logs usually, 
            // but if it did, we'd check it. Here we verify the CHAIN structure by re-computing.

            previousHash = event.signature;
        }

        return { valid: true, totalEvents: rows.length };

    } catch (e: any) {
        return { valid: false, totalEvents: 0, details: e.message };
    }
  }
}
