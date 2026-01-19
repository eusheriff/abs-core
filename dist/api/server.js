"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.app = void 0;
const hono_1 = require("hono");
const node_server_1 = require("@hono/node-server");
const logger_1 = require("hono/logger");
const cors_1 = require("hono/cors");
const dotenv_1 = require("dotenv");
const db_1 = require("../infra/db");
const events_1 = require("./routes/events");
// Load env
(0, dotenv_1.config)();
const app = new hono_1.Hono();
exports.app = app;
// Middlewares
app.use('*', (0, logger_1.logger)());
app.use('*', (0, cors_1.cors)());
// Initialize Infra (Local Node.js Mode)
const db_local_1 = require("../infra/db-local");
const dashboard_1 = require("../ui/dashboard");
// Health Check
app.get('/health', (c) => c.json({ status: 'ok', version: '0.4.0' }));
// Dashboard Route
app.get('/dashboard', async (c) => {
    const logs = await (0, db_1.getRecentLogs)(50);
    return c.html((0, dashboard_1.Dashboard)({ logs }).toString());
});
// Routes
app.route('/v1/events', events_1.eventsRouter);
const run = (port) => {
    // Inject Local Adapter when running the server
    (0, db_1.setDB)(new db_local_1.LocalDBAdapter(process.env.DATABASE_URL || 'abs_core.db'));
    (0, db_1.initSchema)().then(() => {
        console.log('✅ Local DB Schema Initialized');
    });
    console.log(`🚀 ABS Core Server running on port ${port}`);
    (0, node_server_1.serve)({
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
const startServer = (port = 3000) => {
    run(port);
};
exports.startServer = startServer;
