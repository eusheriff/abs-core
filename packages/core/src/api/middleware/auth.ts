import { Context, Next } from 'hono';
import { verifyKey, hasScope, Scope, ApiKey } from '../../core/auth';

interface Bindings {
    DB: unknown; // D1 database binding
}

interface Variables {
    apiKey: ApiKey;
}

export const requireScope = (scope: Scope) => {
    return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
        const authHeader = c.req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, 401);
        }

        const token = authHeader.split(' ')[1];
        // Pass DB binding for D1 lookup (with fallback to mock if undefined)
        const key = await verifyKey(token, c.env?.DB as Parameters<typeof verifyKey>[1]);

        if (!key) {
            return c.json({ error: 'Unauthorized', message: 'Invalid API Key' }, 401);
        }

        if (!hasScope(key, scope)) {
            return c.json({ error: 'Forbidden', message: `Missing required scope: ${scope}` }, 403);
        }

        // Attach key to context if needed later
        c.set('apiKey', key);

        await next();
    };
};


