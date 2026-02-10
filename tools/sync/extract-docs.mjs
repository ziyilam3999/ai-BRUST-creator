/**
 * @fileoverview Extract documentation from code comments and generate docs/*.md.
 *
 * Ports: extract_docs.ps1 completely.
 *
 * Parses @requirement, @tested, @changelog, @architecture, @defect, @refactor, @deprecated
 * tags from source files and generates documentation markdown files.
 *
 * Usage:
 *   node tools/sync/extract-docs.mjs
 *   node tools/sync/extract-docs.mjs --dry-run
 *   node tools/sync/extract-docs.mjs --source-dir src --verbose
 */
import fs from 'node:fs';
import path from 'node:path';
import { log } from './lib/logger.mjs';

const EXTRACT_DOCS_VERSION = '1.0.0';

// ============================================================================
// Language patterns
// ============================================================================

const languagePatterns = {
  dart: {
    extensions: ['.dart'],
    commentPatterns: [
      /^\s*\/\/\/\s*@(\w+)\s+(.+)$/,  // /// @tag value
      /^\s*\/\/\s*@(\w+)\s+(.+)$/,    // // @tag value
    ],
    classPattern: /^\s*(class|mixin|extension|enum)\s+(\w+)/,
    functionPattern: /^\s*(\w+)\s+(\w+)\s*\(/,
  },
  python: {
    extensions: ['.py'],
    commentPatterns: [
      /^\s*#\s*@(\w+)\s+(.+)$/,       // # @tag value
    ],
    classPattern: /^\s*class\s+(\w+)/,
    functionPattern: /^\s*def\s+(\w+)\s*\(/,
  },
  java: {
    extensions: ['.java'],
    commentPatterns: [
      /^\s*\*\s*@(\w+)\s+(.+)$/,      // * @tag value (in /** */)
      /^\s*\/\/\s*@(\w+)\s+(.+)$/,    // // @tag value
    ],
    classPattern: /^\s*(public\s+)?(class|interface|enum)\s+(\w+)/,
    functionPattern: /^\s*(public|private|protected)?\s*\w+\s+(\w+)\s*\(/,
  },
  javascript: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'],
    commentPatterns: [
      /^\s*\*\s*@(\w+)\s+(.+)$/,      // * @tag value (in /** */)
      /^\s*\/\/\s*@(\w+)\s+(.+)$/,    // // @tag value
    ],
    classPattern: /^\s*(export\s+)?(class|interface)\s+(\w+)/,
    functionPattern: /^\s*(export\s+)?(async\s+)?function\s+(\w+)/,
  },
};

/** Universal fallback for unknown extensions */
const fallbackLangConfig = {
  commentPatterns: [
    /^\s*\/\/\/\s*@(\w+)\s+(.+)$/,
    /^\s*\/\/\s*@(\w+)\s+(.+)$/,
    /^\s*#\s*@(\w+)\s+(.+)$/,
    /^\s*\*\s*@(\w+)\s+(.+)$/,
  ],
  classPattern: /(class|struct|type)\s+(\w+)/,
  functionPattern: /(function|func|def|fn)\s+(\w+)/,
};

/** Tag definitions: tag name -> output doc file and value pattern */
const tagDefinitions = {
  requirement:  { doc: 'requirements.md', pattern: /^(REQ-\d+):\s*(.+)$/ },
  tested:       { doc: 'testing.md', pattern: /^(.+)$/ },
  changelog:    { doc: 'changelog.md', pattern: /^(\d{4}-\d{2}-\d{2}):\s*(.+)$/ },
  architecture: { doc: 'code-map.md', pattern: /^(.+)$/ },
  defect:       { doc: 'defects.md', pattern: /^(DEF-\d+):\s*(.+)$/ },
  refactor:     { doc: 'refactoring.md', pattern: /^(.+)$/ },
  deprecated:   { doc: 'code-map.md', pattern: /^(.+)$/ },
};

// ============================================================================
// Core functions
// ============================================================================

/**
 * Detect project type based on marker files.
 * @returns {{type: string, sourceDir: string}}
 */
export function detectProjectType() {
  if (fs.existsSync('pubspec.yaml')) return { type: 'flutter', sourceDir: 'lib' };
  if (fs.existsSync('pyproject.toml') || fs.existsSync('setup.py') || fs.existsSync('requirements.txt')) {
    return { type: 'python', sourceDir: fs.existsSync('src') ? 'src' : '.' };
  }
  if (fs.existsSync('build.gradle') || fs.existsSync('build.gradle.kts') || fs.existsSync('pom.xml')) {
    return { type: 'java', sourceDir: fs.existsSync('src/main') ? 'src/main' : (fs.existsSync('src') ? 'src' : '.') };
  }
  if (fs.existsSync('package.json')) {
    return { type: 'node', sourceDir: fs.existsSync('src') ? 'src' : (fs.existsSync('lib') ? 'lib' : '.') };
  }
  return { type: 'generic', sourceDir: '.' };
}

/**
 * Get language config for a file extension.
 * @param {string} ext - Extension with dot (e.g. '.ts')
 * @returns {Object}
 */
export function getLanguageConfig(ext) {
  for (const config of Object.values(languagePatterns)) {
    if (config.extensions.includes(ext.toLowerCase())) return config;
  }
  return fallbackLangConfig;
}

/**
 * Get the enclosing class/function name from code context.
 * @param {string[]} lines - All lines of the file
 * @param {number} startLine - 0-indexed line to start searching from
 * @param {Object} langConfig
 * @returns {string}
 */
export function getContextName(lines, startLine, langConfig) {
  for (let j = startLine; j < lines.length; j++) {
    const line = lines[j];
    // Skip comment lines
    if (/^\s*(\/\/\/|\/\/|#|\*|\/\*|\*\/)/.test(line)) continue;

    // Try class pattern
    if (langConfig.classPattern) {
      const cm = line.match(langConfig.classPattern);
      if (cm) return cm[cm.length - 1]; // Last capture group
    }

    // Try function pattern
    if (langConfig.functionPattern) {
      const fm = line.match(langConfig.functionPattern);
      if (fm) return fm[fm.length - 1]; // Last capture group
    }

    // Non-empty, non-comment line without match -> stop
    if (line.trim() !== '') break;
  }
  return 'Unknown';
}

/**
 * Process a single file for documentation tags.
 * @param {string} filePath - Absolute path
 * @param {string} relativePath - Relative path for display
 * @param {Object} collections - Mutable collection objects
 * @param {boolean} [verbose=false]
 */
export function processFile(filePath, relativePath, collections, verbose = false) {
  const ext = path.extname(filePath).toLowerCase();
  const langConfig = getLanguageConfig(ext);

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of langConfig.commentPatterns) {
      const match = line.match(pattern);
      if (!match) continue;

      const tagName = match[1].toLowerCase();
      const tagValue = match[2].trim();

      if (!tagDefinitions[tagName]) break;

      const contextName = getContextName(lines, i + 1, langConfig);
      const entry = {
        tag: tagName,
        value: tagValue,
        file: relativePath,
        context: contextName,
        line: i + 1,
      };

      // Parse tag-specific data
      const tagDef = tagDefinitions[tagName];
      const vm = tagValue.match(tagDef.pattern);

      switch (tagName) {
        case 'requirement':
          if (vm) { entry.id = vm[1]; entry.description = vm[2]; }
          collections.requirements.push(entry);
          break;
        case 'tested':
          entry.testFile = tagValue;
          collections.tests.push(entry);
          break;
        case 'changelog':
          if (vm) { entry.date = vm[1]; entry.description = vm[2]; }
          collections.changelogs.push(entry);
          break;
        case 'architecture':
          entry.description = tagValue;
          collections.architecture.push(entry);
          break;
        case 'defect':
          if (vm) { entry.id = vm[1]; entry.description = vm[2]; }
          collections.defects.push(entry);
          break;
        case 'refactor':
          entry.description = tagValue;
          collections.refactors.push(entry);
          break;
        case 'deprecated':
          entry.replacement = tagValue;
          collections.deprecated.push(entry);
          break;
      }

      if (verbose) {
        log.info(`  Found @${tagName} in ${relativePath}:${i + 1}`);
      }

      break; // Only first pattern match per line
    }
  }
}

/**
 * Recursively find files with matching extensions.
 * @param {string} dir
 * @param {string[]} extensions
 * @returns {string[]} Array of absolute paths
 */
function findSourceFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return [];
  const results = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

// ============================================================================
// Document generators
// ============================================================================

/** @param {string} sourceDir @param {string} projectType @param {Object} collections */
export function generateCodeMap(sourceDir, projectType, collections) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let content = `# Code Map
<!-- AUTO-GENERATED by extract-docs.mjs - DO NOT EDIT MANUALLY -->
<!-- Last updated: ${timestamp} -->
<!-- Project type: ${projectType} -->

## Project Structure

`;

  // Build directory tree
  if (fs.existsSync(sourceDir)) {
    const dirs = [];
    function walkDirs(dir) {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
      } catch { return; }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        dirs.push(full);
        walkDirs(full);
      }
    }
    walkDirs(sourceDir);

    for (const dir of dirs) {
      const rel = path.relative(process.cwd(), dir).replace(/\\/g, '/');
      const depth = rel.split('/').length - 1;
      const indent = '  '.repeat(Math.max(0, depth));
      content += `${indent}- **${path.basename(dir)}/**\n`;
    }
  }

  // Architecture notes
  if (collections.architecture.length > 0) {
    content += `\n## Architecture Notes\n\n| Component | Location | Description |\n|-----------|----------|-------------|\n`;
    for (const arch of collections.architecture) {
      content += `| ${arch.context} | [${arch.file}](${arch.file}#L${arch.line}) | ${arch.description} |\n`;
    }
  }

  // Deprecated items
  if (collections.deprecated.length > 0) {
    content += `\n## Deprecated Items\n\n| Component | Location | Replacement |\n|-----------|----------|-------------|\n`;
    for (const dep of collections.deprecated) {
      content += `| ${dep.context} | [${dep.file}](${dep.file}#L${dep.line}) | ${dep.replacement} |\n`;
    }
  }

  return content;
}

