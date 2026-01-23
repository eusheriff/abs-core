"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireScope = void 0;
const auth_1 = require("../../core/auth");
const requireScope = (scope) => {
    return async (c, next) => {
        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, 401);
        }
        const token = authHeader.split(' ')[1];
        // Pass DB binding for D1 lookup (with fallback to mock if undefined)
        const key = await (0, auth_1.verifyKey)(token, c.env?.DB);
        if (!key) {
            return c.json({ error: 'Unauthorized', message: 'Invalid API Key' }, 401);
        }
        if (!(0, auth_1.hasScope)(key, scope)) {
            return c.json({ error: 'Forbidden', message: `Missing required scope: ${scope}` }, 403);
        }
        // Attach key to context if needed later
        c.set('apiKey', key);
        await next();
    };
};
exports.requireScope = requireScope;
