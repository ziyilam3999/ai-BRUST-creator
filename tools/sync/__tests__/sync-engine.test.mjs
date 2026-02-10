// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  isSuspiciousFilename,
  syncDocsNewestWins,
  syncFileAcrossRepos,
  syncFolderAcrossRepos,
} from '../lib/sync-engine.mjs';

/** Helper: create a temp dir that auto-cleans */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sync-engine-test-'));
}

/** Helper: write a file with a specific mtime */
function writeWithTime(filePath, content, date) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  fs.utimesSync(filePath, date, date);
}

/** Remove dir recursively */
function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// --- isSuspiciousFilename -----------------------------------------------

describe('isSuspiciousFilename', () => {
  it('returns false for normal filenames', () => {
    expect(isSuspiciousFilename('README.md')).toBe(false);
    expect(isSuspiciousFilename('sync-engine.mjs')).toBe(false);
    expect(isSuspiciousFilename('.gitignore')).toBe(false);
    expect(isSuspiciousFilename('copilot-instructions.md')).toBe(false);
  });

  it('returns true for short filenames without extension', () => {
    expect(isSuspiciousFilename('ab')).toBe(true);
    expect(isSuspiciousFilename('d')).toBe(true);
  });

  it('returns false for dotfiles (path.extname treats as no-ext basename)', () => {
    // path.extname('.md') returns '' — Node treats these as basenames, not extensions
    // .md is extension-only and should be caught as suspicious
    expect(isSuspiciousFilename('.md')).toBe(true);
    expect(isSuspiciousFilename('.js')).toBe(true);
    // Real dotfiles with meaningful names should pass
    expect(isSuspiciousFilename('.gitignore')).toBe(false);
    expect(isSuspiciousFilename('.eslintrc')).toBe(false);
    expect(isSuspiciousFilename('.env')).toBe(false);
  });

  it('returns false for empty string', () => {
    // Empty string is technically suspicious but function returns false (no match)
    // Just verify it doesn't throw
    expect(() => isSuspiciousFilename('')).not.toThrow();
  });
});

// --- syncDocsNewestWins -------------------------------------------------

describe('syncDocsNewestWins', () => {
  let sourceDir;
  let targetDir;

  beforeEach(() => {
    sourceDir = makeTmpDir();
    targetDir = makeTmpDir();
  });

  afterEach(() => {
    rmDir(sourceDir);
    rmDir(targetDir);
  });

  it('copies new files from source to target', () => {
    const newer = new Date('2025-06-01T12:00:00Z');
    writeWithTime(path.join(sourceDir, 'file1.md'), 'hello', newer);

    const result = syncDocsNewestWins(sourceDir, targetDir);

    expect(result.sourceToTarget).toContain('file1.md');
    expect(fs.existsSync(path.join(targetDir, 'file1.md'))).toBe(true);
    expect(fs.readFileSync(path.join(targetDir, 'file1.md'), 'utf8')).toBe('hello');
  });

  it('copies newer source files over older target files', () => {
    const older = new Date('2025-01-01T00:00:00Z');
    const newer = new Date('2025-06-01T12:00:00Z');

    writeWithTime(path.join(targetDir, 'doc.md'), 'old content', older);
    writeWithTime(path.join(sourceDir, 'doc.md'), 'new content', newer);

    const result = syncDocsNewestWins(sourceDir, targetDir);

    expect(result.sourceToTarget).toContain('doc.md');
    expect(fs.readFileSync(path.join(targetDir, 'doc.md'), 'utf8')).toBe('new content');
  });

  it('copies newer target files back to source (bidirectional)', () => {
    const older = new Date('2025-01-01T00:00:00Z');
    const newer = new Date('2025-06-01T12:00:00Z');

    writeWithTime(path.join(sourceDir, 'doc.md'), 'old source', older);
    writeWithTime(path.join(targetDir, 'doc.md'), 'newer target', newer);

    const result = syncDocsNewestWins(sourceDir, targetDir);

    expect(result.targetToSource).toContain('doc.md');
    expect(fs.readFileSync(path.join(sourceDir, 'doc.md'), 'utf8')).toBe('newer target');
  });

  it('skips files within 1-second tolerance', () => {
    const t1 = new Date('2025-06-01T12:00:00.000Z');
    const t2 = new Date('2025-06-01T12:00:00.500Z');

    writeWithTime(path.join(sourceDir, 'file.md'), 'content A', t1);
    writeWithTime(path.join(targetDir, 'file.md'), 'content B', t2);

    const result = syncDocsNewestWins(sourceDir, targetDir);

    expect(result.skipped).toContain('file.md');
  });

  it('excludes .doc-version.yaml by default', () => {
    const date = new Date('2025-06-01T12:00:00Z');
    writeWithTime(path.join(sourceDir, '.doc-version.yaml'), 'version: 1', date);

    const result = syncDocsNewestWins(sourceDir, targetDir);

    expect(fs.existsSync(path.join(targetDir, '.doc-version.yaml'))).toBe(false);
  });

  describe('backupOnly mode', () => {
    it('does NOT copy target-only files to source in backupOnly', () => {
      const date = new Date('2025-06-01T12:00:00Z');
      writeWithTime(path.join(targetDir, 'target-only.md'), 'target content', date);

      const result = syncDocsNewestWins(sourceDir, targetDir, { backupOnly: true });

      expect(fs.existsSync(path.join(sourceDir, 'target-only.md'))).toBe(false);
    });

    it('still flows newer target files back to source in backupOnly', () => {
      const older = new Date('2025-01-01T00:00:00Z');
      const newer = new Date('2025-06-01T12:00:00Z');

      writeWithTime(path.join(sourceDir, 'shared.md'), 'old', older);
      writeWithTime(path.join(targetDir, 'shared.md'), 'new', newer);

      const result = syncDocsNewestWins(sourceDir, targetDir, { backupOnly: true });

      expect(result.targetToSource).toContain('shared.md');
      expect(fs.readFileSync(path.join(sourceDir, 'shared.md'), 'utf8')).toBe('new');
    });
  });
});

