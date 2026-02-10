/**
 * @fileoverview YAML config loading & path resolution.
 *
 * Replaces the 140-line custom YAML parser in sync_copilot_instructions.ps1
 * with js-yaml (3 lines to parse) + proper path resolution.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from '../vendor/js-yaml.mjs';
import { expandHome } from './paths.mjs';

/** @typedef {import('./types.mjs').SyncConfig} SyncConfig */

/** Regex to parse version from copilot-instructions.md first line */
const VERSION_REGEX = /copilot-instructions v([\d.]+)/;

/** Singleton cache */
let cachedConfig = null;

/**
 * Reset the config cache (for testing).
 */
export function resetConfigCache() {
  cachedConfig = null;
}

/**
 * Resolve the path to sync_config.yaml.
 *
 * Priority:
 *   1. process.env.AI_PROTOCOL_CONFIG (explicit path)
 *   2. process.env.AI_PROTOCOL_REPO + '/sync_config.yaml'
 *   3. Convention: ~/coding_projects/ai-protocol/sync_config.yaml
 *   4. Legacy: C:\Users\ziyil\coding_projects\ai-protocol\sync_config.yaml (Windows only)
 *
 * @returns {string|null}
 */
export function resolveConfigPath() {
  // 1. Explicit env var
  if (process.env.AI_PROTOCOL_CONFIG) {
    const p = path.resolve(process.env.AI_PROTOCOL_CONFIG);
    if (fs.existsSync(p)) return p;
  }

  // 2. Protocol repo env var
  if (process.env.AI_PROTOCOL_REPO) {
    const p = path.join(process.env.AI_PROTOCOL_REPO, 'sync_config.yaml');
    if (fs.existsSync(p)) return p;
  }

  // 3. Convention
  const conventional = path.join(os.homedir(), 'coding_projects', 'ai-protocol', 'sync_config.yaml');
  if (fs.existsSync(conventional)) return conventional;

  // 4. Legacy (Windows only)
  if (process.platform === 'win32') {
    const legacy = 'C:\\Users\\ziyil\\coding_projects\\ai-protocol\\sync_config.yaml';
    if (fs.existsSync(legacy)) return legacy;
  }

  return null;
}

/**
 * Load and resolve sync_config.yaml.
 *
 * Replaces Load-SyncConfig from PS.
 *
 * @param {string} [configPath] - Optional explicit config path (for testing)
 * @returns {SyncConfig|null}
 */
export function loadSyncConfig(configPath) {
  if (cachedConfig) return cachedConfig;

  const resolvedPath = configPath ?? resolveConfigPath();
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const parsed = yaml.load(raw);

    if (!parsed || typeof parsed !== 'object') return null;

    const basePath = parsed.global?.base_path ?? '';
    const expandedBasePath = expandHome(basePath);

    // Build config object
    /** @type {SyncConfig} */
    const config = {
      global: {
        base_path: expandedBasePath,
        protocol_repo: parsed.global?.protocol_repo ?? '',
        archive_path: expandVariable(parsed.global?.archive_path ?? '', expandedBasePath),
        archive_backup_only: parsed.global?.archive_backup_only === true,
      },
      all_repos: [],
      projects: {},
      sync_items: parsed.sync_items ?? [],
      exclusions: parsed.exclusions ?? [],
    };

    // Resolve all_repos -> full paths
    if (Array.isArray(parsed.all_repos)) {
      config.all_repos = parsed.all_repos.map((/** @type {string} */ repo) => {
        let resolved = expandVariable(repo, expandedBasePath);
        if (!path.isAbsolute(resolved)) {
          resolved = path.join(expandedBasePath, resolved);
        }
        return resolved;
      });
    }

    // Resolve projects
    if (parsed.projects && typeof parsed.projects === 'object') {
      for (const [projectName, projectRaw] of Object.entries(parsed.projects)) {
        const proj = /** @type {any} */ (projectRaw);
        /** @type {import('./types.mjs').ProjectConfig} */
        const projectConfig = {
          docs_enabled: proj.docs_enabled ?? false,
          docs_path: proj.docs_path ?? 'docs',
          phase: proj.phase ?? 'solo',
          source_repo: '',
          sync_targets: [],
        };

        // Resolve source_repo
        if (proj.source_repo) {
          projectConfig.source_repo = expandVariable(proj.source_repo, expandedBasePath);
        }
        // D-003 FIX: If source_repo is empty, derive from base_path + projectName
        if (!projectConfig.source_repo) {
          projectConfig.source_repo = path.join(expandedBasePath, projectName);
        }

        // Resolve sync_targets
        if (Array.isArray(proj.sync_targets)) {
          projectConfig.sync_targets = proj.sync_targets.map((/** @type {any} */ t) => ({
            repo: expandVariable(t.repo, expandedBasePath),
            docs_path: t.docs_path ?? 'docs',
          }));
        }

        config.projects[projectName] = projectConfig;
      }
    }

    cachedConfig = config;
    return config;
  } catch (err) {
    console.error(`Failed to parse config: ${err.message}`);
    return null;
  }
}

