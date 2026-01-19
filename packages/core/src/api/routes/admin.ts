
import { Hono } from 'hono';
import { getRecentLogs } from '../../infra/db';

const adminRouter = new Hono();

import { requireScope } from '../middleware/auth';

// Middleware: Admin Scope Check
adminRouter.use('*', requireScope('admin:read'));

adminRouter.get('/decisions', async (c) => {
    try {
        const limit = Number(c.req.query('limit')) || 50;
        const logs = await getRecentLogs(limit);
        
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
    } catch (err: unknown) {
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

export { adminRouter };
