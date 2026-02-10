// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

import {
  copySingleFile,
  copyFolderContents,
  setupGitExclusions,
  initializeProtocol,
} from '../init.mjs';

/** Helper: create a temp dir */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'init-test-'));
}

/** Remove dir recursively */
function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Create a minimal protocol repo structure */
function createProtocolRepo(dir) {
  const files = {
    '.github/copilot-instructions.md': '<!-- copilot-instructions v7.2.0 -->\n# Protocol',
    '.github/rules/GATES.md': '# Gates',
    '.github/rules/MODES.md': '# Modes',
    '.claude/commands/plan.md': '/plan command',
    '.claude/settings/settings.json': '{}',
    'tools/sync/index.mjs': '// sync',
    'tools/sync/lib/config.mjs': '// config',
    'docs/_templates/progress.md': '# Progress',
    'docs/_templates/decisions.md': '# Decisions',
    'tmp/README.md': '# Temp',
  };

  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

// --- copySingleFile -----------------------------------------------------

describe('copySingleFile', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('copies a file to a new location', () => {
    const src = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'dest', 'file.txt');
    fs.writeFileSync(src, 'hello');

    const result = copySingleFile(src, dest);

    expect(result).toBe(true);
    expect(fs.readFileSync(dest, 'utf8')).toBe('hello');
  });

  it('does not overwrite without force', () => {
    const src = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'dest.txt');
    fs.writeFileSync(src, 'new content');
    fs.writeFileSync(dest, 'existing');

    const result = copySingleFile(src, dest);

    expect(result).toBe(false);
    expect(fs.readFileSync(dest, 'utf8')).toBe('existing');
  });

  it('overwrites with force flag', () => {
    const src = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'dest.txt');
    fs.writeFileSync(src, 'new content');
    fs.writeFileSync(dest, 'existing');

    const result = copySingleFile(src, dest, { force: true });

    expect(result).toBe(true);
    expect(fs.readFileSync(dest, 'utf8')).toBe('new content');
  });

  it('does nothing in dry-run mode', () => {
    const src = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'dest', 'file.txt');
    fs.writeFileSync(src, 'hello');

    const result = copySingleFile(src, dest, { dryRun: true });

    expect(result).toBe(true); // reports success
    expect(fs.existsSync(dest)).toBe(false); // but didn't write
  });

  it('returns false when source does not exist', () => {
    const dest = path.join(tmpDir, 'dest.txt');
    const result = copySingleFile(path.join(tmpDir, 'nope.txt'), dest);

    expect(result).toBe(false);
  });
});

// --- copyFolderContents -------------------------------------------------

describe('copyFolderContents', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('copies all files from source folder', () => {
    const srcDir = path.join(tmpDir, 'src');
    const destDir = path.join(tmpDir, 'dest');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'a.txt'), 'aaa');
    fs.writeFileSync(path.join(srcDir, 'b.txt'), 'bbb');

    const count = copyFolderContents(srcDir, destDir);

    expect(count).toBeGreaterThanOrEqual(2);
    expect(fs.readFileSync(path.join(destDir, 'a.txt'), 'utf8')).toBe('aaa');
    expect(fs.readFileSync(path.join(destDir, 'b.txt'), 'utf8')).toBe('bbb');
  });

  it('returns 0 for non-existent source folder', () => {
    const count = copyFolderContents(path.join(tmpDir, 'nope'), path.join(tmpDir, 'dest'));
    expect(count).toBe(0);
  });
});

// --- setupGitExclusions -------------------------------------------------

describe('setupGitExclusions', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('creates .git/info/exclude entries for protocol files', () => {
    // Init git repo
    execSync('git init', { cwd: tmpDir, stdio: 'ignore' });

    setupGitExclusions(tmpDir);

    const exclude = fs.readFileSync(
      path.join(tmpDir, '.git', 'info', 'exclude'),
      'utf8'
    );
    // Should contain the standard protocol exclusion patterns
    expect(exclude).toContain('.github/copilot-instructions');
    expect(exclude).toContain('.github/rules/');
    expect(exclude).toContain('docs/');
  });

  it('is a no-op in dry-run mode', () => {
    execSync('git init', { cwd: tmpDir, stdio: 'ignore' });

    setupGitExclusions(tmpDir, { dryRun: true });

    const exclude = fs.readFileSync(
      path.join(tmpDir, '.git', 'info', 'exclude'),
      'utf8'
    );
    // Dry run should not add our patterns
    expect(exclude).not.toContain('.github/copilot-instructions');
  });
});

// --- initializeProtocol (integration-level) -----------------------------

describe('initializeProtocol', () => {
  let protocolDir;
  let targetDir;

  beforeEach(() => {
    protocolDir = makeTmpDir();
    targetDir = makeTmpDir();
    createProtocolRepo(protocolDir);
  });

  afterEach(() => {
    rmDir(protocolDir);
    rmDir(targetDir);
  });

  it('copies protocol files to target repo (dry-run)', () => {
    // Dry-run mode: doesn't actually write but shouldn't throw
    expect(() => {
      initializeProtocol({
        targetRepo: targetDir,
        protocolRepo: protocolDir,
        force: false,
        skipSync: true,
        dryRun: true,
      });
    }).not.toThrow();
  });

  it('copies copilot-instructions.md to target', () => {
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });

    initializeProtocol({
      targetRepo: targetDir,
      protocolRepo: protocolDir,
      force: true,
      skipSync: true,
    });

    const dest = path.join(targetDir, '.github', 'copilot-instructions.md');
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, 'utf8')).toContain('copilot-instructions v7.2.0');
  });

  it('copies rules folder to target', () => {
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });

    initializeProtocol({
      targetRepo: targetDir,
      protocolRepo: protocolDir,
      force: true,
      skipSync: true,
    });

    expect(fs.existsSync(path.join(targetDir, '.github', 'rules', 'GATES.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.github', 'rules', 'MODES.md'))).toBe(true);
  });

  it('copies sync tools to target', () => {
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });

    initializeProtocol({
      targetRepo: targetDir,
      protocolRepo: protocolDir,
      force: true,
      skipSync: true,
    });

    expect(fs.existsSync(path.join(targetDir, 'tools', 'sync', 'index.mjs'))).toBe(true);
  });

  it('copies docs templates', () => {
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });

    initializeProtocol({
      targetRepo: targetDir,
      protocolRepo: protocolDir,
      force: true,
      skipSync: true,
    });

    expect(fs.existsSync(path.join(targetDir, 'docs', 'progress.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'docs', 'decisions.md'))).toBe(true);
  });

  it('does not overwrite existing files without force', () => {
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });

    // Pre-create a file
    const existing = path.join(targetDir, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, 'custom content');

    initializeProtocol({
      targetRepo: targetDir,
      protocolRepo: protocolDir,
      force: false,
      skipSync: true,
    });

    expect(fs.readFileSync(existing, 'utf8')).toBe('custom content');
  });
});