/** @param {Object} collections */
export function generateRequirements(collections) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let content = `# Requirements
<!-- AUTO-GENERATED by extract-docs.mjs - DO NOT EDIT MANUALLY -->
<!-- Last updated: ${timestamp} -->

## Features

| ID | Description | Location | Tested |
|----|-------------|----------|--------|
`;

  const sorted = collections.requirements.filter((r) => r.id).sort((a, b) => a.id.localeCompare(b.id));
  for (const req of sorted) {
    const testEntry = collections.tests.find((t) => t.file === req.file && t.context === req.context);
    const testStatus = testEntry ? `[${testEntry.testFile}](${testEntry.testFile})` : 'X Missing';
    content += `| ${req.id} | ${req.description} | [${req.context}](${req.file}#L${req.line}) | ${testStatus} |\n`;
  }

  return content;
}

/** @param {Object} collections */
export function generateTesting(collections) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let content = `# Testing
<!-- AUTO-GENERATED by extract-docs.mjs - DO NOT EDIT MANUALLY -->
<!-- Last updated: ${timestamp} -->

## Coverage Map

| Source | Test | Component |
|--------|------|-----------|
`;

  const sorted = [...collections.tests].sort((a, b) => a.file.localeCompare(b.file));
  for (const test of sorted) {
    content += `| [${test.file}](${test.file}#L${test.line}) | [${test.testFile}](${test.testFile}) | ${test.context} |\n`;
  }

  return content;
}

