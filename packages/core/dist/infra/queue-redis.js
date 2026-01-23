"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisQueueAdapter = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisQueueAdapter {
    constructor(connectionString, queueName = 'events-queue') {
        this.client = new ioredis_1.default(connectionString);
        this.queueName = queueName;
        console.log(`🔌 Redis Queue Adapter connected to ${queueName}`);
    }
    async send(body, options) {
        const message = {
            id: crypto.randomUUID(),
            body,
            timestamp: new Date().toISOString(),
            ...options
        };
        await this.client.lpush(this.queueName, JSON.stringify(message));
    }
    async sendBatch(messages) {
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
exports.RedisQueueAdapter = RedisQueueAdapter;
