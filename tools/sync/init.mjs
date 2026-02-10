/**
 * @fileoverview Initialize a repository with AI protocol files.
 *
 * Ports: init_protocol.ps1 completely.
 *
 * Usage:
 *   node tools/sync/init.mjs [target-path]
 *     --protocol-repo <path>   Source repo (auto-detected)
 *     --force                  Overwrite existing files
 *     --skip-sync              Don't update sync_config.yaml
 *     --include-tests          Copy tools/tests/
 *     --dry-run                Preview only
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import yaml from './vendor/js-yaml.mjs';
import { log } from './lib/logger.mjs';
import { addGitExclusion, isGitRepo, generateClaudeMd } from './lib/git.mjs';
import { SCRIPT_VERSION } from './lib/types.mjs';

/** Patterns to add to .git/info/exclude */
const EXCLUDE_PATTERNS = [
  '# AI Protocol files (managed by tools/sync/init.mjs)',
  '.github/copilot-instructions*.md',
  '.github/rules/',
  '.github/protocol-*.md',
  'tools/sync/',
  'tools/sync_copilot_instructions.ps1',
  'tools/extract_docs.ps1',
  'tools/tests/',
  'docs/',
  'tmp/',
  'CLAUDE.md',
  '.claude/',
];

/**
 * Copy a single file, creating parent directories as needed.
 * @param {string} src
 * @param {string} dest
 * @param {Object} opts
 * @param {boolean} [opts.force=false]
 * @param {boolean} [opts.dryRun=false]
 * @returns {boolean} true if file was (or would be) copied
 */
export function copySingleFile(src, dest, opts = {}) {
  if (!fs.existsSync(src)) {
    log.warn(`Source file not found: ${src}`);
    return false;
  }

  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    if (opts.dryRun) {
      log.info(`  WhatIf: Would create directory: ${destDir}`);
    } else {
      fs.mkdirSync(destDir, { recursive: true });
    }
  }

  if (fs.existsSync(dest) && !opts.force) {
    return false;
  }

  if (opts.dryRun) {
    log.info(`  WhatIf: Would copy: ${path.basename(src)}`);
    return true;
  }

  fs.copyFileSync(src, dest);
  return true;
}

/**
 * Recursively copy all files from source to destination.
 * @param {string} srcDir
 * @param {string} destDir
 * @param {Object} opts
 * @param {boolean} [opts.force=false]
 * @param {boolean} [opts.dryRun=false]
 * @returns {number} count of copied files
 */
export function copyFolderContents(srcDir, destDir, opts = {}) {
  if (!fs.existsSync(srcDir)) {
    log.warn(`Source folder not found: ${srcDir}`);
    return 0;
  }

  let copied = 0;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullSrc = path.join(currentDir, entry.name);
      const relativePath = path.relative(srcDir, fullSrc);
      const fullDest = path.join(destDir, relativePath);

      if (entry.isDirectory()) {
        walk(fullSrc);
      } else if (entry.isFile()) {
        if (copySingleFile(fullSrc, fullDest, opts)) {
          copied++;
        }
      }
    }
  }

  walk(srcDir);
  return copied;
}

/**
 * Setup git exclusions for all protocol patterns.
 * @param {string} repoPath
 * @param {Object} opts
 * @param {boolean} [opts.dryRun=false]
 */
export function setupGitExclusions(repoPath, opts = {}) {
  if (opts.dryRun) {
    log.info(`  WhatIf: Would add ${EXCLUDE_PATTERNS.length} exclusion patterns`);
    return;
  }

  for (const pattern of EXCLUDE_PATTERNS) {
    addGitExclusion(repoPath, pattern);
  }
}

/**
 * Add a repository to sync_config.yaml using proper YAML parsing.
 * @param {string} protocolRepoPath
 * @param {string} targetRepoPath
 * @param {Object} opts
 * @param {boolean} [opts.dryRun=false]
 */
