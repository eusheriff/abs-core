"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const hono_1 = require("hono");
const db_1 = require("../../infra/db");
const adminRouter = new hono_1.Hono();
exports.adminRouter = adminRouter;
const auth_1 = require("../middleware/auth");
// Middleware: Admin Scope Check
adminRouter.use('*', (0, auth_1.requireScope)('admin:read'));
adminRouter.get('/decisions', async (c) => {
    try {
        const limit = Number(c.req.query('limit')) || 50;
        const logs = await (0, db_1.getRecentLogs)(limit);
        // Enhance logs by parsing JSON string if needed, 
        // though the UI can handle it. 
        // Let's parse it here for cleaner API response
        const enhancedLogs = logs.map((l) => ({
            ...l,
            decision_payload: typeof l.decision_payload === 'string'
                ? JSON.parse(l.decision_payload)
                : l.decision_payload
        }));
        return c.json({ data: enhancedLogs });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return c.json({ error: message }, 500);
    }
});
adminRouter.get('/status', (c) => {
    return c.json({
        status: 'active',
        uptime: process.uptime(),
        mode: process.env.LLM_PROVIDER || 'unknown'
    });
});