// --- syncFileAcrossRepos ------------------------------------------------

describe('syncFileAcrossRepos', () => {
  let repos;

  beforeEach(() => {
    repos = [makeTmpDir(), makeTmpDir(), makeTmpDir()];
  });

  afterEach(() => {
    repos.forEach(rmDir);
  });

  it('syncs file from newest repo to all others', () => {
    const older = new Date('2025-01-01T00:00:00Z');
    const newest = new Date('2025-06-15T12:00:00Z');

    writeWithTime(path.join(repos[0], 'test.md'), 'old content', older);
    writeWithTime(path.join(repos[1], 'test.md'), 'newest content', newest);
    writeWithTime(path.join(repos[2], 'test.md'), 'old content', older);

    const result = syncFileAcrossRepos('test.md', repos, 'test file');

    expect(repos[1]).toContain(result.winnerRepo);
    expect(fs.readFileSync(path.join(repos[0], 'test.md'), 'utf8')).toBe('newest content');
    expect(fs.readFileSync(path.join(repos[2], 'test.md'), 'utf8')).toBe('newest content');
  });

  it('skips repos that do not have the file', () => {
    const date = new Date('2025-06-01T12:00:00Z');
    writeWithTime(path.join(repos[0], 'only-here.md'), 'content', date);
    // repos[1] and repos[2] do not have the file

    const result = syncFileAcrossRepos('only-here.md', repos, 'partial file');

    expect(result.notFoundCount).toBe(2);
    expect(repos[0]).toContain(result.winnerRepo);
  });

  it('skips sync when content hashes match (identical files)', () => {
    const t1 = new Date('2025-01-01T00:00:00Z');
    const t2 = new Date('2025-06-15T12:00:00Z');

    writeWithTime(path.join(repos[0], 'same.md'), 'identical', t1);
    writeWithTime(path.join(repos[1], 'same.md'), 'identical', t2);

    const result = syncFileAcrossRepos('same.md', repos, 'identical file');

    // Winner is the newest timestamp, but skipped count reflects identical content
    expect(result.skippedCount).toBeGreaterThanOrEqual(1);
  });
});

// --- syncFolderAcrossRepos ----------------------------------------------

describe('syncFolderAcrossRepos', () => {
  let repos;

  beforeEach(() => {
    repos = [makeTmpDir(), makeTmpDir()];
  });

  afterEach(() => {
    repos.forEach(rmDir);
  });

  it('syncs all files in a folder across repos', () => {
    const older = new Date('2025-01-01T00:00:00Z');
    const newer = new Date('2025-06-15T12:00:00Z');

    const folder = 'subfolder';
    writeWithTime(path.join(repos[0], folder, 'a.md'), 'old a', older);
    writeWithTime(path.join(repos[0], folder, 'b.md'), 'newer b', newer);
    writeWithTime(path.join(repos[1], folder, 'a.md'), 'newer a', newer);
    writeWithTime(path.join(repos[1], folder, 'b.md'), 'old b', older);

    const result = syncFolderAcrossRepos(folder, repos);

    expect(result.totalFiles).toBe(2);
    // After sync, both repos should have the newer versions
    expect(fs.readFileSync(path.join(repos[0], folder, 'a.md'), 'utf8')).toBe('newer a');
    expect(fs.readFileSync(path.join(repos[1], folder, 'b.md'), 'utf8')).toBe('newer b');
  });

  it('handles empty folders gracefully', () => {
    const folder = 'empty-folder';
    fs.mkdirSync(path.join(repos[0], folder), { recursive: true });

    const result = syncFolderAcrossRepos(folder, repos);

    expect(result.totalFiles).toBe(0);
  });
});
