export type Scope = 'events:write' | 'admin:read' | 'admin:write';

export interface ApiKey {
  key: string;
  label: string;
  scopes: Scope[];
  tenantId: string;
}

// In-memory mock keys for development/initial version
// In production, this would fetch from D1 or KV
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

export async function verifyKey(token: string): Promise<ApiKey | null> {
    // Simulate async DB lookup
    const key = MOCK_KEYS.find(k => k.key === token);
    return key || null;
}

export function hasScope(key: ApiKey, requiredScope: Scope): boolean {
    return key.scopes.includes(requiredScope);
}