export function addToSyncConfig(protocolRepoPath, targetRepoPath, opts = {}) {
  const configFile = path.join(protocolRepoPath, 'sync_config.yaml');
  if (!fs.existsSync(configFile)) {
    log.warn(`sync_config.yaml not found: ${configFile}`);
    return;
  }

  const repoName = path.basename(targetRepoPath);
  const rawContent = fs.readFileSync(configFile, 'utf8');

  try {
    const parsed = yaml.load(rawContent);
    if (!parsed || typeof parsed !== 'object') {
      log.warn('sync_config.yaml is empty or invalid');
      return;
    }

    // Ensure all_repos array exists
    if (!Array.isArray(parsed.all_repos)) {
      parsed.all_repos = [];
    }

    // Check if repo already listed
    if (parsed.all_repos.includes(repoName)) {
      return;
    }

    if (opts.dryRun) {
      log.info(`  WhatIf: Would add to sync_config.yaml: ${repoName}`);
      return;
    }

    // Add repo and serialize
    parsed.all_repos.push(repoName);
    const newContent = yaml.dump(parsed, {
      indent: 2,
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: true,
    });
    fs.writeFileSync(configFile, newContent, 'utf8');
    log.success(`Added to sync_config.yaml: ${repoName}`);
  } catch (err) {
    log.error(`Failed to update sync_config.yaml: ${err.message}`);
  }
}

/**
 * Auto-detect the protocol repo path.
 * @returns {string}
 */
function detectProtocolRepo() {
  // Assume this script is at <protocol-repo>/tools/sync/init.mjs
  const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
  return path.resolve(scriptDir, '..', '..');
}

/**
 * Main initialization function.
 *
 * Ports: Initialize-Protocol from PS.
 *
 * @param {Object} args
 * @param {string} [args.targetRepo='.']
 * @param {string} [args.protocolRepo]
 * @param {boolean} [args.force=false]
 * @param {boolean} [args.skipSync=false]
 * @param {boolean} [args.includeTests=false]
 * @param {boolean} [args.dryRun=false]
 */
