import { Context, Next } from 'hono';
import { verifyKey, hasScope, Scope } from '../../core/auth';

export const requireScope = (scope: Scope) => {
    return async (c: Context, next: Next) => {
        const authHeader = c.req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, 401);
        }

        const token = authHeader.split(' ')[1];
        const key = await verifyKey(token);

        if (!key) {
            return c.json({ error: 'Unauthorized', message: 'Invalid API Key' }, 401);
        }

        if (!hasScope(key, scope)) {
            return c.json({ error: 'Forbidden', message: `msg: Missing required scope: ${scope}` }, 403);
        }

        // Attach key to context if needed later
        c.set('apiKey', key);

        await next();
    };
};
