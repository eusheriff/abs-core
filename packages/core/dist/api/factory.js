"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const events_1 = require("./routes/events");
const admin_1 = require("./routes/admin");
const reviews_1 = require("./routes/reviews");
const supervise_1 = require("./routes/supervise"); // New Import
const dashboard_1 = require("../ui/dashboard");
const db_1 = require("../infra/db");
const metrics_1 = require("../core/metrics");
const auth_1 = require("./middleware/auth");
function createApp(envOverrides) {
    const app = new hono_1.Hono();
    // Middlewares
    app.use('*', (0, cors_1.cors)());
    // Env Injection (Node.js / Local Fallback / Overrides)
    app.use('*', async (c, next) => {
        try {
            if (!c.env && typeof process !== 'undefined' && process.env) {
                // @ts-ignore
                c.env = {
                    ...process.env,
                    LLM_PROVIDER: process.env.LLM_PROVIDER || 'mock',
                    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
                    ABS_MODE: (process.env.ABS_MODE || 'runtime')
                };
            }
        }
        catch (e) {
            console.error('Env Injection Error', e);
        }
        // Apply Overrides (e.g. Queue Adapter)
        if (envOverrides) {
            c.env = { ...c.env, ...envOverrides };
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
            const logs = await (0, db_1.getRecentLogs)(50);
            return c.html((0, dashboard_1.Dashboard)({ logs }).toString());
        }
        catch (e) {
            return c.text('Dashboard Unavailable (DB Error)', 500);
        }
    });
    // Observability Metrics (Secured)
    app.get('/metrics', (0, auth_1.requireScope)('admin:read'), (c) => {
        const format = c.req.query('format');
        // JSON format for internal dashboard
        if (format === 'json') {
            return c.json(metrics_1.Metrics.snapshot());
        }
        // Default Prometheus format
        return c.text(metrics_1.Metrics.toPrometheus(), 200, {
            'Content-Type': 'text/plain; version=0.0.4'
        });
    });
    // API Routes
    app.route('/v1/events', events_1.eventsRouter);
    app.route('/admin', admin_1.adminRouter);
    app.route('/admin/reviews', reviews_1.reviewsRouter);
    app.route('/v1/supervise', supervise_1.superviseRouter); // New Endpoint
    return app;
}
