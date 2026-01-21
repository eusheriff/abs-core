
import Redis from 'ioredis';

// Mimics Cloudflare Queue Interface
export interface QueueSendOptions {
    contentType?: string;
}

export interface MessageSendRequest<Body = unknown> {
    body: Body;
    contentType?: string;
}

export class RedisQueueAdapter<T = unknown> {
    private client: Redis;
    private queueName: string;

    constructor(connectionString: string, queueName: string = 'events-queue') {
        this.client = new Redis(connectionString);
        this.queueName = queueName;
        console.log(`🔌 Redis Queue Adapter connected to ${queueName}`);
    }

    async send(body: T, options?: QueueSendOptions): Promise<void> {
        const message = {
            id: crypto.randomUUID(),
            body,
            timestamp: new Date().toISOString(),
            ...options
        };
        await this.client.lpush(this.queueName, JSON.stringify(message));
    }

    async sendBatch(messages: Iterable<MessageSendRequest<T>>): Promise<void> {
        const pipeline = this.client.pipeline();
        for (const msg of messages) {
            const message = {
                id: crypto.randomUUID(),
                body: msg.body,
                timestamp: new Date().toISOString(),
                contentType: msg.contentType
            };
            pipeline.lpush(this.queueName, JSON.stringify(message));
        }
        await pipeline.exec();
    }
    
    // Helper to close connection (for tests/shutdown)
    async close() {
        await this.client.quit();
    }
}
