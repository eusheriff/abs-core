"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VCRProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class VCRProvider {
    constructor(realProvider, mode, cassettesDir) {
        this.realProvider = realProvider;
        this.mode = mode;
        this.name = `vcr-${realProvider.name}`;
        this.cassettesDir = cassettesDir || path.join(process.cwd(), 'packages/core/test/cassettes');
        if (this.mode !== 'off' && !fs.existsSync(this.cassettesDir)) {
            try {
                fs.mkdirSync(this.cassettesDir, { recursive: true });
            }
            catch (e) {
                console.warn('[VCR] Failed to create cassettes directory (might be non-node env):', e);
            }
        }
    }
    async propose(event) {
        if (this.mode === 'off') {
            return this.realProvider.propose(event);
        }
        const hash = this.computeHash(event);
        const filename = path.join(this.cassettesDir, `${hash}.json`);
        if (this.mode === 'replay') {
            try {
                if (fs.existsSync(filename)) {
                    const content = fs.readFileSync(filename, 'utf-8');
                    const data = JSON.parse(content);
                    console.log(`[VCR] 📼 Replaying cassette: ${hash.substring(0, 8)}...`);
                    return data;
                }
                else {
                    console.warn(`[VCR] ⚠️ Cassette not found for hash ${hash}. Fallback to real provider? No, failing deterministic test.`);
                    throw new Error(`[VCR] Cassette not found: ${filename}`);
                }
            }
            catch (e) {
                console.error('[VCR] Replay failed:', e);
                throw e;
            }
        }
        // RECORD MODE
        console.log(`[VCR] 🔴 Recording cassette: ${hash.substring(0, 8)}...`);
        const response = await this.realProvider.propose(event);
        try {
            fs.writeFileSync(filename, JSON.stringify(response, null, 2));
        }
        catch (e) {
            console.error('[VCR] Failed to write cassette:', e);
        }
        return response;
    }
    computeHash(event) {
        // Hash depends on crucial inputs: event_type, payload
        // We exclude ids or timestamps that change every run to ensure determinism
        const stableInput = {
            event_type: event.event_type,
            payload: event.payload,
            // Include model config if relevant to provider, but strictly event data here
        };
        const str = JSON.stringify(stableInput);
        return crypto.createHash('sha256').update(str).digest('hex');
    }
}
exports.VCRProvider = VCRProvider;
