/**
 * Layer Configuration - Core Types & Logic (FS-Free)
 * 
 * Implements ADR-005: Profiles, Workspaces & Personal Layer Separation
 * 
 * This module contains ONLY types, defaults, and pure logic.
 * NO file system imports - safe for Cloudflare Workers.
 * 
 * For file loaders, see config-loaders.ts
 */

import {
  CognitionProfile,
  AutonomyLevel,
  RiskThreshold,
  DEFAULT_COGNITION_PROFILE,
} from '../chi/types';

// ============================================
// PROFILE TYPES (ADR-005 Section 2)
// ============================================

/**
 * User/Organization Profile
 */
export interface ABSProfile {
  /** Schema version */
  version: string;
  
  /** Identity */
  identity: {
    user_id?: string;
    org_id?: string;
    role: 'developer' | 'admin' | 'auditor';
  };
  
  /** Global preferences */
  preferences: {
    default_risk_threshold: RiskThreshold;
    require_approval_for_delete: boolean;
    enable_prospective_risk: boolean;
  };
  
  /** Allowed capabilities */
  capabilities: {
    can_disable_safe_mode: boolean;
    can_bypass_approval: boolean;
    max_autonomy_level: AutonomyLevel;
  };
}

/**
 * Default profile (restrictive)
 */
export const DEFAULT_PROFILE: ABSProfile = {
  version: '1.0.0',
  identity: {
    role: 'developer',
  },
  preferences: {
    default_risk_threshold: 'medium',
    require_approval_for_delete: true,
    enable_prospective_risk: true,
  },
  capabilities: {
    can_disable_safe_mode: false,
    can_bypass_approval: false,
    max_autonomy_level: 'medium',
  },
};

// ============================================
// WORKSPACE TYPES (ADR-005 Section 3)
// ============================================

/**
 * Workspace Configuration
 */
export interface ABSWorkspace {
  /** Schema version */
  version: string;
  
  /** Project identity */
  project: {
    name: string;
    type: 'backend' | 'frontend' | 'monorepo' | 'library' | 'other';
  };
  
  /** Local overrides (cannot exceed Profile limits) */
  overrides: {
    risk_threshold?: RiskThreshold;
    allowed_paths: string[];
    forbidden_paths: string[];
  };
  
  /** Cognition profile for this workspace */
  cognition: Partial<CognitionProfile>;
}

/**
 * Default workspace (inherits from profile)
 */
export const DEFAULT_WORKSPACE: ABSWorkspace = {
  version: '1.0.0',
  project: {
    name: 'unnamed',
    type: 'other',
  },
  overrides: {
    allowed_paths: ['*'],
    forbidden_paths: ['secrets/', '.env*'],
  },
  cognition: {},
};

// ============================================
// LAYER RESOLUTION
// ============================================

/**
 * Resolved configuration (after merging all layers)
 */
export interface ResolvedConfig {
  /** Source layers used */
  sources: {
    kernel: boolean;
    profile: string | null;
    workspace: string | null;
  };
  
  /** Effective values */
  risk_threshold: RiskThreshold;
  autonomy_level: AutonomyLevel;
  allowed_paths: string[];
  forbidden_paths: string[];
  requires_approval_on: string[];
  cognition: CognitionProfile;
  
  /** Capabilities (from Profile, never from Workspace) */
  capabilities: ABSProfile['capabilities'];
}

/**
 * Resolve configuration from all layers
 * 
 * Resolution order (from ADR-005):
 * 1. Kernel defaults (immutable base)
 * 2. Profile overrides (if allowed by Kernel)
 * 3. Workspace overrides (if allowed by Profile)
 */
