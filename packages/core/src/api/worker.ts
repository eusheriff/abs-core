import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eventsRouter } from './routes/events';
import { Dashboard } from '../ui/dashboard';
import { setDB, initSchema, getRecentLogs } from '../infra/db';
import { D1Adapter } from '../infra/db-d1';

type Bindings = {
  DB: D1Database;
  LLM_PROVIDER: string;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>();

// Middlewares
app.use('*', cors());

// Root
app.get('/', (c) => c.text('ABS Core: Active (Cloudflare Worker)'));

// Health
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'worker', version: 'v0.5-audited' }));

// Dashboard
app.get('/dashboard', async (c) => {
  // Ensure DB is set for this request context
  if (!process.env.DB_SET) {
      setDB(new D1Adapter(c.env.DB));
      // Schema check could be done here or offline
  }
  const logs = await getRecentLogs(50);
  return c.html(Dashboard({ logs }).toString());
});

// Events API
app.route('/v1/events', eventsRouter);

import { adminRouter } from './routes/admin';
app.route('/admin', adminRouter);

export default {
  fetch: async (request: Request, env: Bindings, ctx: ExecutionContext) => {
    try {
        // Inject D1 Adapter per request
        setDB(new D1Adapter(env.DB));
        
        // Polyfill process.env for shared logic
        const currentEnv = process?.env || {};
        (globalThis as any).process = { 
            env: { 
                ...currentEnv,
                ...env, 
                EXECUTION_WEBHOOK_URL: 'mock-webhook'
            } 
        };

        return await app.fetch(request, env, ctx);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown Worker Error';
        return new Response(`Worker Error: ${errorMessage}\n${(err as Error).stack || ''}`, { status: 500 });
    }
  }
};
