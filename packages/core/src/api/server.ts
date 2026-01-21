import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import path from 'path';
import { LocalDBAdapter } from '../infra/db-local';
import { setDB, initSchema } from '../infra/db';
import { createApp } from './factory';
import { signer } from '../crypto/signer';

// Load env
config();

// --------------------------------------------------------
// Redis Integration
// --------------------------------------------------------
let kvOverrides: any = {};
if (process.env.REDIS_URL) {
    console.log('🔌 Connecting to Redis for Queue Support...');
    // Dynamic import to avoid breaking non-node bundles if this file acts as shared entry (unlikely but safe)
    // Actually server.ts is strictly Node.
    const { RedisQueueAdapter } = require('../infra/queue-redis');
    kvOverrides['EVENTS_QUEUE'] = new RedisQueueAdapter(process.env.REDIS_URL);
}

// Create Unified App
const app = createApp(kvOverrides);

// Export app for testing/CLI
export { app };

const run = (port: number) => {
    // Inject Local Adapter when running the server
    // Sanitize DB Path to prevent traversal
    const rawPath = process.env.DATABASE_URL || 'abs_core.db';
    const dbPath = path.resolve(rawPath);
    
    // Initialize Signer
    signer.init(process.env.ABS_SECRET_KEY);

    console.log(`📦 Initializing Local DB using adapter at ${dbPath}`);
    setDB(new LocalDBAdapter(dbPath));
    
    initSchema().then(() => {
        console.log('✅ Local DB Schema Initialized');
    });

    console.log(`🚀 ABS Core Server running on port ${port} (Unified Runtime)`);
    serve({
        fetch: app.fetch,
        port
    });
};

export const startServer = (port: number = 3000) => {
    run(port);
};

// Only run if called directly
if (typeof process !== 'undefined' && process.release?.name === 'node') {
    const { argv } = process;
    if (argv[1] && argv[1].endsWith('server.ts')) {
        const port = Number(process.env.PORT) || 3000;
        run(port);
    }
}
