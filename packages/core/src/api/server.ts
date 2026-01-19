import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { config } from 'dotenv';
import { setDB, initSchema, getRecentLogs } from '../infra/db';
import { eventsRouter } from './routes/events';

// Load env
config();

const app = new Hono();

// Middlewares
app.use('*', logger());
app.use('*', cors());

// Initialize Infra (Local Node.js Mode)
import { LocalDBAdapter } from '../infra/db-local';
import { Dashboard } from '../ui/dashboard';

// Health Check
app.get('/health', (c) => c.json({ status: 'ok', version: '0.4.0' }));

// Dashboard Route
app.get('/dashboard', async (c) => {
    const logs = await getRecentLogs(50);
    return c.html(Dashboard({ logs }).toString());
});

// Routes
app.route('/v1/events', eventsRouter);
import { adminRouter } from './routes/admin';
app.route('/admin', adminRouter);

// Export app for testing/CLI
export { app };

const run = (port: number) => {
    // Inject Local Adapter when running the server
    setDB(new LocalDBAdapter(process.env.DATABASE_URL || 'abs_core.db'));
    
    initSchema().then(() => {
        console.log('✅ Local DB Schema Initialized');
    });

    console.log(`🚀 ABS Core Server running on port ${port}`);
    serve({
        fetch: app.fetch,
        port
    });
};

// Only run if called directly
if (typeof process !== 'undefined' && process.release?.name === 'node') {
    // Check if this file is being run directly (not imported)
    // In ES modules/TSX, we can check import.meta.url or similar, but for simple node scripts:
    const { argv } = process;
    // A heuristic: if the CLI isn't the parent
    if (argv[1].endsWith('server.ts')) {
        const port = Number(process.env.PORT) || 3000;
        run(port);
    }
}

export const startServer = (port: number = 3000) => {
    run(port);
};
