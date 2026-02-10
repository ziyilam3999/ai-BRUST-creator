// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  detectProjectType,
  getLanguageConfig,
  getContextName,
  processFile,
  generateCodeMap,
  generateRequirements,
  generateTesting,
  generateChangelog,
  generateDefects,
  generateRefactoring,
  extractDocs,
} from '../extract-docs.mjs';

/** Helper: create a temp dir */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'extract-test-'));
}

/** Remove dir recursively */
function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// --- getLanguageConfig --------------------------------------------------

describe('getLanguageConfig', () => {
  it('returns dart config for .dart extension', () => {
    const config = getLanguageConfig('.dart');
    expect(config).toBeDefined();
    expect(config.commentPatterns).toBeDefined();
  });

  it('returns python config for .py extension', () => {
    const config = getLanguageConfig('.py');
    expect(config).toBeDefined();
  });

  it('returns js/ts config for .ts extension', () => {
    const config = getLanguageConfig('.ts');
    expect(config).toBeDefined();
  });

  it('returns a fallback config for unknown extensions', () => {
    const config = getLanguageConfig('.xyz');
    expect(config).toBeDefined();
    // Should have some default comment patterns
    expect(config.commentPatterns).toBeDefined();
  });
});

// --- processFile --------------------------------------------------------

describe('processFile', () => {
  let tmpDir;
  let collections;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    collections = {
      requirements: [],
      tests: [],
      changelogs: [],
      architecture: [],
      defects: [],
      refactors: [],
      deprecated: [],
    };
  });

  afterEach(() => { rmDir(tmpDir); });

  it('extracts @requirement tags from source file', () => {
    const file = path.join(tmpDir, 'example.ts');
    fs.writeFileSync(file, `
// @requirement REQ-001: User can log in
function login() {}
`);

    processFile(file, 'example.ts', collections);

    expect(collections.requirements.length).toBe(1);
    expect(collections.requirements[0].id).toBe('REQ-001');
  });

  it('extracts @tested tags', () => {
    const file = path.join(tmpDir, 'example.ts');
    fs.writeFileSync(file, `
// @tested TEST-001: Login flow verified
function login() {}
`);

    processFile(file, 'example.ts', collections);

    expect(collections.tests.length).toBe(1);
  });

  it('extracts @changelog tags', () => {
    const file = path.join(tmpDir, 'example.ts');
    fs.writeFileSync(file, `
// @changelog 2025-06-01: Added login endpoint
function login() {}
`);

    processFile(file, 'example.ts', collections);

    expect(collections.changelogs.length).toBe(1);
  });

  it('extracts @defect tags', () => {
    const file = path.join(tmpDir, 'example.ts');
    fs.writeFileSync(file, `
// @defect BUG-001: Race condition in auth flow
function auth() {}
`);

    processFile(file, 'example.ts', collections);

    expect(collections.defects.length).toBe(1);
  });

  it('handles file with no tags gracefully', () => {
    const file = path.join(tmpDir, 'clean.ts');
    fs.writeFileSync(file, `
function clean() {
  return true;
}
`);

    processFile(file, 'clean.ts', collections);

    const totalTags = Object.values(collections).reduce((s, arr) => s + arr.length, 0);
    expect(totalTags).toBe(0);
  });
});

// --- generate functions -------------------------------------------------

