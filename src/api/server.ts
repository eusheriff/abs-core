import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { config } from 'dotenv';
import { initDB } from '../infra/db';
import { eventsRouter } from './routes/events';

// Load env
config();

const app = new Hono();

// Middlewares
app.use('*', logger());
app.use('*', cors());

// Initialize Infra (Local Node.js Mode)
import { setDB, initSchema } from '../infra/db';
import { LocalDBAdapter } from '../infra/db-local';

// Inject Local Adapter
setDB(new LocalDBAdapter(process.env.DATABASE_URL || 'abs_core.db'));

initSchema().then(() => {
    console.log('✅ Local DB Schema Initialized');
});

import { getRecentLogs } from '../infra/db';
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

const port = Number(process.env.PORT) || 3000;
console.log(`🚀 ABS Core Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
