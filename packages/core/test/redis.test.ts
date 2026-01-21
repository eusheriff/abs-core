
import { describe, it, expect, vi } from 'vitest';
import { RedisQueueAdapter } from '../src/infra/queue-redis';

// Mock ioredis
vi.mock('ioredis', () => {
    return {
        default: class MockRedis {
            constructor(url: string) { console.log('Mock Redis:', url); }
            async lpush(key: string, val: string) { return 1; }
            pipeline() { 
                return {
                    lpush: () => {},
                    exec: async () => {} 
                };
            }
            async quit() { }
        }
    };
});

describe('Redis Queue Integration', () => {
    it('should initialize and send messages', async () => {
        const queue = new RedisQueueAdapter('redis://localhost:6379');
        await expect(queue.send({ data: 'test' })).resolves.not.toThrow();
        await expect(queue.sendBatch([{ body: { data: 'b1' } }, { body: { data: 'b2' } }])).resolves.not.toThrow();
        await queue.close();
    });
});