/**
 * Expand ${base_path} variable in a string and resolve relative to basePath.
 * @param {string} value
 * @param {string} basePath
 * @returns {string}
 */
function expandVariable(value, basePath) {
  if (!value) return value;
  let result = value.replace(/\$\{base_path\}/g, basePath);
  result = expandHome(result);
  return result;
}

/**
 * Parse version from copilot-instructions.md first line.
 *
 * Ports: Get-CopilotVersion from PS.
 *
 * @param {string} filePath
 * @returns {string|null} Version string like "7.2.0"
 */
export function getCopilotVersion(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const firstLine = content.split('\n')[0] ?? '';
    const match = firstLine.match(VERSION_REGEX);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Parse version from .doc-version.yaml.
 *
 * Ports: Get-DocVersion from PS.
 *
 * @param {string} docsPath - Directory containing .doc-version.yaml
 * @returns {string|null} Version string like "1.5"
 */
export function getDocVersion(docsPath) {
  const versionFile = path.join(docsPath, '.doc-version.yaml');
  if (!fs.existsSync(versionFile)) return null;
  try {
    const content = fs.readFileSync(versionFile, 'utf8');
    const match = content.match(/version:\s*"?([\d.]+)"?/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Update .doc-version.yaml with new version and metadata.
 *
 * Ports: Update-DocVersion from PS.
 *
 * @param {string} docsPath
 * @param {string} newVersion
 * @param {string} repoName
 * @param {string} [branchName='unknown']
 */
export function updateDocVersion(docsPath, newVersion, repoName, branchName = 'unknown') {
  const versionFile = path.join(docsPath, '.doc-version.yaml');
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const content = `# ===============================================================
# DOCS SYNC METADATA (Informational Only)
# ===============================================================
#
# This file is auto-updated by: tools/sync/index.mjs
# NOTE: This version number is NOT used for sync decisions.
#       File sync uses timestamps (newest wins).
#       This file exists only for human reference and audit trail.
#
# ===============================================================

version: "${newVersion}"
last_sync: "${timestamp}"
synced_from: "${repoName}"
branch: "${branchName}"
`;

  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }
  fs.writeFileSync(versionFile, content, 'utf8');
}

/**
 * Increment doc version (minor bump).
 *
 * Ports: Get-IncrementedVersion from PS.
 *
 * @param {string|null} currentVersion - e.g. "1.5" or null
 * @returns {string}
 */
export function incrementVersion(currentVersion) {
  if (!currentVersion) return '1.0';
  const parts = currentVersion.split('.');
  const major = parseInt(parts[0], 10) || 1;
  const minor = (parseInt(parts[1], 10) || 0) + 1;
  return `${major}.${minor}`;
}

/**
 * Compare two version strings.
 * @param {string} a
 * @param {string} b
 * @returns {number} negative if a<b, 0 if equal, positive if a>b
 */
export function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}
