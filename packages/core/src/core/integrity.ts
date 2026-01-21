import { createHash } from 'node:crypto';

/**
 * Enterprise-grade Integrity verification helper.
 * Implements SHA-256 hashing for Event Chaining.
 */
export class Integrity {
  /**
   * Computes the SHA-256 hash of a payload, optionally linking to a previous hash.
   * Format: SHA256(prev_hash + payload)
   */
  static computeHash(payload: string, previousHash: string | null): string {
    const data = (previousHash || '') + payload;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Scans the entire Event Chain from DB and verifies each link.
   * Returns validation result.
   */
  static async verifyFullChain(db: any): Promise<{ valid: boolean, brokenIndex?: number, totalEvents: number, details?: string }> {
    // 1. Fetch ALL events ordered by sequence (using rowid as proxy for sequence if auto-increment)
    // We assume 'events_store' exists.
    try {
        const rows = await db.all('SELECT * FROM events_store ORDER BY rowid ASC');
        
        if (!rows || rows.length === 0) {
            return { valid: true, totalEvents: 0, details: 'Chain is empty' };
        }

        let previousHash: string | null = null;

        for (let i = 0; i < rows.length; i++) {
            const event = rows[i];
            
            // Recompute strict hash
            // The stored payload is a stringified JSON.
            // Note: In `events.ts`, we do JSON.stringify(event.payload).
            // However, the Integrity.computeHash takes JSON.stringify(current_event_envelope) ??
            // Let's check events.ts logic again.
            // events.ts: "const hash = Integrity.computeHash(JSON.stringify(event), previousHash);" . Where event is the Envelope.
            // But when saving to DB, we insert "JSON.stringify(event.payload)" into 'payload' column?
            // Wait, event.payload inside envelope -> DB payload column.
            // We need to reconstruct the strict Envelope object to re-hash.
            
            // We need to be careful about reconstruction.
            // If we stored the *entire* envelope as JSON in a column, it would be easier.
            // But events_store schema typically splits fields.
            /*
                id, tenant_id, type, payload (json string), source, timestamp, status, hash, previous_hash
            */
            // The Original Event Envelope had: event_id, event_type, source, tenant_id, correlation_id, occurred_at, payload...
            // We need to re-assemble exactly what was passed to computeHash.
            // In events.ts:
            /*
                const event = validation.data; // This is the full Envelope.
                const hash = Integrity.computeHash(JSON.stringify(event), previousHash);
            */
            // So we need to reconstruct `event` object identically.
            // CAUTION: JSON.stringify order key matters.
            
            // The database row has:
            // id (event_id), tenant_id, type (event_type), payload (string), source, timestamp (store time? or occurred_at?), status, hash, previous_hash.
            // Where is `correlation_id` and `occurred_at`?
            // If they are missing from columns, we CANNOT reconstruct the exact string to verify hash!
            // Let's check Schema or Migration.
            // If we lost data, we can't Audit perfectly.
            
            // Re-checking events.ts insert:
            /*
               INSERT INTO events_store ... VALUES (..., event.event_id, event.tenant_id, event.event_type, JSON.stringify(event.payload), event.source, ...)
            */
            // It seems we only stored specific fields.
            // Wait, does the payload column store the whole envelope? No, just payload?
            // If we hashed `JSON.stringify(event)` (Envelope), but persisted only parts, we broke Auditability unless we stored the full blob or all parts.
            
            // Checking events.ts again...
            // It inserts specific columns.
            // If I look at gatekeeper.test.ts create table:
            // CREATE TABLE ... payload TEXT ...
            
            // CRITICAL FINDING: If we are not storing the exact string that was hashed, we cannot verify it later.
            // We should check if `payload` column actually stores the full envelope, OR if we need to fix `events.ts` to store the raw envelope.
            // Or if we need to change how we hash (hash only what we store).
            
            // Let's check `events.ts` Insert statement in detail.
            /*
             INSERT INTO events_store (
                id, tenant_id, type, payload, source, timestamp, status, hash, previous_hash
            ) ...
             VALUES (
                event.event_id, ..., JSON.stringify(event.payload), ...
            )
            */
            // We are losing `correlation_id` and `occurred_at` if they aren't in columns.
            // And `metadata`?
            // If we hashed the WHOLE envelope, but stored partials, verification fails.
            
            // Temporary Workaround/Assumption for this Plan:
            // 1. We acknowledge this flaw (Audit Gap).
            // 2. We proceed assuming `payload` contains enough, OR we fix the storage.
            // Since this is "Blockchain Lite", we MUST fix the data integrity model.
            
            // FIX: We should hash what we store (Canonical Data).
            // OR store the full envelope.
            
            // Given "Hardening" goal, I will modify `events.ts` to hash ONLY the stored fields (Canonical serialization) OR hash the RAW `payload` if we treat the whole input as payload.
            // But `events.ts` takes schema-validated object.
            
            // Let's reconstruct an object from DB columns that closely mimics the important parts,
            // OR change `events.ts` to store `full_event_json`.
            // Adding a column is risky for existing data (Schema migration needed).
            
            // Alternative: In `events.ts`, change hashing to only use stored columns + payload.
            // fields: id, tenant_id, type, source, timestamp(inserted?), payload.
            // But timestamp in DB is `new Date().toISOString()` which might differ slightly from `event.occurred_at` if not careful.
            
            // For now, let's implement the verification logic assuming we CAN reconstruct.
            // I'll try to reconstruct based on columns. If it fails, I'll log "Partial Verification".
            
            // Wait, `gatekeeper.test.ts` schema has `payload TEXT`.
            // In my implementation, I should probably try to verify the `hash` integrity even if I can't check payload content perfectly yet?
            // No, verifyChain does `computeHash(payload...`.
            
            // DECISION: To make this work NOW without massive migration, 
            // I will update `events.ts` to hash a "Canonical String" of the fields we actually persist.
            // Canonical = event_id + tenant_id + event_type + source + timestamp + JSON.stringify(payload).
            
            // However, that changes the hash for future events. Old events (if any) will fail verification.
            // Since this is a new feature (Audit), maybe we accept breaking old hashes or assume DB is empty/test.
            
            // Actually, better: Store `full_event_json` in the table.
            // `gatekeeper.test.ts` schema creates the table.
            // Real migration `0000_init.sql`?
            // Let's look at `0000_init.sql` again if possible. Or I can just check `db-local.ts`.
            
            // For this Session: I will implement `verifyFullChain` attempting to reconstruct the envelope.
            // If reconstruction is impossible (missing fields), I will flag it.
            
            // Reconstructing:
            // The stored `timestamp` in `events_store` seems to be ingestion time.
            // The `event` envelope has `occurred_at`.
            // If we didn't store `occurred_at`, we can't verify signature of the envelope.
            
            // I will start by implementing a generic "verify" that takes a reconstructor function if needed.
            // But for now, let's just write the skeleton.
            
            // NOTE: For the CLI to work, I will update `events.ts` to store `correlation_id` in the `payload` or a new column?
            // Wait, `events.ts` has `correlation_id` in insert options?
            // No: 
            /*
            INSERT INTO events_store (id, tenant_id, type, payload, source, timestamp, status, hash, previous_hash)
            */
            // `correlation_id` is missing from Insert.
            
            // I will update `integrity.ts` to verify "what is stored" (i.e. we verify the chain of stored rows, not the original envelope).
            // This guarantees DB row integrity (tamper proofing storage), if not full provenance.
            // Canonical String for Row: `id|tenant_id|type|source|timestamp|payload_hash`
            
            // Let's assume for this task that I update `events.ts` to hash the *Canonical Stored Row Representation* instead of the Raw Envelope.
            // That allows verification.
            
            // Constructing Canonical String:
            const canonical = `${event.id}:${event.tenant_id}:${event.type}:${event.source}:${event.timestamp}:${event.payload}`;
            
            // NOTE: If I change hashing algo in `events.ts`, I must do it in this PR.
            const computed = this.computeHash(canonical, previousHash);
            
            if (computed !== event.hash) {
                return { valid: false, brokenIndex: i, totalEvents: rows.length, details: `Hash Mismatch at index ${i} (ID: ${event.id})` };
            }
            
            if (event.previous_hash !== previousHash) {
                 return { valid: false, brokenIndex: i, totalEvents: rows.length, details: `Link Broken at index ${i} (ID: ${event.id}). PrevHash mismatch.` };
            }

            previousHash = event.hash;
        }

        return { valid: true, totalEvents: rows.length };

    } catch (e: any) {
        return { valid: false, totalEvents: 0, details: e.message };
    }
  }
}
