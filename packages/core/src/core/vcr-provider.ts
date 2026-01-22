import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'crypto';
import { LLMProvider, PartialProposal } from './interfaces';
import { EventEnvelope } from './schemas';

export class VCRProvider implements LLMProvider {
    public name: string;
    private cassettesDir: string;

    constructor(
        private realProvider: LLMProvider,
        private mode: 'record' | 'replay' | 'off',
        cassettesDir?: string
    ) {
        this.name = `vcr-${realProvider.name}`;
        this.cassettesDir = cassettesDir || path.join(process.cwd(), 'packages/core/test/cassettes');
        
        if (this.mode !== 'off' && !fs.existsSync(this.cassettesDir)) {
            try {
                fs.mkdirSync(this.cassettesDir, { recursive: true });
            } catch (e) {
                console.warn('[VCR] Failed to create cassettes directory (might be non-node env):', e);
            }
        }
    }

    async propose(event: EventEnvelope): Promise<PartialProposal> {
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
                } else {
                    console.warn(`[VCR] ⚠️ Cassette not found for hash ${hash}. Fallback to real provider? No, failing deterministic test.`);
                    throw new Error(`[VCR] Cassette not found: ${filename}`);
                }
            } catch (e) {
                console.error('[VCR] Replay failed:', e);
                throw e;
            }
        }

        // RECORD MODE
        console.log(`[VCR] 🔴 Recording cassette: ${hash.substring(0, 8)}...`);
        const response = await this.realProvider.propose(event);
        
        try {
            fs.writeFileSync(filename, JSON.stringify(response, null, 2));
        } catch (e) {
            console.error('[VCR] Failed to write cassette:', e);
        }

        return response;
    }

    private computeHash(event: EventEnvelope): string {
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
