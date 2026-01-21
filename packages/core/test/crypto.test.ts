import { expect, test, describe } from 'vitest';
import { CryptoService } from '../src/crypto/signer';

describe('CryptoService', () => {
    test('Should generate deterministic signatures', () => {
        const signer = new CryptoService();
        signer.init('test-secret');

        const data = { decision: 'ALLOW', user: 'alice' };
        const sig1 = signer.sign(data);
        const sig2 = signer.sign(data);

        expect(sig1).toBeTypeOf('string');
        expect(sig1).toBe(sig2);
    });

    test('Should be sensitive to data changes', () => {
        const signer = new CryptoService();
        signer.init('test-secret');

        const data = { decision: 'ALLOW' };
        const tampered = { decision: 'DENY' };

        expect(signer.sign(data)).not.toBe(signer.sign(tampered));
    });

    test('Should be sensitive to secret changes', () => {
        const signer1 = new CryptoService();
        signer1.init('secret-A');

        const signer2 = new CryptoService();
        signer2.init('secret-B');

        const data = { decision: 'ALLOW' };
        expect(signer1.sign(data)).not.toBe(signer2.sign(data));
    });

    test('Should handle key ordering (Stable Stringify)', () => {
        const signer = new CryptoService();
        signer.init('test-secret');

        const obj1 = { a: 1, b: 2, c: { d: 4, e: 5 } };
        const obj2 = { c: { e: 5, d: 4 }, b: 2, a: 1 }; // Mixed order

        expect(signer.sign(obj1)).toBe(signer.sign(obj2));
    });
});