export function initializeProtocol(args = {}) {
  const targetRepo = path.resolve(args.targetRepo ?? '.');
  const protocolRepo = args.protocolRepo ?? detectProtocolRepo();
  const force = args.force ?? false;
  const skipSync = args.skipSync ?? false;
  const includeTests = args.includeTests ?? false;
  const dryRun = args.dryRun ?? false;

  // Validate
  if (!fs.existsSync(targetRepo)) {
    throw new Error(`Target path does not exist: ${targetRepo}`);
  }
  if (!fs.existsSync(protocolRepo)) {
    throw new Error(`Protocol repository not found: ${protocolRepo}`);
  }

  const opts = { force, dryRun };

  // Header
  log.divider(`AI Protocol Initialization v${SCRIPT_VERSION}`);
  log.plain(`Target:   ${targetRepo}`);
  log.plain(`Protocol: ${protocolRepo}`);
  console.log('');

  // Auto-init git if missing
  if (!isGitRepo(targetRepo)) {
    if (dryRun) {
      log.info(`  WhatIf: Would run 'git init' in ${targetRepo}`);
    } else {
      log.info('Initializing git repository...');
      execSync('git init', { cwd: targetRepo, stdio: 'pipe' });
    }
  }

  let totalCopied = 0;

  // [1/7] Copy .github/copilot-instructions.md
  log.info('[1/7] Copying copilot-instructions.md...');
  if (copySingleFile(
    path.join(protocolRepo, '.github', 'copilot-instructions.md'),
    path.join(targetRepo, '.github', 'copilot-instructions.md'),
    opts,
  )) totalCopied++;

  // [2/7] Copy .github/rules/
  log.info('[2/7] Copying .github/rules/...');
  totalCopied += copyFolderContents(
    path.join(protocolRepo, '.github', 'rules'),
    path.join(targetRepo, '.github', 'rules'),
    opts,
  );

  // [3/7] Copy .claude/commands/
  log.info('[3/7] Copying .claude/commands/...');
  totalCopied += copyFolderContents(
    path.join(protocolRepo, '.claude', 'commands'),
    path.join(targetRepo, '.claude', 'commands'),
    opts,
  );

  // [4/7] Copy .claude/settings.local.json
  log.info('[4/7] Copying .claude/settings.local.json...');
  if (copySingleFile(
    path.join(protocolRepo, '.claude', 'settings.local.json'),
    path.join(targetRepo, '.claude', 'settings.local.json'),
    opts,
  )) totalCopied++;

  // [5/7] Copy tools (sync scripts)
  log.info('[5/7] Copying tools...');
  // Copy the new JS sync tools
  totalCopied += copyFolderContents(
    path.join(protocolRepo, 'tools', 'sync'),
    path.join(targetRepo, 'tools', 'sync'),
    opts,
  );
  // Legacy PS scripts
  if (copySingleFile(
    path.join(protocolRepo, 'tools', 'sync_copilot_instructions.ps1'),
    path.join(targetRepo, 'tools', 'sync_copilot_instructions.ps1'),
    opts,
  )) totalCopied++;
  if (copySingleFile(
    path.join(protocolRepo, 'tools', 'extract_docs.ps1'),
    path.join(targetRepo, 'tools', 'extract_docs.ps1'),
    opts,
  )) totalCopied++;

  if (includeTests) {
    totalCopied += copyFolderContents(
      path.join(protocolRepo, 'tools', 'tests'),
      path.join(targetRepo, 'tools', 'tests'),
      opts,
    );
  }

  // [6/7] Initialize docs/
  log.info('[6/7] Initializing docs/...');
  const templatesDir = path.join(protocolRepo, 'docs', '_templates');
  const docsDir = path.join(targetRepo, 'docs');
  totalCopied += copyFolderContents(templatesDir, docsDir, opts);

  // Create tmp folder
  const tmpDir = path.join(targetRepo, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    if (dryRun) {
      log.info(`  WhatIf: Would create tmp/ with .gitkeep`);
    } else {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.gitkeep'), '# Keep this folder in git\n');
    }
  }

  // Create docs/proposals/ if needed
  const proposalsDir = path.join(docsDir, 'proposals');
  if (!fs.existsSync(proposalsDir)) {
    if (!dryRun) {
      fs.mkdirSync(proposalsDir, { recursive: true });
    }
  }

  // [7/7] Setup git exclusions
  log.info('[7/7] Setting up git exclusions...');
  setupGitExclusions(targetRepo, { dryRun });

  // Generate CLAUDE.md
  log.info('Generating CLAUDE.md...');
  if (!dryRun) {
    generateClaudeMd(targetRepo);
  } else {
    log.info('  WhatIf: Would generate CLAUDE.md');
  }

  // Update sync config
  if (!skipSync) {
    log.info('Updating sync_config.yaml...');
    addToSyncConfig(protocolRepo, targetRepo, { dryRun });
  }

  // Summary
  log.divider('Initialization Complete');
  if (dryRun) {
    log.warn('WhatIf mode - no changes were made');
  } else {
    log.plain(`  Files copied: ${totalCopied}`);
    log.plain('  Git exclusions: configured');
    log.plain('  CLAUDE.md: generated');
    if (!skipSync) log.plain('  sync_config.yaml: updated');
  }

  console.log('');
  log.warn('Next steps:');
  log.plain('  1. Review generated files');
  log.plain('  2. Edit docs/ai-manifest.json with project info');
  log.plain('  3. Run: node tools/sync/index.mjs');
  console.log('');
}

// ===========================================================================
// CLI Entry Point
// ===========================================================================

const args = process.argv.slice(2);
const isDirectRun = !process.env.VITEST && !process.env.NODE_TEST;

if (isDirectRun) {
  const cliArgs = {
    targetRepo: '.',
    protocolRepo: undefined,
    force: false,
    skipSync: false,
    includeTests: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--protocol-repo' && args[i + 1]) {
      cliArgs.protocolRepo = args[++i];
    } else if (arg === '--force') {
      cliArgs.force = true;
    } else if (arg === '--skip-sync') {
      cliArgs.skipSync = true;
    } else if (arg === '--include-tests') {
      cliArgs.includeTests = true;
    } else if (arg === '--dry-run' || arg === '--whatif') {
      cliArgs.dryRun = true;
    } else if (!arg.startsWith('-')) {
      cliArgs.targetRepo = arg;
    }
  }

  try {
    initializeProtocol(cliArgs);
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }
}
