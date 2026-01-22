/**
 * Layers Module
 * 
 * Implements ADR-005: Profiles, Workspaces & Personal Layer Separation
 * 
 * IMPORTANT: This module re-exports from config-core (FS-free) and config-loaders (FS-dependent).
 * For Cloudflare Workers, only import from config-core to avoid bundling node:fs.
 */

// Core exports (FS-free - safe for Workers)
export {
  // Profile types
  ABSProfile,
  DEFAULT_PROFILE,
  
  // Workspace types
  ABSWorkspace,
  DEFAULT_WORKSPACE,
  
  // Resolution
  ResolvedConfig,
  resolveConfig,
  
  // Validation
  validateProfile,
  validateWorkspace,
} from './config-core';

// Loader exports (FS-dependent - NOT for Workers)
// These are conditionally re-exported to allow tree-shaking
export {
  loadProfile,
  loadWorkspace,
} from './config-loaders';
