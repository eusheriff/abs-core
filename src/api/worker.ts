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

export default {
  fetch: async (request: Request, env: Bindings, ctx: ExecutionContext) => {
    // Inject D1 Adapter per request (env is available here)
    setDB(new D1Adapter(env.DB));
    
    // Pass env to process.env (Mocking for shared logic if needed, 
    // though Hono usually passes it via c.env)
    // We might need to adjust providers to look at c.env instead of process.env
    // For now, let's rely on Hono context passing or global injection
    
    // Quick Hack: Polyfill process.env for the shared logic that relies on it
    // CAUTION: This is strictly for the shared code compatibility
    (globalThis as any).process = { 
        env: { 
            ...env, 
            ...process?.env,
            EXECUTION_WEBHOOK_URL: 'https://example.com/webhook' // Mock for now
        } 
    };

    return app.fetch(request, env, ctx);
  }
};
