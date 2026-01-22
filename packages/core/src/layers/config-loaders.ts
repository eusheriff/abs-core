/**
 * Layer Configuration - File Loaders (FS-Dependent)
 * 
 * This module contains file system operations for loading configs.
 * NOT safe for Cloudflare Workers - use config-core.ts for Worker builds.
 * 
 * For types and pure logic, see config-core.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

import {
  ABSProfile,
  ABSWorkspace,
  DEFAULT_PROFILE,
  DEFAULT_WORKSPACE,
  validateProfile,
  validateWorkspace,
} from './config-core';

// Re-export for convenience
export { ABSProfile, ABSWorkspace };

// ============================================
// FILE LOADERS
// ============================================

/**
 * Load profile from file
 */
export function loadProfile(profilePath: string): ABSProfile {
  if (!fs.existsSync(profilePath)) {
    return DEFAULT_PROFILE;
  }
  
  const content = fs.readFileSync(profilePath, 'utf-8');
  const parsed = yaml.parse(content);
  
  // Validate schema (Invariant P-I2)
  return validateProfile(parsed);
}

/**
 * Load workspace configuration
 */
export function loadWorkspace(workspacePath: string): ABSWorkspace {
  const configPath = path.join(workspacePath, '.abs', 'workspace.yaml');
  
  if (!fs.existsSync(configPath)) {
    return DEFAULT_WORKSPACE;
  }
  
  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.parse(content);
  
  // Validate and filter paths within workspace (Invariant W-I2)
  const workspace = validateWorkspace(parsed);
  
  // Additional path validation
  workspace.overrides.allowed_paths = workspace.overrides.allowed_paths.filter(
    (p) => !path.isAbsolute(p) || p.startsWith(workspacePath),
  );
  
  return workspace;
}
