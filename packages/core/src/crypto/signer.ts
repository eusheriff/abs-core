import { createHmac } from 'node:crypto';

export class CryptoService {
  private secret: string | null = null;

  /**
   * Initialize the signer with a secret.
   * Should be called at the entry point of the application.
   */
  public init(secret?: string) {
    if (secret) {
      this.secret = secret;
    } else if (!this.secret) {
        console.warn('[CryptoService] No secret provided. Using insecure default. Set ABS_SECRET_KEY.');
        this.secret = 'default-insecure-secret-do-not-use-in-prod';
    }
  }

  /**
   * Signs a data object using HMAC-SHA256.
   * Uses a stable stringify to ensure consistent signatures.
   */
  public sign(data: unknown): string {
    const key = this.secret || 'default-insecure-secret-do-not-use-in-prod';
    const content = this.stableStringify(data);
    const hmac = createHmac('sha256', key);
    hmac.update(content);
    return hmac.digest('hex');
  }

  /**
   * Deterministic JSON stringify (sorts object keys)
   */
  private stableStringify(obj: any): string {
    if (typeof obj !== 'object' || obj === null) {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map((x) => this.stableStringify(x)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + this.stableStringify(obj[key])).join(',') + '}';
  }
}

export const signer = new CryptoService();
