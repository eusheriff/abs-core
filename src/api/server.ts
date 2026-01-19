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

// Initialize Infra
initDB(process.env.DATABASE_URL || 'abs_core.db');

import { getRecentLogs } from '../infra/db';
import { Dashboard } from '../ui/dashboard';

// Health Check
app.get('/health', (c) => c.json({ status: 'ok', version: '0.4.0' }));

// Dashboard Route
app.get('/dashboard', (c) => {
    const logs = getRecentLogs(50);
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
