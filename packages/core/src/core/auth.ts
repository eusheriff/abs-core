export type Scope = 'events:write' | 'admin:read' | 'admin:write';

export interface ApiKey {
  key: string;
  label: string;
  scopes: Scope[];
  tenantId: string;
}

// D1 Database interface stub for type safety
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
}

// SHA-256 hash function for key verification
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fallback mock keys for local development (when DB is not available)
const MOCK_KEYS: ApiKey[] = [
    { 
        key: 'sk-admin-abs-v0', 
        label: 'Admin Key', 
        scopes: ['admin:read', 'admin:write', 'events:write'], 
        tenantId: 'system' 
    },
    { 
        key: 'sk-producer-v0', 
        label: 'Producer Key', 
        scopes: ['events:write'], 
        tenantId: 'demo-tenant' 
    },
    { 
        key: 'sk-dashboard-v0', 
        label: 'Dashboard ROI Key', 
        scopes: ['admin:read'], 
        tenantId: 'system' 
    }
];

/**
 * Verify an API key against D1 database (production) or mock keys (fallback).
 * Keys are stored as SHA-256 hashes for security.
 */
export async function verifyKey(token: string, db?: D1Database): Promise<ApiKey | null> {
    // If DB is provided, use secure D1 lookup
    if (db) {
        try {
            const hash = await sha256(token);
            const result = await db.prepare(
                'SELECT id, label, scopes, tenant_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL'
            ).bind(hash).first<{ id: string; label: string; scopes: string; tenant_id: string }>();
            
            if (!result) return null;
            
            return {
                key: '[REDACTED]',
                label: result.label,
                scopes: JSON.parse(result.scopes) as Scope[],
                tenantId: result.tenant_id
            };
        } catch (error) {
            // Log error but fall through to mock for resilience
            console.error('[AUTH] D1 lookup failed, falling back to mock:', error);
        }
    }
    
    // Fallback: in-memory mock keys (for dev or if D1 fails)
    const key = MOCK_KEYS.find(k => k.key === token);
    return key || null;
}

export function hasScope(key: ApiKey, requiredScope: Scope): boolean {
    return key.scopes.includes(requiredScope);
}
