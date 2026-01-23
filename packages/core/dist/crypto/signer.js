"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signer = exports.CryptoService = void 0;
const node_crypto_1 = require("node:crypto");
class CryptoService {
    constructor() {
        this.secret = null;
    }
    /**
     * Initialize the signer with a secret.
     * Should be called at the entry point of the application.
     */
    init(secret) {
        if (secret) {
            this.secret = secret;
        }
        else {
            let envSecret;
            try {
                if (typeof process !== 'undefined' && process.env) {
                    envSecret = process.env.ABS_SECRET_KEY;
                }
            }
            catch (e) {
                // Ignore access errors in non-Node envs
            }
            if (envSecret) {
                this.secret = envSecret;
            }
            else {
                // Check for production mode safely
                let isProd = false;
                try {
                    if (typeof process !== 'undefined' && process.env) {
                        isProd = process.env.NODE_ENV === 'production';
                    }
                }
                catch (e) { }
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
    sign(data) {
        const key = this.secret || 'dev-secret-key';
        const content = this.stableStringify(data);
        const hmac = (0, node_crypto_1.createHmac)('sha256', key);
        hmac.update(content);
        return hmac.digest('hex');
    }
    /**
     * Deterministic JSON stringify (sorts object keys)
     */
    stableStringify(obj) {
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
exports.CryptoService = CryptoService;
exports.signer = new CryptoService();
