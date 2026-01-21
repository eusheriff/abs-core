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
    } else {
        let envSecret: string | undefined;
        try {
            if (typeof process !== 'undefined' && process.env) {
                envSecret = process.env.ABS_SECRET_KEY;
            }
        } catch (e) {
            // Ignore access errors in non-Node envs
        }

        if (envSecret) {
            this.secret = envSecret;
        } else {
            // Check for production mode safely
            let isProd = false;
            try {
                if (typeof process !== 'undefined' && process.env) {
                    isProd = process.env.NODE_ENV === 'production';
                }
            } catch (e) {}

            if (isProd) {
                throw new Error('[CryptoService] ABS_SECRET_KEY is required in production.');
            }
            console.warn('[CryptoService] No secret provided. Using insecure dev default.');
            this.secret = 'dev-secret-key';
        }
    }
  }

  /**
   * Signs a data object using HMAC-SHA256.
   * Uses a stable stringify to ensure consistent signatures.
   */
  public sign(data: unknown): string {
    const key = this.secret || 'dev-secret-key';
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
