import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eventsRouter } from './routes/events';
import { adminRouter } from './routes/admin';
import { Dashboard } from '../ui/dashboard';
import { getRecentLogs } from '../infra/db';
import { Metrics } from '../core/metrics';
import { requireScope } from './middleware/auth';

export type Bindings = {
    DB: unknown;
    LLM_PROVIDER: string;
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    EVENTS_QUEUE?: unknown;
    LOG_LEVEL?: string;
    ABS_MODE?: 'scanner' | 'runtime'; // New: Operation Mode
};

export type Variables = {
    apiKey?: any;
};

export function createApp() {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

    // Middlewares
    app.use('*', cors());


    // Env Injection (Node.js / Local Fallback)
    app.use('*', async (c, next) => {
        if (!c.env && typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            c.env = {
                ...process.env,
                LLM_PROVIDER: process.env.LLM_PROVIDER || 'mock',
                LOG_LEVEL: process.env.LOG_LEVEL || 'info',
                ABS_MODE: (process.env.ABS_MODE || 'runtime') as 'scanner' | 'runtime'
            };
        }
        await next();
    });

    // Root - Status Check
    app.get('/', (c) => c.text(`ABS Core v2.2: Active (${c.env?.LLM_PROVIDER || 'unknown'}) [Mode: ${c.env?.ABS_MODE || 'runtime'}]`));

    // Health Check
    app.get('/health', (c) => c.json({ 
        status: 'ok', 
        version: 'v0.6.0-beta', // Bump version capability
        env: c.env?.LLM_PROVIDER || 'unknown',
        mode: c.env?.ABS_MODE || 'runtime'
    }));


    // Dashboard
    app.get('/dashboard', async (c) => {
        try {
            const logs = await getRecentLogs(50);
            return c.html(Dashboard({ logs }).toString());
        } catch (e) {
            return c.text('Dashboard Unavailable (DB Error)', 500);
        }
    });

    // Observability Metrics (Secured)
    app.get('/metrics', requireScope('admin:read'), (c) => {
         const format = c.req.query('format');
         // JSON format for internal dashboard
         if (format === 'json') {
             return c.json(Metrics.snapshot());
         }
         // Default Prometheus format
         return c.text(Metrics.toPrometheus(), 200, {
             'Content-Type': 'text/plain; version=0.0.4'
         });
    });

    // API Routes
    app.route('/v1/events', eventsRouter);
    app.route('/admin', adminRouter);

    return app;
}