/** @param {Object} collections */
export function generateChangelog(collections) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let content = `# Changelog
<!-- AUTO-GENERATED by extract-docs.mjs - DO NOT EDIT MANUALLY -->
<!-- Last updated: ${timestamp} -->

`;

  const withDate = collections.changelogs.filter((c) => c.date);
  // Group by date
  const groups = {};
  for (const item of withDate) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  }

  const dates = Object.keys(groups).sort().reverse();
  for (const date of dates) {
    content += `## ${date}\n\n`;
    for (const item of groups[date]) {
      content += `- **${item.context}**: ${item.description} ([${item.file}](${item.file}#L${item.line}))\n`;
    }
    content += '\n';
  }

  if (collections.changelogs.length === 0) {
    content += '_No changelog entries found. Add @changelog tags to your code._\n';
  }

  return content;
}

/** @param {Object} collections */
export function generateDefects(collections) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let content = `# Defects
<!-- AUTO-GENERATED by extract-docs.mjs - DO NOT EDIT MANUALLY -->
<!-- Last updated: ${timestamp} -->

## Known Issues

| ID | Description | Location |
|----|-------------|----------|
`;

  const sorted = collections.defects.filter((d) => d.id).sort((a, b) => a.id.localeCompare(b.id));
  for (const defect of sorted) {
    content += `| ${defect.id} | ${defect.description} | [${defect.context}](${defect.file}#L${defect.line}) |\n`;
  }

  if (collections.defects.length === 0) {
    content += '| - | _No known defects_ | - |\n';
  }

  return content;
}

/** @param {Object} collections */
export function generateRefactoring(collections) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let content = `# Refactoring Log
<!-- AUTO-GENERATED by extract-docs.mjs - DO NOT EDIT MANUALLY -->
<!-- Last updated: ${timestamp} -->

## History

| Component | Reason | Location |
|-----------|--------|----------|
`;

  for (const ref of collections.refactors) {
    content += `| ${ref.context} | ${ref.description} | [${ref.file}](${ref.file}#L${ref.line}) |\n`;
  }

  if (collections.refactors.length === 0) {
    content += '| - | _No refactoring notes_ | - |\n';
  }

  return content;
}

