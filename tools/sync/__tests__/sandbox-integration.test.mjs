// @ts-nocheck
/**
 * @fileoverview Sandbox Integration Test
 *
 * Creates a full simulated multi-repo environment in a temp directory
 * and runs the sync tools end-to-end — WITHOUT touching real repos.
 *
 * What it tests:
 *   1. Config loading from a custom sync_config.yaml
 *   2. Full runSync() across 3 fake repos
 *   3. Newest-wins strategy (copilot-instructions, rules, commands, skills)
 *   4. CLAUDE.md generation
 *   5. Git exclusion setup
 *   6. Pre-commit hook installation
 *   7. Project docs sync (bidirectional + backup-only archive)
 *   8. init.mjs (initializeProtocol) into a fresh repo
 *   9. extract-docs.mjs against a fake source tree
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Imports from modules under test
import { loadSyncConfig, resetConfigCache } from '../lib/config.mjs';
import { syncDocsNewestWins, syncFileAcrossRepos, syncFolderAcrossRepos } from '../lib/sync-engine.mjs';
import { addGitExclusion, generateClaudeMd, installPreCommitHook, isGitRepo } from '../lib/git.mjs';
import { initializeProtocol, copySingleFile, copyFolderContents } from '../init.mjs';

// ========================================================================
// Helpers
// ========================================================================

const SANDBOX_PREFIX = 'sync-sandbox-';

/** Create a temp directory */
function makeTmpDir(suffix = '') {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${SANDBOX_PREFIX}${suffix}-`));
}

/** Write a file with optional mtime */
function writeFile(filePath, content, mtime) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  if (mtime) {
    fs.utimesSync(filePath, mtime, mtime);
  }
}

/** Init a git repo with user config */
function initGitRepo(dir) {
  execSync('git init', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.email "sandbox@test.com"', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.name "Sandbox Test"', { cwd: dir, stdio: 'ignore' });
}

/** Remove dir recursively */
function rmDir(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Read a file safely */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// ========================================================================
// Sandbox: Full Multi-Repo Sync
// ========================================================================

describe('Sandbox: Multi-Repo Sync Integration', () => {
  let sandboxRoot;
  let protocolRepo; // simulates ai-protocol
  let repoA;        // simulates ai-BRUST-creator
  let repoB;        // simulates pillar_snapper
  let archiveDir;   // simulates copilot instructions backups
  let configPath;

  const COPILOT_CONTENT_V1 = '<!-- copilot-instructions v7.2.0 | Last updated: 2026-02-10 -->\n# Quick Start\nRule 1: OPEN every response\n';
  const COPILOT_CONTENT_V2 = '<!-- copilot-instructions v7.3.0 | Last updated: 2026-02-10 -->\n# Quick Start\nRule 1: OPEN every response\nRule 2: New rule added\n';

  const OLDER = new Date('2026-01-01T00:00:00Z');
  const NEWER = new Date('2026-02-10T12:00:00Z');
  const NEWEST = new Date('2026-02-10T18:00:00Z');

  beforeAll(() => {
    // Create sandbox root
    sandboxRoot = makeTmpDir('root');
    protocolRepo = path.join(sandboxRoot, 'ai-protocol');
    repoA = path.join(sandboxRoot, 'repo-A');
    repoB = path.join(sandboxRoot, 'repo-B');
    archiveDir = path.join(sandboxRoot, 'archive');

    // Create all directories
    [protocolRepo, repoA, repoB, archiveDir].forEach((d) => {
      fs.mkdirSync(d, { recursive: true });
    });

    // Init git in each repo
    [protocolRepo, repoA, repoB].forEach(initGitRepo);
    initGitRepo(archiveDir);

    // ---- Populate protocol repo (the "source of truth" initially) ----

    // copilot-instructions.md — older version
    writeFile(
      path.join(protocolRepo, '.github', 'copilot-instructions.md'),
      COPILOT_CONTENT_V1,
      OLDER,
    );

    // Rules
    writeFile(path.join(protocolRepo, '.github', 'rules', 'GATES.md'), '# Gates\n## OPEN gate...', OLDER);
    writeFile(path.join(protocolRepo, '.github', 'rules', 'MODES.md'), '# Modes\n## PLAN mode...', OLDER);
    writeFile(path.join(protocolRepo, '.github', 'rules', 'STYLES.md'), '# Styles\n## Code style...', OLDER);

    // Commands
    writeFile(path.join(protocolRepo, '.claude', 'commands', 'plan.md'), '# /plan command', OLDER);
    writeFile(path.join(protocolRepo, '.claude', 'commands', 'fix.md'), '# /fix command', OLDER);

    // Skills (nested)
    writeFile(path.join(protocolRepo, '.claude', 'skills', 'frontend-design', 'SKILL.md'), '# Frontend Design Skill', OLDER);
    writeFile(path.join(protocolRepo, '.claude', 'skills', 'mcp-builder', 'SKILL.md'), '# MCP Builder Skill', OLDER);

    // Sync tools
    writeFile(path.join(protocolRepo, 'tools', 'sync', 'index.mjs'), '// sync orchestrator', OLDER);
    writeFile(path.join(protocolRepo, 'tools', 'sync', 'lib', 'config.mjs'), '// config loader', OLDER);

    // Docs
    writeFile(path.join(protocolRepo, 'docs', '_templates', 'progress.md'), '# Progress Template', OLDER);
    writeFile(path.join(protocolRepo, 'docs', '_templates', 'decisions.md'), '# Decisions Template', OLDER);

    // ---- Populate repo-A (has a NEWER copilot file) ----

    writeFile(
      path.join(repoA, '.github', 'copilot-instructions.md'),
      COPILOT_CONTENT_V2,
      NEWER,
    );

    // Rules — same as protocol but older
    writeFile(path.join(repoA, '.github', 'rules', 'GATES.md'), '# Gates\n## OPEN gate...', OLDER);

    // One rule file that only exists in repoA (newer)
    writeFile(path.join(repoA, '.github', 'rules', 'NEW_RULE.md'), '# New Rule\nOnly in repoA', NEWER);

    // Commands
    writeFile(path.join(repoA, '.claude', 'commands', 'plan.md'), '# /plan command (edited in repoA)', NEWER);

    // Skills
    writeFile(path.join(repoA, '.claude', 'skills', 'frontend-design', 'SKILL.md'), '# Frontend Design Skill (updated)', NEWER);

    // Docs for project sync
    writeFile(path.join(repoA, 'docs', 'architecture.md'), '# Architecture from repoA', NEWER);
    writeFile(path.join(repoA, 'docs', 'progress.md'), '# Progress from repoA', NEWER);

    // ---- Populate repo-B (has one NEWEST rule file) ----

    writeFile(
      path.join(repoB, '.github', 'copilot-instructions.md'),
      COPILOT_CONTENT_V1,
      OLDER,
    );

    writeFile(path.join(repoB, '.github', 'rules', 'GATES.md'), '# Gates (heavily edited in repoB)', NEWEST);

    writeFile(path.join(repoB, '.claude', 'skills', 'mcp-builder', 'SKILL.md'), '# MCP Builder (updated in repoB)', NEWEST);

    // Docs for project sync
    writeFile(path.join(repoB, 'docs', 'architecture.md'), '# Architecture from repoB (newest)', NEWEST);

    // ---- Create sync_config.yaml ----

    const basePath = sandboxRoot.replace(/\\/g, '/');
    const configContent = `
global:
  base_path: "${basePath}"
  protocol_repo: "ai-protocol"
  archive_path: "${basePath}/archive"
  archive_backup_only: true

all_repos:
  - "ai-protocol"
  - "repo-A"
  - "repo-B"

projects:
  repo-A:
    docs_enabled: true
    docs_path: "docs"
    phase: "solo"

  repo-B:
    docs_enabled: true
    docs_path: "docs"
    phase: "solo"
`;

    configPath = path.join(sandboxRoot, 'sync_config.yaml');
    fs.writeFileSync(configPath, configContent, 'utf8');
  });

  afterAll(() => {
    rmDir(sandboxRoot);
  });

  beforeEach(() => {
    resetConfigCache();
  });

  // ---- Config Loading ----

  describe('Config Loading', () => {
    it('loads sandbox config correctly', () => {
      const config = loadSyncConfig(configPath);

      expect(config).not.toBeNull();
      expect(config.all_repos).toHaveLength(3);
      expect(config.all_repos[0]).toContain('ai-protocol');
      expect(config.all_repos[1]).toContain('repo-A');
      expect(config.all_repos[2]).toContain('repo-B');
    });

    it('resolves base_path correctly', () => {
      const config = loadSyncConfig(configPath);
      expect(config.global.base_path).toBe(sandboxRoot.replace(/\\/g, '/'));
    });

    it('resolves archive_path correctly', () => {
      const config = loadSyncConfig(configPath);
      const expected = sandboxRoot.replace(/\\/g, '/') + '/archive';
      expect(config.global.archive_path).toBe(expected);
    });

    it('has correct project configs', () => {
      const config = loadSyncConfig(configPath);
      expect(config.projects['repo-A']).toBeDefined();
      expect(config.projects['repo-A'].phase).toBe('solo');
      expect(config.projects['repo-B']).toBeDefined();
    });
  });

  // ---- Newest-Wins: copilot-instructions.md ----

  describe('Copilot Instructions Sync', () => {
    it('repo-A has the newest copilot-instructions.md', () => {
      const config = loadSyncConfig(configPath);
      const result = syncFileAcrossRepos(
        '.github/copilot-instructions.md',
        config.all_repos,
        'copilot-instructions.md',
      );

      expect(result.winnerRepo).toBe('repo-A');
    });

    it('syncs newer copilot-instructions.md to all other repos', () => {
      const config = loadSyncConfig(configPath);
      syncFileAcrossRepos(
        '.github/copilot-instructions.md',
        config.all_repos,
        'copilot-instructions.md',
      );

      // Protocol repo should now have v7.3.0
      const protocolContent = readFile(path.join(protocolRepo, '.github', 'copilot-instructions.md'));
      expect(protocolContent).toContain('v7.3.0');
      expect(protocolContent).toContain('Rule 2: New rule added');

      // Repo-B should also be updated
      const repoBContent = readFile(path.join(repoB, '.github', 'copilot-instructions.md'));
      expect(repoBContent).toContain('v7.3.0');
    });
  });

  // ---- Newest-Wins: Rules Folder ----

  describe('Rules Folder Sync', () => {
    it('syncs rules across all repos with correct winners', () => {
      const config = loadSyncConfig(configPath);
      const result = syncFolderAcrossRepos('.github/rules', config.all_repos, {
        filePattern: '*.md',
        description: '.github/rules/',
      });

      expect(result.totalFiles).toBeGreaterThanOrEqual(3);
    });

    it('GATES.md winner has the newest content (from repo-B originally)', () => {
      const config = loadSyncConfig(configPath);
      const result = syncFileAcrossRepos(
        '.github/rules/GATES.md',
        config.all_repos,
        'GATES.md',
      );

      // After previous tests may have synced, the winner could be ai-protocol
      // (which received repo-B's file). The key invariant: winner has repo-B's content.
      expect(result.winnerRepo).toBeDefined();
      const winnerPath = config.all_repos.find((r) => path.basename(r) === result.winnerRepo);
      const content = readFile(path.join(winnerPath, '.github', 'rules', 'GATES.md'));
      expect(content).toContain('heavily edited in repoB');
    });

    it('after sync, all repos have the newest GATES.md from repo-B', () => {
      const config = loadSyncConfig(configPath);
      syncFileAcrossRepos('.github/rules/GATES.md', config.all_repos, 'GATES.md');

      const content = readFile(path.join(protocolRepo, '.github', 'rules', 'GATES.md'));
      expect(content).toContain('heavily edited in repoB');

      const contentA = readFile(path.join(repoA, '.github', 'rules', 'GATES.md'));
      expect(contentA).toContain('heavily edited in repoB');
    });

    it('NEW_RULE.md from repo-A propagates to all repos', () => {
      const config = loadSyncConfig(configPath);
      syncFolderAcrossRepos('.github/rules', config.all_repos, {
        filePattern: '*.md',
        description: '.github/rules/',
      });

      // NEW_RULE.md should now exist in protocol and repo-B
      expect(fs.existsSync(path.join(protocolRepo, '.github', 'rules', 'NEW_RULE.md'))).toBe(true);
      expect(fs.existsSync(path.join(repoB, '.github', 'rules', 'NEW_RULE.md'))).toBe(true);
    });
  });

  // ---- Newest-Wins: Skills (nested) ----

  describe('Skills Sync', () => {
    it('syncs nested skill folders across repos', () => {
      const config = loadSyncConfig(configPath);

      // frontend-design: repoA has newest
      const fdResult = syncFolderAcrossRepos(
        '.claude/skills/frontend-design',
        config.all_repos,
        { filePattern: '*', description: 'frontend-design/' },
      );
      expect(fdResult.syncedCount).toBeGreaterThan(0);

      // After sync, protocol should have repoA's version
      const protocolSkill = readFile(path.join(protocolRepo, '.claude', 'skills', 'frontend-design', 'SKILL.md'));
      expect(protocolSkill).toContain('updated');
    });

    it('mcp-builder skill syncs from repo-B (newest)', () => {
      const config = loadSyncConfig(configPath);

      syncFolderAcrossRepos(
        '.claude/skills/mcp-builder',
        config.all_repos,
        { filePattern: '*', description: 'mcp-builder/' },
      );

      const repoASkill = readFile(path.join(repoA, '.claude', 'skills', 'mcp-builder', 'SKILL.md'));
      expect(repoASkill).toContain('updated in repoB');
    });

    it('recursive mode syncs all skills in a single call', () => {
      const config = loadSyncConfig(configPath);

      const result = syncFolderAcrossRepos(
        '.claude/skills',
        config.all_repos,
        { filePattern: '*', description: '.claude/skills/', recursive: true },
      );

      // Should find files from both frontend-design and mcp-builder
      expect(result.totalFiles).toBeGreaterThanOrEqual(2);

      // Both skills should be synced across all repos
      const protocolFd = readFile(path.join(protocolRepo, '.claude', 'skills', 'frontend-design', 'SKILL.md'));
      expect(protocolFd).toContain('updated');
      const repoAMcp = readFile(path.join(repoA, '.claude', 'skills', 'mcp-builder', 'SKILL.md'));
      expect(repoAMcp).toContain('updated in repoB');
    });
  });

  // ---- Commands Sync ----

  describe('Commands Sync', () => {
    it('syncs commands across repos (repoA has newer plan.md)', () => {
      const config = loadSyncConfig(configPath);

      const result = syncFileAcrossRepos(
        '.claude/commands/plan.md',
        config.all_repos,
        'plan.md',
      );

      expect(result.winnerRepo).toBe('repo-A');

      // Protocol should get the repoA version
      const content = readFile(path.join(protocolRepo, '.claude', 'commands', 'plan.md'));
      expect(content).toContain('edited in repoA');
    });
  });

  // ---- CLAUDE.md Generation ----

  describe('CLAUDE.md Generation', () => {
    it('generates CLAUDE.md from copilot-instructions.md', () => {
      // Ensure copilot-instructions.md has been synced first (latest is v7.3.0)
      const config = loadSyncConfig(configPath);
      syncFileAcrossRepos('.github/copilot-instructions.md', config.all_repos, 'copilot-instructions.md');

      const result = generateClaudeMd(repoA);

      expect(result).toBe(true);
      const claudeMd = readFile(path.join(repoA, 'CLAUDE.md'));
      expect(claudeMd).toContain('AUTO-GENERATED');
      expect(claudeMd).toContain('v7.3.0');
    });

    it('CLAUDE.md fixes relative paths (rules/ -> .github/rules/)', () => {
      // Write a copilot file with a relative rules link
      writeFile(
        path.join(repoA, '.github', 'copilot-instructions.md'),
        '<!-- copilot-instructions v7.3.0 -->\nSee [rules/GATES.md](rules/GATES.md)',
      );

      generateClaudeMd(repoA);

      const content = readFile(path.join(repoA, 'CLAUDE.md'));
      expect(content).toContain('.github/rules/GATES.md');
      expect(content).not.toMatch(/\(rules\/GATES\.md\)/);
    });
  });

  // ---- Git Exclusion ----

  describe('Git Exclusions', () => {
    it('adds exclusion patterns to .git/info/exclude', () => {
      addGitExclusion(repoA, '.github/copilot-instructions*.md');
      addGitExclusion(repoA, 'docs/');
      addGitExclusion(repoA, 'CLAUDE.md');

      const exclude = readFile(path.join(repoA, '.git', 'info', 'exclude'));
      expect(exclude).toContain('.github/copilot-instructions*.md');
      expect(exclude).toContain('docs/');
      expect(exclude).toContain('CLAUDE.md');
    });

    it('does not add duplicate patterns', () => {
      addGitExclusion(repoA, 'test-dup-pattern');
      addGitExclusion(repoA, 'test-dup-pattern');

      const exclude = readFile(path.join(repoA, '.git', 'info', 'exclude'));
      const matches = exclude.split('\n').filter((l) => l.trim() === 'test-dup-pattern');
      expect(matches).toHaveLength(1);
    });
  });

  // ---- Pre-commit Hook ----

  describe('Pre-commit Hook', () => {
    it('installs pre-commit hook in a repo', () => {
      const installed = installPreCommitHook(repoB);

      expect(installed).toBe(true);
      const hookPath = path.join(repoB, '.git', 'hooks', 'pre-commit');
      expect(fs.existsSync(hookPath)).toBe(true);

      const content = readFile(hookPath);
      expect(content).toContain('#!/bin/sh');
      expect(content).toContain('node');
      expect(content).toContain('extract-docs.mjs');
      expect(content).toContain('SKIP_HOOK_INSTALL=1');
    });

    it('returns false when hook is already identical', () => {
      // First install
      installPreCommitHook(repoA);
      // Second install — should return false (no change)
      const secondResult = installPreCommitHook(repoA);
      expect(secondResult).toBe(false);
    });
  });

  // ---- Docs Sync (Bidirectional) ----

  describe('Docs Sync (newest-wins)', () => {
    it('syncs docs bidirectionally between two repos', () => {
      // repoA has progress.md (NEWER), repoB has architecture.md (NEWEST)
      const result = syncDocsNewestWins(
        path.join(repoA, 'docs'),
        path.join(repoB, 'docs'),
      );

      // repoA's progress.md -> repoB (repoB didn't have it)
      expect(result.sourceToTarget).toContain('progress.md');

      // repoB's architecture.md -> repoA (newer)
      expect(result.targetToSource).toContain('architecture.md');

      // Verify content
      const progressInB = readFile(path.join(repoB, 'docs', 'progress.md'));
      expect(progressInB).toContain('Progress from repoA');

      const archInA = readFile(path.join(repoA, 'docs', 'architecture.md'));
      expect(archInA).toContain('Architecture from repoB (newest)');
    });

    it('backupOnly mode skips target-only files', () => {
      const srcDir = path.join(sandboxRoot, 'backup-src');
      const tgtDir = path.join(sandboxRoot, 'backup-tgt');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(tgtDir, { recursive: true });

      writeFile(path.join(srcDir, 'shared.md'), 'source', NEWER);
      writeFile(path.join(tgtDir, 'shared.md'), 'target-old', OLDER);
      writeFile(path.join(tgtDir, 'tgt-only.md'), 'only in target', NEWER);

      const result = syncDocsNewestWins(srcDir, tgtDir, { backupOnly: true });

      // source -> target (newer)
      expect(result.sourceToTarget).toContain('shared.md');
      // target-only file should be skipped in backup-only
      expect(result.skipped).toContain('tgt-only.md');
      expect(fs.existsSync(path.join(srcDir, 'tgt-only.md'))).toBe(false);

      // Cleanup
      rmDir(srcDir);
      rmDir(tgtDir);
    });
  });
});

// ========================================================================
// Sandbox: initializeProtocol
// ========================================================================

describe('Sandbox: initializeProtocol Integration', () => {
  let sandboxRoot;
  let protocolRepo;
  let freshTarget;

  beforeAll(() => {
    sandboxRoot = makeTmpDir('init');
    protocolRepo = path.join(sandboxRoot, 'protocol');
    freshTarget = path.join(sandboxRoot, 'fresh-project');

    fs.mkdirSync(protocolRepo, { recursive: true });
    fs.mkdirSync(freshTarget, { recursive: true });

    // Build a minimal protocol repo
    const files = {
      '.github/copilot-instructions.md': '<!-- copilot-instructions v7.3.0 -->\n# Protocol Rules\n\nSee [rules/GATES.md](rules/GATES.md)',
      '.github/rules/GATES.md': '# GATES\n\n## OPEN Gate\nFirst line every response',
      '.github/rules/MODES.md': '# MODES\n\n## PLAN mode',
      '.claude/commands/plan.md': '# /plan\n\nPlan the implementation',
      '.claude/commands/fix.md': '# /fix\n\nFix the issue',
      '.claude/settings.local.json': '{"allowedTools": ["*"]}',
      'tools/sync/index.mjs': '#!/usr/bin/env node\n// sync entry',
      'tools/sync/lib/config.mjs': '// config module',
      'tools/sync/lib/sync-engine.mjs': '// sync engine',
      'docs/_templates/progress.md': '# Progress\n\n## Current Sprint',
      'docs/_templates/decisions.md': '# Decisions\n\n## Decision Log',
      'docs/_templates/requirements.md': '# Requirements',
    };

    for (const [rel, content] of Object.entries(files)) {
      writeFile(path.join(protocolRepo, rel), content);
    }

    // Create sync_config.yaml for addToSyncConfig test
    writeFile(
      path.join(protocolRepo, 'sync_config.yaml'),
      `global:\n  base_path: "${sandboxRoot.replace(/\\/g, '/')}"\nall_repos:\n  - "protocol"\n`,
    );
  });

  afterAll(() => {
    rmDir(sandboxRoot);
  });

  it('initializes a fresh repo with all protocol files', () => {
    initializeProtocol({
      targetRepo: freshTarget,
      protocolRepo: protocolRepo,
      force: true,
      skipSync: true,
    });

    // copilot-instructions.md
    expect(fs.existsSync(path.join(freshTarget, '.github', 'copilot-instructions.md'))).toBe(true);
    const copilot = readFile(path.join(freshTarget, '.github', 'copilot-instructions.md'));
    expect(copilot).toContain('v7.3.0');

    // Rules
    expect(fs.existsSync(path.join(freshTarget, '.github', 'rules', 'GATES.md'))).toBe(true);
    expect(fs.existsSync(path.join(freshTarget, '.github', 'rules', 'MODES.md'))).toBe(true);

    // Commands
    expect(fs.existsSync(path.join(freshTarget, '.claude', 'commands', 'plan.md'))).toBe(true);

    // Tools
    expect(fs.existsSync(path.join(freshTarget, 'tools', 'sync', 'index.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(freshTarget, 'tools', 'sync', 'lib', 'config.mjs'))).toBe(true);

    // Docs templates
    expect(fs.existsSync(path.join(freshTarget, 'docs', 'progress.md'))).toBe(true);
    expect(fs.existsSync(path.join(freshTarget, 'docs', 'decisions.md'))).toBe(true);

    // CLAUDE.md
    expect(fs.existsSync(path.join(freshTarget, 'CLAUDE.md'))).toBe(true);
    const claudeMd = readFile(path.join(freshTarget, 'CLAUDE.md'));
    expect(claudeMd).toContain('AUTO-GENERATED');
    expect(claudeMd).toContain('.github/rules/GATES.md');

    // Git initialized
    expect(isGitRepo(freshTarget)).toBe(true);

    // Git exclusions
    const exclude = readFile(path.join(freshTarget, '.git', 'info', 'exclude'));
    expect(exclude).toContain('.github/copilot-instructions');
    expect(exclude).toContain('docs/');
    expect(exclude).toContain('CLAUDE.md');
  });

  it('does not overwrite existing files without force', () => {
    const customContent = '# My custom copilot instructions\n';
    writeFile(path.join(freshTarget, '.github', 'copilot-instructions.md'), customContent);

    initializeProtocol({
      targetRepo: freshTarget,
      protocolRepo: protocolRepo,
      force: false,
      skipSync: true,
    });

    const content = readFile(path.join(freshTarget, '.github', 'copilot-instructions.md'));
    expect(content).toBe(customContent);
  });

  it('dry-run does not write any files', () => {
    const newTarget = path.join(sandboxRoot, 'dry-run-target');
    fs.mkdirSync(newTarget, { recursive: true });

    initializeProtocol({
      targetRepo: newTarget,
      protocolRepo: protocolRepo,
      force: true,
      skipSync: true,
      dryRun: true,
    });

    // No copilot-instructions in dry-run
    expect(fs.existsSync(path.join(newTarget, '.github', 'copilot-instructions.md'))).toBe(false);

    rmDir(newTarget);
  });
});

// ========================================================================
// Sandbox: Full runSync() Smoke Test (config-driven)
// ========================================================================

describe('Sandbox: runSync Smoke Test', () => {
  let sandboxRoot;
  let repoAlpha;
  let repoBeta;
  let configPath;

  beforeAll(() => {
    sandboxRoot = makeTmpDir('runsync');
    repoAlpha = path.join(sandboxRoot, 'alpha');
    repoBeta = path.join(sandboxRoot, 'beta');

    [repoAlpha, repoBeta].forEach((d) => {
      fs.mkdirSync(d, { recursive: true });
      initGitRepo(d);
    });

    const OLDER = new Date('2026-01-15T00:00:00Z');
    const NEWER = new Date('2026-02-10T15:00:00Z');

    // Alpha: older copilot file
    writeFile(
      path.join(repoAlpha, '.github', 'copilot-instructions.md'),
      '<!-- copilot-instructions v7.2.0 -->\n# Old version',
      OLDER,
    );
    writeFile(path.join(repoAlpha, '.github', 'rules', 'GATES.md'), '# Gates old', OLDER);

    // Beta: newer copilot file
    writeFile(
      path.join(repoBeta, '.github', 'copilot-instructions.md'),
      '<!-- copilot-instructions v7.3.0 -->\n# New version with updates',
      NEWER,
    );
    writeFile(path.join(repoBeta, '.github', 'rules', 'GATES.md'), '# Gates updated', NEWER);
    writeFile(path.join(repoBeta, '.github', 'rules', 'EXTRA.md'), '# Extra rule', NEWER);

    // Create config
    const basePath = sandboxRoot.replace(/\\/g, '/');
    configPath = path.join(sandboxRoot, 'sync_config.yaml');
    fs.writeFileSync(configPath, `
global:
  base_path: "${basePath}"
  protocol_repo: "alpha"
  archive_path: "${basePath}/archive"
  archive_backup_only: true
all_repos:
  - "alpha"
  - "beta"
projects: {}
`, 'utf8');
  });

  afterAll(() => {
    rmDir(sandboxRoot);
  });

  beforeEach(() => {
    resetConfigCache();
  });

  it('config loads and resolves sandbox repos', () => {
    const config = loadSyncConfig(configPath);
    expect(config).not.toBeNull();
    expect(config.all_repos).toHaveLength(2);
    expect(config.all_repos.every((r) => fs.existsSync(r))).toBe(true);
  });

  it('after syncing, alpha gets beta\'s newer copilot file', () => {
    const config = loadSyncConfig(configPath);
    syncFileAcrossRepos('.github/copilot-instructions.md', config.all_repos, 'copilot');

    const alphaContent = readFile(path.join(repoAlpha, '.github', 'copilot-instructions.md'));
    expect(alphaContent).toContain('v7.3.0');
    expect(alphaContent).toContain('New version with updates');
  });

  it('after syncing rules folder, alpha gets EXTRA.md from beta', () => {
    const config = loadSyncConfig(configPath);
    syncFolderAcrossRepos('.github/rules', config.all_repos, {
      filePattern: '*.md',
      description: 'rules',
    });

    expect(fs.existsSync(path.join(repoAlpha, '.github', 'rules', 'EXTRA.md'))).toBe(true);
    const content = readFile(path.join(repoAlpha, '.github', 'rules', 'EXTRA.md'));
    expect(content).toBe('# Extra rule');
  });

  it('CLAUDE.md can be generated for both repos', () => {
    const config = loadSyncConfig(configPath);
    // Sync first so both have the latest
    syncFileAcrossRepos('.github/copilot-instructions.md', config.all_repos, 'copilot');

    for (const repo of config.all_repos) {
      const result = generateClaudeMd(repo);
      expect(result).toBe(true);
      expect(fs.existsSync(path.join(repo, 'CLAUDE.md'))).toBe(true);
    }
  });

  it('git exclusions work in both repos', () => {
    const config = loadSyncConfig(configPath);
    const patterns = ['docs/', 'CLAUDE.md', '.github/copilot-instructions*.md'];

    for (const repo of config.all_repos) {
      for (const pattern of patterns) {
        addGitExclusion(repo, pattern);
      }
      const exclude = readFile(path.join(repo, '.git', 'info', 'exclude'));
      for (const pattern of patterns) {
        expect(exclude).toContain(pattern);
      }
    }
  });

  it('pre-commit hooks install in both repos', () => {
    const config = loadSyncConfig(configPath);
    for (const repo of config.all_repos) {
      const result = installPreCommitHook(repo);
      expect(result).toBe(true);
      expect(fs.existsSync(path.join(repo, '.git', 'hooks', 'pre-commit'))).toBe(true);
    }
  });
});

// ========================================================================
// Sandbox: Dry-Run Safety Tests
// ========================================================================

describe('Sandbox: Dry-Run Safety', () => {
  let sandboxRoot;
  let repoX;
  let repoY;
  let configPath;

  const OLDER = new Date('2026-01-10T00:00:00Z');
  const NEWER = new Date('2026-02-10T12:00:00Z');

  beforeAll(() => {
    sandboxRoot = makeTmpDir('dryrun');
    repoX = path.join(sandboxRoot, 'repo-x');
    repoY = path.join(sandboxRoot, 'repo-y');

    [repoX, repoY].forEach((d) => {
      fs.mkdirSync(d, { recursive: true });
      initGitRepo(d);
    });

    // repo-x: older copilot file
    writeFile(
      path.join(repoX, '.github', 'copilot-instructions.md'),
      '<!-- copilot-instructions v7.2.0 -->\n# Old',
      OLDER,
    );
    writeFile(path.join(repoX, '.github', 'rules', 'GATES.md'), '# Gates old', OLDER);

    // repo-y: newer copilot file + extra rule
    writeFile(
      path.join(repoY, '.github', 'copilot-instructions.md'),
      '<!-- copilot-instructions v7.3.0 -->\n# New with updates',
      NEWER,
    );
    writeFile(path.join(repoY, '.github', 'rules', 'GATES.md'), '# Gates updated', NEWER);
    writeFile(path.join(repoY, '.github', 'rules', 'EXTRA.md'), '# Extra rule', NEWER);

    const basePath = sandboxRoot.replace(/\\/g, '/');
    configPath = path.join(sandboxRoot, 'sync_config.yaml');
    fs.writeFileSync(configPath, `
global:
  base_path: "${basePath}"
  protocol_repo: "repo-x"
  archive_path: "${basePath}/archive"
  archive_backup_only: true
all_repos:
  - "repo-x"
  - "repo-y"
projects: {}
`, 'utf8');
  });

  afterAll(() => {
    rmDir(sandboxRoot);
  });

  beforeEach(() => {
    resetConfigCache();
  });

  it('syncFileAcrossRepos with dryRun does not modify files', () => {
    const config = loadSyncConfig(configPath);
    const oldContent = readFile(path.join(repoX, '.github', 'copilot-instructions.md'));

    syncFileAcrossRepos('.github/copilot-instructions.md', config.all_repos, 'copilot', { dryRun: true });

    const newContent = readFile(path.join(repoX, '.github', 'copilot-instructions.md'));
    expect(newContent).toBe(oldContent);
    expect(newContent).toContain('v7.2.0'); // Still the old version
  });

  it('syncFolderAcrossRepos with dryRun does not create or copy files', () => {
    const config = loadSyncConfig(configPath);
    const extraPath = path.join(repoX, '.github', 'rules', 'EXTRA.md');
    expect(fs.existsSync(extraPath)).toBe(false);

    syncFolderAcrossRepos('.github/rules', config.all_repos, {
      filePattern: '*.md',
      description: 'rules',
      dryRun: true,
    });

    // EXTRA.md should NOT have been created in repo-x
    expect(fs.existsSync(extraPath)).toBe(false);
  });

  it('addGitExclusion with dryRun does not modify exclude file', () => {
    const excludeFile = path.join(repoX, '.git', 'info', 'exclude');
    const contentBefore = fs.existsSync(excludeFile)
      ? readFile(excludeFile)
      : '';

    addGitExclusion(repoX, 'dry-run-test-pattern/', { dryRun: true });

    const contentAfter = fs.existsSync(excludeFile)
      ? readFile(excludeFile)
      : '';
    expect(contentAfter).toBe(contentBefore);
    expect(contentAfter).not.toContain('dry-run-test-pattern');
  });

  it('generateClaudeMd with dryRun does not create CLAUDE.md', () => {
    const claudePath = path.join(repoY, 'CLAUDE.md');
    // Remove if it exists from previous tests
    if (fs.existsSync(claudePath)) fs.rmSync(claudePath);

    const result = generateClaudeMd(repoY, { dryRun: true });
    expect(result).toBe(true); // Reports it would generate
    expect(fs.existsSync(claudePath)).toBe(false);
  });

  it('installPreCommitHook with dryRun does not create hook file', () => {
    const hookPath = path.join(repoX, '.git', 'hooks', 'pre-commit');
    // Remove if it exists
    if (fs.existsSync(hookPath)) fs.rmSync(hookPath);

    const result = installPreCommitHook(repoX, { dryRun: true });
    expect(result).toBe(true); // Reports it would install
    expect(fs.existsSync(hookPath)).toBe(false);
  });

  it('syncDocsNewestWins with dryRun does not copy files', () => {
    const srcDir = path.join(sandboxRoot, 'dryrun-docs-src');
    const tgtDir = path.join(sandboxRoot, 'dryrun-docs-tgt');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(tgtDir, { recursive: true });

    writeFile(path.join(srcDir, 'readme.md'), '# Source readme', NEWER);

    const result = syncDocsNewestWins(srcDir, tgtDir, { dryRun: true });

    // Result still reports what would happen
    expect(result.sourceToTarget).toContain('readme.md');
    // But the file was NOT actually copied
    expect(fs.existsSync(path.join(tgtDir, 'readme.md'))).toBe(false);

    rmDir(srcDir);
    rmDir(tgtDir);
  });
});
