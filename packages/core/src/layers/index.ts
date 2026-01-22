/**
 * Layers Module
 * 
 * Implements ADR-005: Profiles, Workspaces & Personal Layer Separation
 */

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
  
  // Loaders
  loadProfile,
  loadWorkspace,
} from './config';
