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

// Health Check
app.get('/health', (c) => c.json({ status: 'ok', version: '0.3.0' }));

// Routes
app.route('/v1/events', eventsRouter);

const port = Number(process.env.PORT) || 3000;
console.log(`🚀 ABS Core Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
