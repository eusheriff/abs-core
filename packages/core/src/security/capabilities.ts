import * as crypto from 'crypto';

export interface CapabilityToken {
  tokenId: string;
  subject: string; // who
  issuer: string;  // abs-core
  capabilities: string[]; // what they can do
  issuedAt: Date;
  expiresAt: Date;
  signature: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  expired: boolean;
  capabilities: string[];
  error?: string;
}

const SECRET_KEY = process.env.ABS_SECRET_KEY || 'abs-dev-secret-key';

/**
 * Sign a capability token
 */
function signToken(payload: Omit<CapabilityToken, 'signature'>): string {
  const canonical = JSON.stringify({
    tokenId: payload.tokenId,
    subject: payload.subject,
    issuer: payload.issuer,
    capabilities: payload.capabilities,
    issuedAt: payload.issuedAt.toISOString(),
    expiresAt: payload.expiresAt.toISOString(),
  });
  
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(canonical)
    .digest('hex');
}

/**
 * Issue a new capability token
 */
export function issueCapabilityToken(
  subject: string,
  capabilities: string[],
  expiresInMs: number = 3600000 // 1 hour default
): CapabilityToken {
  const now = new Date();
  
  const tokenPayload: Omit<CapabilityToken, 'signature'> = {
    tokenId: crypto.randomUUID(),
    subject,
    issuer: 'abs-core',
    capabilities,
    issuedAt: now,
    expiresAt: new Date(now.getTime() + expiresInMs),
  };
  
  return {
    ...tokenPayload,
    signature: signToken(tokenPayload),
  };
}

/**
 * Verify a capability token
 */
export function verifyCapabilityToken(token: CapabilityToken): TokenVerificationResult {
  // Check expiration
  const now = new Date();
  if (new Date(token.expiresAt) < now) {
    return {
      valid: false,
      expired: true,
      capabilities: [],
      error: 'Token has expired',
    };
  }
  
  // Verify signature
  const expectedSignature = signToken({
    tokenId: token.tokenId,
    subject: token.subject,
    issuer: token.issuer,
    capabilities: token.capabilities,
    issuedAt: new Date(token.issuedAt),
    expiresAt: new Date(token.expiresAt),
  });
  
  if (token.signature !== expectedSignature) {
    return {
      valid: false,
      expired: false,
      capabilities: [],
      error: 'Invalid signature',
    };
  }
  
  return {
    valid: true,
    expired: false,
    capabilities: token.capabilities,
  };
}

/**
 * Check if a token has a specific capability
 */
export function hasCapability(token: CapabilityToken, capability: string): boolean {
  const verification = verifyCapabilityToken(token);
  if (!verification.valid) return false;
  
  return verification.capabilities.includes(capability) || 
         verification.capabilities.includes('*'); // wildcard
}

/**
 * Standard capability scopes
 */
export const CAPABILITIES = {
  WAL_READ: 'wal:read',
  WAL_WRITE: 'wal:write',
  TOOL_EXECUTE: 'tool:execute',
  SAFE_MODE: 'runtime:safe_mode',
  ADMIN: '*',
} as const;