describe('generate functions', () => {
  it('generateRequirements returns markdown with requirements', () => {
    const collections = {
      requirements: [
        { file: 'auth.ts', line: 10, tag: 'requirement', id: 'REQ-001', description: 'User login', context: 'login()' },
      ],
      tests: [],
    };

    const md = generateRequirements(collections);

    expect(md).toContain('REQ-001');
    expect(md).toContain('auth.ts');
  });

  it('generateTesting returns markdown with test info', () => {
    const collections = {
      tests: [
        { file: 'auth.ts', line: 5, tag: 'tested', testFile: 'auth.test.ts', context: 'login()' },
      ],
    };

    const md = generateTesting(collections);

    expect(md).toContain('auth.test.ts');
  });

  it('generateChangelog returns markdown with changelog entries', () => {
    const collections = {
      changelogs: [
        { file: 'api.ts', line: 3, tag: 'changelog', date: '2025-06-01', description: 'New endpoint', context: 'handler()' },
      ],
    };

    const md = generateChangelog(collections);

    expect(md).toContain('2025-06-01');
  });

  it('generateDefects returns markdown with defect entries', () => {
    const collections = {
      defects: [
        { file: 'db.ts', line: 20, tag: 'defect', id: 'DEF-001', description: 'Connection leak', context: 'connect()' },
      ],
    };

    const md = generateDefects(collections);

    expect(md).toContain('DEF-001');
  });

  it('generateRefactoring returns markdown with refactoring items', () => {
    const collections = {
      refactors: [
        { file: 'utils.ts', line: 15, tag: 'refactor', description: 'Extract to module', context: 'helpers' },
      ],
    };

    const md = generateRefactoring(collections);

    expect(md).toContain('Extract to module');
  });
});

// --- extractDocs integration --------------------------------------------

describe('extractDocs', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it('processes source files and writes doc outputs', () => {
    // Create a mini source tree
    const srcDir = path.join(tmpDir, 'src');
    const docsDir = path.join(tmpDir, 'docs');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'main.ts'), `
// @requirement REQ-100: Main feature
// @tested TEST-100: Main test
// @changelog 2025-06-01: Initial impl
function main() {}
`);

    const result = extractDocs({
      sourceDir: srcDir,
      docsDir: docsDir,
    });

    expect(result.filesProcessed).toBeGreaterThanOrEqual(1);
    expect(result.collections.requirements.length).toBe(1);
    expect(result.collections.tests.length).toBe(1);
    expect(result.collections.changelogs.length).toBe(1);

    // Check output files were written
    expect(fs.existsSync(path.join(docsDir, 'requirements.md'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'code-map.md'))).toBe(true);
  });

  it('dry-run does not write files', () => {
    const srcDir = path.join(tmpDir, 'src');
    const docsDir = path.join(tmpDir, 'docs');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'app.ts'), '// @requirement REQ-200: Feature\nfunction f() {}');

    extractDocs({
      sourceDir: srcDir,
      docsDir: docsDir,
      dryRun: true,
    });

    expect(fs.existsSync(docsDir)).toBe(false);
  });
});

// --- paths.mjs ----------------------------------------------------------

describe('paths', () => {
  let expandHome, isSamePath, gitRelativePath, normalizePath;

  beforeEach(async () => {
    const mod = await import('../lib/paths.mjs');
    expandHome = mod.expandHome;
    isSamePath = mod.isSamePath;
    gitRelativePath = mod.gitRelativePath;
    normalizePath = mod.normalizePath;
  });

  it('expandHome replaces ~ with home dir', () => {
    const result = expandHome('~/Documents');
    expect(result).toContain(os.homedir());
    expect(result).not.toContain('~');
  });

  it('expandHome ignores paths without ~', () => {
    expect(expandHome('/usr/local')).toBe('/usr/local');
  });

  it('isSamePath matches same paths', () => {
    expect(isSamePath('/a/b/c', '/a/b/c')).toBe(true);
  });

  it('isSamePath is case-insensitive on Windows', () => {
    if (process.platform === 'win32') {
      expect(isSamePath('C:\\Users\\Foo', 'c:\\users\\foo')).toBe(true);
    }
  });

  it('gitRelativePath returns forward-slash path', () => {
    const result = gitRelativePath('/a/b', '/a/b/c/d.txt');
    expect(result).not.toContain('\\');
    expect(result).toContain('c/d.txt');
  });

  it('normalizePath resolves the path', () => {
    const result = normalizePath('./foo/../bar');
    expect(result).toContain('bar');
    expect(result).not.toContain('..');
  });
});
