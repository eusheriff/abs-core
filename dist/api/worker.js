"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const events_1 = require("./routes/events");
const dashboard_1 = require("../ui/dashboard");
const db_1 = require("../infra/db");
const db_d1_1 = require("../infra/db-d1");
const app = new hono_1.Hono();
// Middlewares
app.use('*', (0, cors_1.cors)());
// Root
app.get('/', (c) => c.text('ABS Core: Active (Cloudflare Worker)'));
// Health
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'worker', version: 'v0.5-audited' }));
// Dashboard
app.get('/dashboard', async (c) => {
    // Ensure DB is set for this request context
    if (!process.env.DB_SET) {
        (0, db_1.setDB)(new db_d1_1.D1Adapter(c.env.DB));
        // Schema check could be done here or offline
    }
    const logs = await (0, db_1.getRecentLogs)(50);
    return c.html((0, dashboard_1.Dashboard)({ logs }).toString());
});
// Events API
app.route('/v1/events', events_1.eventsRouter);
exports.default = {
    fetch: async (request, env, ctx) => {
        try {
            // Inject D1 Adapter per request
            (0, db_1.setDB)(new db_d1_1.D1Adapter(env.DB));
            // Polyfill process.env for shared logic
            const currentEnv = process?.env || {};
            globalThis.process = {
                env: {
                    ...currentEnv,
                    ...env,
                    EXECUTION_WEBHOOK_URL: 'mock-webhook'
                }
            };
            return await app.fetch(request, env, ctx);
        }
        catch (err) {
            return new Response(`Worker Error: ${err.message}\n${err.stack}`, { status: 500 });
        }
    }
};
