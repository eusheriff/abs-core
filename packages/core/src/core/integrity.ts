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
   * Verifies if a chain link is valid.
   */
  static verifyChain(currentHash: string, payload: string, previousHash: string | null): boolean {
    const computed = this.computeHash(payload, previousHash);
    return computed === currentHash;
  }
}