// ============================================================================
// Main execution
// ============================================================================

/**
 * Run the full extraction pipeline.
 * @param {Object} opts
 * @param {string} [opts.sourceDir] - Override source dir
 * @param {string} [opts.docsDir='docs'] - Output dir
 * @param {boolean} [opts.dryRun=false]
 * @param {boolean} [opts.verbose=false]
 * @returns {{collections: Object, filesProcessed: number}}
 */
export function extractDocs(opts = {}) {
  const project = detectProjectType();
  const sourceDir = opts.sourceDir || project.sourceDir;
  const docsDir = opts.docsDir || 'docs';
  const dryRun = opts.dryRun ?? false;
  const verbose = opts.verbose ?? false;

  log.plain(`\n[search] Extract Docs v${EXTRACT_DOCS_VERSION} - Multi-Language Documentation Generator`);
  log.plain('='.repeat(60));
  log.plain(`\n[folder] Project type: ${project.type}`);
  log.plain(`[folder] Source directory: ${sourceDir}`);
  log.plain(`[folder] Docs directory: ${docsDir}`);

  // Ensure docs dir exists
  if (!dryRun && !fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
    log.success(`Created docs directory: ${docsDir}`);
  }

  // Get all supported extensions
  const allExtensions = new Set();
  for (const config of Object.values(languagePatterns)) {
    for (const ext of config.extensions) allExtensions.add(ext);
  }

  // Find source files
  const sourceFiles = findSourceFiles(sourceDir, [...allExtensions]);

  // Also scan test directories
  const testDirs = ['test', 'tests', 'src/test', 'src/tests', '__tests__'];
  for (const td of testDirs) {
    if (fs.existsSync(td)) {
      sourceFiles.push(...findSourceFiles(td, [...allExtensions]));
    }
  }

  log.plain(`\n[file] Found ${sourceFiles.length} source files to scan`);

  // Collections
  const collections = {
    requirements: [],
    tests: [],
    changelogs: [],
    architecture: [],
    defects: [],
    refactors: [],
    deprecated: [],
  };

  // Process each file
  for (const file of sourceFiles) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
    processFile(file, relativePath, collections, verbose);
  }

  // Generate documents
  const outputs = {
    'code-map.md': generateCodeMap(sourceDir, project.type, collections),
    'requirements.md': generateRequirements(collections),
    'testing.md': generateTesting(collections),
    'changelog.md': generateChangelog(collections),
    'defects.md': generateDefects(collections),
    'refactoring.md': generateRefactoring(collections),
  };

  log.plain('\n[note] Generating documentation files...');

  for (const [fileName, content] of Object.entries(outputs)) {
    const filePath = path.join(docsDir, fileName);
    if (dryRun) {
      log.warn(`  Would write: ${filePath}`);
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
      log.success(`  Updated: ${filePath}`);
    }
  }

  // Summary
  log.plain('\n' + '='.repeat(60));
  log.plain('[chart] Extraction Summary:');
  log.plain(`   Files scanned:      ${sourceFiles.length}`);
  log.plain(`   Requirements:       ${collections.requirements.length}`);
  log.plain(`   Test mappings:      ${collections.tests.length}`);
  log.plain(`   Changelog entries:  ${collections.changelogs.length}`);
  log.plain(`   Architecture notes: ${collections.architecture.length}`);
  log.plain(`   Defects:            ${collections.defects.length}`);
  log.plain(`   Refactor notes:     ${collections.refactors.length}`);
  log.plain(`   Deprecated items:   ${collections.deprecated.length}`);

  if (dryRun) {
    log.warn('\n[warn]  DRY RUN - No files were modified');
  } else {
    log.success('\n[ok] Documentation updated successfully!');
  }

  return { collections, filesProcessed: sourceFiles.length };
}

// ============================================================================
// CLI Entry Point
// ============================================================================

const isDirectRun = !process.env.VITEST && !process.env.NODE_TEST;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, verbose: false, sourceDir: '', docsDir: 'docs' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--verbose') opts.verbose = true;
    else if (args[i] === '--source-dir' && args[i + 1]) opts.sourceDir = args[++i];
    else if (args[i] === '--docs-dir' && args[i + 1]) opts.docsDir = args[++i];
  }

  extractDocs(opts);
}
