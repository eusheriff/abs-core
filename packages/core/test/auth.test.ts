import { describe, it, expect } from 'vitest';
import { verifyKey, hasScope, ApiKey } from '../src/core/auth';
import { eventsRouter } from '../src/api/routes/events';
import { Hono } from 'hono';

describe('AuthZ Core', () => {
    it('should verify a valid mock key', async () => {
        const key = await verifyKey('sk-admin-abs-v0');
        expect(key).not.toBeNull();
        expect(key?.tenantId).toBe('system');
        expect(key?.scopes).toContain('admin:write');
    });

    it('should return null for invalid key', async () => {
        const key = await verifyKey('invalid-key');
        expect(key).toBeNull();
    });

    it('should validate scopes correctly', () => {
        const mockKey: ApiKey = {
            key: 'test',
            label: 'test',
            scopes: ['events:write'],
            tenantId: 'test'
        };
        expect(hasScope(mockKey, 'events:write')).toBe(true);
        expect(hasScope(mockKey, 'admin:read')).toBe(false);
    });
});

describe('AuthZ Middleware (Integration)', () => {
    const app = new Hono();
    app.route('/events', eventsRouter);

    it('should block request without Authorization header', async () => {
        const res = await app.request('/events', {
            method: 'POST',
            body: JSON.stringify({ event_type: 'test', foo: 'bar' })
        });
        expect(res.status).toBe(401);
    });

    it('should block request with invalid token', async () => {
        const res = await app.request('/events', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'Authorization': 'Bearer invalid-token' }
        });
        expect(res.status).toBe(401);
    });

    it('should block request with valid token but missing scope', async () => {
        // Use dashboard key which only has admin:read, lacking events:write
        const res = await app.request('/events', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'Authorization': 'Bearer sk-dashboard-v0' }
        });
        expect(res.status).toBe(403);
    });
    
    // Note: Valid request test would require valid body payload + mocking DB/LLM, 
    // skipping full success path here to focus on AuthZ rejection.
});
