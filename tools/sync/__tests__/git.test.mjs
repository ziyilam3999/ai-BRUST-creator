// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

import {
  isGitRepo,
  findRepoRoot,
  addGitExclusion,
  isGitIgnored,
  isGitTracked,
  generateClaudeMd,
  getGitBranch,
  installPreCommitHook,
} from '../lib/git.mjs';

/** Helper: create a temp dir */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
}

/** Remove dir recursively */
function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Init a bare git repo in a temp dir */
function initGitRepo(dir) {
  execSync('git init', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' });
}

// --- isGitRepo ----------------------------------------------------------

describe('isGitRepo', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('returns true for an initialized git repo', () => {
    initGitRepo(tmpDir);
    expect(isGitRepo(tmpDir)).toBe(true);
  });

  it('returns false for a non-git directory', () => {
    expect(isGitRepo(tmpDir)).toBe(false);
  });
});

// --- findRepoRoot -------------------------------------------------------

describe('findRepoRoot', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('finds root from a subdirectory', () => {
    initGitRepo(tmpDir);
    const sub = path.join(tmpDir, 'a', 'b', 'c');
    fs.mkdirSync(sub, { recursive: true });

    const root = findRepoRoot(sub);
    // Normalize both paths for comparison
    expect(path.resolve(root)).toBe(path.resolve(tmpDir));
  });
});

// --- addGitExclusion ----------------------------------------------------

describe('addGitExclusion', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('adds a pattern to .git/info/exclude', () => {
    initGitRepo(tmpDir);

    const added = addGitExclusion(tmpDir, 'my-pattern');

    expect(added).toBe(true);
    const exclude = fs.readFileSync(
      path.join(tmpDir, '.git', 'info', 'exclude'),
      'utf8'
    );
    expect(exclude).toContain('my-pattern');
  });

  it('is idempotent (does not add duplicates)', () => {
    initGitRepo(tmpDir);

    addGitExclusion(tmpDir, 'dup-pattern');
    addGitExclusion(tmpDir, 'dup-pattern');

    const exclude = fs.readFileSync(
      path.join(tmpDir, '.git', 'info', 'exclude'),
      'utf8'
    );
    const matches = exclude.split('\n').filter(l => l.trim() === 'dup-pattern');
    expect(matches.length).toBe(1);
  });
});

// --- getGitBranch -------------------------------------------------------

describe('getGitBranch', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('returns current branch name', () => {
    initGitRepo(tmpDir);
    // Create initial commit so branch exists
    fs.writeFileSync(path.join(tmpDir, 'init.txt'), 'init');
    execSync('git add .', { cwd: tmpDir, stdio: 'ignore' });
    execSync('git commit -m "init"', { cwd: tmpDir, stdio: 'ignore' });

    const branch = getGitBranch(tmpDir);
    // Modern git defaults to 'main' or 'master'
    expect(['main', 'master']).toContain(branch);
  });

  it('returns "unknown" for non-git dir', () => {
    expect(getGitBranch(tmpDir)).toBe('unknown');
  });
});

// --- installPreCommitHook -----------------------------------------------

describe('installPreCommitHook', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('creates pre-commit hook file', () => {
    initGitRepo(tmpDir);

    const installed = installPreCommitHook(tmpDir);

    expect(installed).toBe(true);
    const hookPath = path.join(tmpDir, '.git', 'hooks', 'pre-commit');
    expect(fs.existsSync(hookPath)).toBe(true);
    const content = fs.readFileSync(hookPath, 'utf8');
    expect(content).toContain('#!/bin/sh');
    expect(content).toContain('node');
    expect(content).toContain('extract-docs');
  });
});

// --- generateClaudeMd ---------------------------------------------------

describe('generateClaudeMd', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('generates CLAUDE.md from copilot-instructions.md', () => {
    const source = path.join(tmpDir, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, '# Protocol\n\nSee [rules/GATES.md](rules/GATES.md) for details.');

    const result = generateClaudeMd(tmpDir);

    expect(result).toBe(true);
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('AUTO-GENERATED');
    // Path should be fixed: rules/ -> .github/rules/
    expect(claudeMd).toContain('.github/rules/GATES.md');
  });

  it('returns false when source does not exist', () => {
    expect(generateClaudeMd(tmpDir)).toBe(false);
  });
});
