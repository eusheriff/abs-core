/**
 * Asymmetric Cryptography for Non-Repudiation
 * 
 * HMAC provides integrity + authenticity for secret holders.
 * Ed25519 provides non-repudiation for third parties.
 * 
 * Per NIST SP 800-57: Non-repudiation requires asymmetric signatures.
 * Reference: https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final
 */

import * as ed from '@noble/ed25519';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface AsymmetricSignature {
  /** Algorithm identifier */
  alg: 'Ed25519';
  /** Key identifier for rotation support */
  key_id: string;
  /** Hex-encoded signature value */
  value: string;
  /** Hex-encoded public key for verification */
  public_key: string;
  /** ISO-8601 timestamp of signing */
  signed_at: string;
}

/**
 * Ed25519 Asymmetric Signer for Non-Repudiation
 * 
 * Unlike HMAC (symmetric), Ed25519 allows:
 * - Third-party verification without sharing secrets
 * - Provable authorship (non-repudiation)
 * - Key rotation with public key publication
 */
export class AsymmetricSigner {
  constructor(
    private privateKey: Uint8Array,
    public readonly publicKey: Uint8Array,
    public readonly keyId: string
  ) {}

  /**
   * Sign a message and return a verifiable signature object
   */
  async sign(message: string): Promise<AsymmetricSignature> {
    const msgBytes = new TextEncoder().encode(message);
    // v1.7.3 returns Promise automatically
    const sig = await ed.sign(msgBytes, this.privateKey);
    
    return {
      alg: 'Ed25519',
      key_id: this.keyId,
      value: Buffer.from(sig).toString('hex'),
      public_key: Buffer.from(this.publicKey).toString('hex'),
      signed_at: new Date().toISOString()
    };
  }

  // ...

  static async verify(
    message: string,
    signature: AsymmetricSignature
  ): Promise<boolean> {
    if (signature.alg !== 'Ed25519') {
      return false;
    }
    
    try {
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = Buffer.from(signature.value, 'hex');
      const pubBytes = Buffer.from(signature.public_key, 'hex');
      
      return await ed.verify(sigBytes, msgBytes, pubBytes);
    } catch {
      return false;
    }
  }

  static async verifyWithKnownKey(
    message: string,
    signatureHex: string,
    publicKeyHex: string
  ): Promise<boolean> {
    try {
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = Buffer.from(signatureHex, 'hex');
      const pubBytes = Buffer.from(publicKeyHex, 'hex');
      
      return await ed.verify(sigBytes, msgBytes, pubBytes);
    } catch {
      return false;
    }
  }

  static async generate(keyId?: string): Promise<AsymmetricSigner> {
    // v1.7.3 utils.randomPrivateKey() works
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKey(privateKey);
    const id = keyId || `key-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    
    return new AsymmetricSigner(privateKey, publicKey, id);
  }
}

/**
 * Key Registry for Multi-Tenant Scenarios
 * Maps tenant IDs to their public keys for verification
 */
export class PublicKeyRegistry {
  private keys: Map<string, { publicKey: string; validFrom: string; validUntil?: string }> = new Map();

  register(keyId: string, publicKeyHex: string, validFrom?: string, validUntil?: string): void {
    this.keys.set(keyId, {
      publicKey: publicKeyHex,
      validFrom: validFrom || new Date().toISOString(),
      validUntil
    });
  }

  getPublicKey(keyId: string): string | null {
    const entry = this.keys.get(keyId);
    if (!entry) return null;
    
    const now = new Date().toISOString();
    if (entry.validUntil && now > entry.validUntil) return null;
    if (now < entry.validFrom) return null;
    
    return entry.publicKey;
  }

  async verifyWithRegistry(
    message: string,
    signature: AsymmetricSignature
  ): Promise<{ valid: boolean; reason?: string }> {
    const registeredKey = this.getPublicKey(signature.key_id);
    
    if (!registeredKey) {
      return { valid: false, reason: 'KEY_NOT_FOUND' };
    }
    
    if (registeredKey !== signature.public_key) {
      return { valid: false, reason: 'KEY_MISMATCH' };
    }
    
    const isValid = await AsymmetricSigner.verify(message, signature);
    return { valid: isValid, reason: isValid ? undefined : 'SIGNATURE_INVALID' };
  }
}
// TODO: Enable in tsconfig.json after migrating output to ESM or finding a CJS-compatible Ed25519 library.