export function resolveConfig(
  profile: ABSProfile = DEFAULT_PROFILE,
  workspace: ABSWorkspace = DEFAULT_WORKSPACE,
): ResolvedConfig {
  // Start with Kernel defaults
  const resolved: ResolvedConfig = {
    sources: {
      kernel: true,
      profile: null,
      workspace: null,
    },
    risk_threshold: DEFAULT_COGNITION_PROFILE.risk_threshold,
    autonomy_level: DEFAULT_COGNITION_PROFILE.autonomy_level,
    allowed_paths: ['*'],
    forbidden_paths: DEFAULT_COGNITION_PROFILE.forbid,
    requires_approval_on: DEFAULT_COGNITION_PROFILE.requires_approval_on,
    cognition: { ...DEFAULT_COGNITION_PROFILE },
    capabilities: { ...DEFAULT_PROFILE.capabilities },
  };
  
  // Apply Profile (Invariant P-I1: cannot exceed Kernel limits)
  resolved.sources.profile = profile.identity.user_id || profile.identity.org_id || 'default';
  resolved.risk_threshold = profile.preferences.default_risk_threshold;
  resolved.capabilities = { ...profile.capabilities };
  
  // Apply Workspace (Invariant W-I1: cannot exceed Profile limits)
  resolved.sources.workspace = workspace.project.name;
  
  // Workspace risk threshold: can only be more restrictive
  if (workspace.overrides.risk_threshold) {
    if (isMoreRestrictive(workspace.overrides.risk_threshold, resolved.risk_threshold)) {
      resolved.risk_threshold = workspace.overrides.risk_threshold;
    }
  }
  
  // Merge paths
  resolved.allowed_paths = workspace.overrides.allowed_paths;
  resolved.forbidden_paths = [
    ...resolved.forbidden_paths,
    ...workspace.overrides.forbidden_paths,
  ];
  
  // Apply cognition overrides
  if (workspace.cognition) {
    // Autonomy level: workspace cannot exceed profile limit
    if (workspace.cognition.autonomy_level) {
      const profileMax = profile.capabilities.max_autonomy_level;
      if (isAutonomyWithinLimit(workspace.cognition.autonomy_level, profileMax)) {
        resolved.cognition.autonomy_level = workspace.cognition.autonomy_level;
      }
    }
    
    // Other cognition fields: can only restrict
    if (workspace.cognition.max_iterations) {
      resolved.cognition.max_iterations = Math.min(
        workspace.cognition.max_iterations,
        resolved.cognition.max_iterations,
      );
    }
    
    if (workspace.cognition.forbid) {
      resolved.cognition.forbid = [
        ...resolved.cognition.forbid,
        ...workspace.cognition.forbid,
      ];
    }
    
    if (workspace.cognition.requires_approval_on) {
      resolved.cognition.requires_approval_on = [
        ...resolved.cognition.requires_approval_on,
        ...workspace.cognition.requires_approval_on,
      ];
    }
  }
  
  return resolved;
}

// ============================================
// VALIDATION (Pure - no FS)
// ============================================

/**
 * Validate profile schema
 */
export function validateProfile(input: any): ABSProfile {
  const profile = { ...DEFAULT_PROFILE };
  
  if (input.version) profile.version = String(input.version);
  
  if (input.identity) {
    profile.identity = {
      ...profile.identity,
      ...input.identity,
    };
  }
  
  if (input.preferences) {
    profile.preferences = {
      ...profile.preferences,
      ...input.preferences,
    };
  }
  
  if (input.capabilities) {
    profile.capabilities = {
      ...profile.capabilities,
      ...input.capabilities,
    };
  }
  
  return profile;
}

/**
 * Validate workspace configuration (without path checking - use validateWorkspaceWithPath for that)
 */
export function validateWorkspace(input: any): ABSWorkspace {
  const workspace = { ...DEFAULT_WORKSPACE };
  
  if (input.version) workspace.version = String(input.version);
  
  if (input.project) {
    workspace.project = {
      ...workspace.project,
      ...input.project,
    };
  }
  
  if (input.overrides) {
    workspace.overrides = {
      ...workspace.overrides,
      ...input.overrides,
    };
  }
  
  if (input.cognition) {
    workspace.cognition = input.cognition;
  }
  
  return workspace;
}

// ============================================
// HELPERS
// ============================================

/**
 * Compare risk thresholds (lower = more restrictive)
 */
function isMoreRestrictive(a: RiskThreshold, b: RiskThreshold): boolean {
  const order: Record<RiskThreshold, number> = { low: 1, medium: 2, high: 3 };
  return order[a] < order[b];
}

/**
 * Check if autonomy level is within limit
 */
function isAutonomyWithinLimit(level: AutonomyLevel, limit: AutonomyLevel): boolean {
  const order: Record<AutonomyLevel, number> = { low: 1, medium: 2, high: 3 };
  return order[level] <= order[limit];
}
