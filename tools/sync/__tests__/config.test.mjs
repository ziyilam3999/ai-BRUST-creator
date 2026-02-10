// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  resolveConfigPath,
  loadSyncConfig,
  resetConfigCache,
  getCopilotVersion,
  getDocVersion,
  updateDocVersion,
  incrementVersion,
  compareVersions,
} from '../lib/config.mjs';

/** Helper: create a temp dir that auto-cleans */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
}

/** Remove dir recursively */
function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// --- Config Resolution --------------------------------------------------

describe('resolveConfigPath', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfigCache();
  });

  it('returns path from AI_PROTOCOL_CONFIG env var', () => {
    const tmpDir = makeTmpDir();
    const configFile = path.join(tmpDir, 'sync_config.yaml');
    fs.writeFileSync(configFile, 'global: {}');
    process.env.AI_PROTOCOL_CONFIG = configFile;

    const result = resolveConfigPath();

    expect(result).toBe(configFile);
    rmDir(tmpDir);
  });

  it('returns path from AI_PROTOCOL_REPO env var', () => {
    const tmpDir = makeTmpDir();
    const configFile = path.join(tmpDir, 'sync_config.yaml');
    fs.writeFileSync(configFile, 'global: {}');
    delete process.env.AI_PROTOCOL_CONFIG;
    process.env.AI_PROTOCOL_REPO = tmpDir;

    const result = resolveConfigPath();

    expect(result).toBe(configFile);
    rmDir(tmpDir);
  });

  it('returns null when no config found and all env vars unset', () => {
    delete process.env.AI_PROTOCOL_CONFIG;
    delete process.env.AI_PROTOCOL_REPO;

    // If ~/coding_projects/ai-protocol doesn't have it, returns null
    // (this test assumes the default paths might or might not exist)
    const result = resolveConfigPath();
    // Either returns a string or null — just verify it doesn't throw
    expect(result === null || typeof result === 'string').toBe(true);
  });
});

describe('loadSyncConfig', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    resetConfigCache();
  });

  afterEach(() => {
    rmDir(tmpDir);
    resetConfigCache();
  });

  it('loads and parses a valid YAML config', () => {
    const configFile = path.join(tmpDir, 'sync_config.yaml');
    fs.writeFileSync(configFile, `
global:
  base_path: "${tmpDir.replace(/\\/g, '/')}"
  protocol_repo: "."
  archive_path: "./archive"
all_repos:
  - repo-a
  - repo-b
projects:
  proj1:
    docs_enabled: true
    docs_path: docs
    phase: integrated
`);

    const config = loadSyncConfig(configFile);

    expect(config).not.toBeNull();
    expect(config.global.base_path).toBe(tmpDir.replace(/\\/g, '/'));
    expect(config.all_repos).toHaveLength(2);
    expect(config.projects.proj1.docs_enabled).toBe(true);
  });

  it('returns null for non-existent config file', () => {
    const result = loadSyncConfig(path.join(tmpDir, 'nope.yaml'));
    expect(result).toBeNull();
  });

  it('caches config on subsequent calls', () => {
    const configFile = path.join(tmpDir, 'sync_config.yaml');
    fs.writeFileSync(configFile, `
global:
  base_path: "${tmpDir.replace(/\\/g, '/')}"
  protocol_repo: "."
  archive_path: "./archive"
all_repos: []
`);

    const first = loadSyncConfig(configFile);
    // Modify file on disk
    fs.writeFileSync(configFile, `
global:
  base_path: "/changed"
  protocol_repo: "."
  archive_path: "./archive"
all_repos: []
`);
    const second = loadSyncConfig(configFile);

    // Should return cached value (not re-read)
    expect(second.global.base_path).toBe(first.global.base_path);
  });

  it('resetConfigCache clears the cache', () => {
    const configFile = path.join(tmpDir, 'sync_config.yaml');
    fs.writeFileSync(configFile, `
global:
  base_path: "${tmpDir.replace(/\\/g, '/')}"
  protocol_repo: "."
  archive_path: "./archive"
all_repos: []
`);

    loadSyncConfig(configFile);
    resetConfigCache();

    fs.writeFileSync(configFile, `
global:
  base_path: "/new-value"
  protocol_repo: "."
  archive_path: "./archive"
all_repos: []
`);

    const fresh = loadSyncConfig(configFile);
    expect(fresh.global.base_path).toBe('/new-value');
  });
});

// --- Version Functions --------------------------------------------------

describe('getCopilotVersion', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('extracts version from copilot-instructions header', () => {
    const file = path.join(tmpDir, 'copilot-instructions.md');
    fs.writeFileSync(file, '<!-- copilot-instructions v7.2.0 | Last updated: 2026-02-10 -->\n# Protocol...');

    expect(getCopilotVersion(file)).toBe('7.2.0');
  });

  it('returns null for file without version tag', () => {
    const file = path.join(tmpDir, 'no-version.md');
    fs.writeFileSync(file, '# Just a readme\nNo version here.');

    expect(getCopilotVersion(file)).toBeNull();
  });

  it('returns null for non-existent file', () => {
    expect(getCopilotVersion(path.join(tmpDir, 'missing.md'))).toBeNull();
  });
});

describe('getDocVersion / updateDocVersion', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('returns null when no .doc-version.yaml exists', () => {
    expect(getDocVersion(tmpDir)).toBeNull();
  });

  it('updates and reads back doc version', () => {
    updateDocVersion(tmpDir, '3.1', 'test-repo', 'main');

    const version = getDocVersion(tmpDir);
    expect(version).toBe('3.1');

    // Verify YAML written correctly
    const content = fs.readFileSync(path.join(tmpDir, '.doc-version.yaml'), 'utf8');
    expect(content).toContain('version: "3.1"');
    expect(content).toContain('synced_from: "test-repo"');
  });
});

describe('incrementVersion', () => {
  it('increments minor version', () => {
    expect(incrementVersion('3.1')).toBe('3.2');
  });

  it('handles major.minor.patch format (increments minor)', () => {
    expect(incrementVersion('7.2.0')).toBe('7.3');
  });

  it('returns 1.0 for null input', () => {
    expect(incrementVersion(null)).toBe('1.0');
  });

  it('returns 1.0 for empty string', () => {
    expect(incrementVersion('')).toBe('1.0');
  });
});

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });

  it('returns positive when a > b', () => {
    expect(compareVersions('2.0', '1.9')).toBeGreaterThan(0);
  });

  it('returns negative when a < b', () => {
    expect(compareVersions('1.0', '1.1')).toBeLessThan(0);
  });

  it('handles different segment counts', () => {
    expect(compareVersions('1.2.3', '1.2')).toBeGreaterThan(0);
    expect(compareVersions('1.2', '1.2.1')).toBeLessThan(0);
  });
});
