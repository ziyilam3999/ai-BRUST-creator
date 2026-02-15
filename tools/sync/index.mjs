#!/usr/bin/env node
/**
 * @fileoverview Main sync orchestrator — replaces sync_copilot_instructions.ps1.
 *
 * Orchestrates:
 *   1. Config loading
 *   2. Repository preparation
 *   3. Newest-wins sync for all protocol files
 *   4. CLAUDE.md generation
 *   5. Git exclusion management
 *   6. Pre-commit hook installation
 *   7. Config-driven project docs sync
 *
 * Usage:
 *   node tools/sync/index.mjs
 *   node tools/sync/index.mjs --skip-tests --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { log } from './lib/logger.mjs';
import { loadSyncConfig } from './lib/config.mjs';
import {
  syncFileAcrossRepos,
  syncFolderAcrossRepos,
  syncDocsNewestWins,
} from './lib/sync-engine.mjs';
import {
  addGitExclusion,
  generateClaudeMd,
  installPreCommitHook,
  getGitBranch,
} from './lib/git.mjs';
import {
  getDocVersion,
  updateDocVersion,
  incrementVersion,
  getCopilotVersion,
  compareVersions,
} from './lib/config.mjs';
import { syncFromConfig } from './lib/config-sync.mjs';

/** @typedef {import('./lib/types.mjs').SyncResult} SyncResult */

import { SCRIPT_VERSION } from './lib/types.mjs';

// ===========================================================================
// Constants
// ===========================================================================

const GITHUB_DIR = '.github';
const GITHUB_RULES_DIR = '.github/rules';
const TOOLS_DIR = 'tools';
const TOOLS_TESTS_DIR = 'tools/tests';
const TOOLS_SYNC_DIR = 'tools/sync';
const CLAUDE_COMMANDS_DIR = '.claude/commands';
const CLAUDE_SKILLS_DIR = '.claude/skills';
const COPILOT_FILE_NAME = 'copilot-instructions.md';

/** Exclusion patterns to add to .git/info/exclude */
const EXCLUSION_PATTERNS = [
  '.github/copilot-instructions*.md',
  '.github/rules/',
  '.github/protocol-*.md',
  'tools/sync_copilot_instructions.ps1',
  'tools/extract_docs.ps1',
  'tools/sync/',
  'tools/tests/',
  'tmp/',
  'CLAUDE.md',
  '.claude/',
];

// ===========================================================================
// Result Factory
// ===========================================================================

/** @returns {SyncResult} */
function newSyncResult() {
  return {
    synced: 0,
    skipped: 0,
    excluded: 0,
    untracked: 0,
    verified: 0,
    scriptsSynced: 0,
    rulesSynced: 0,
    testsSynced: 0,
    docsBackedUp: 0,
    docsSynced: 0,
    hooksInstalled: 0,
    claudeMdGenerated: 0,
    commandsSynced: 0,
  };
}

// ===========================================================================
// Ensure docs excluded
// ===========================================================================

/**
 * @param {string} repoPath
 * @param {string} [docsPath='docs/']
 * @param {Object} [opts]
 * @param {boolean} [opts.dryRun=false]
 */
function ensureDocsExcluded(repoPath, docsPath = 'docs/', opts = {}) {
  const pattern = docsPath.replace(/[/\\]$/, '') + '/';
  addGitExclusion(repoPath, pattern, { dryRun: opts.dryRun ?? false });
}

// ===========================================================================
// Backup docs to archive
// ===========================================================================

/**
 * @param {string} sourceDocsPath
 * @param {string} archivePath
 * @param {string} projectName
 * @param {Object} opts
 * @param {boolean} [opts.backupOnly=false]
 * @param {boolean} [opts.dryRun=false]
 * @returns {boolean}
 */
function backupDocsToArchive(sourceDocsPath, archivePath, projectName, opts = {}) {
  const dryRun = opts.dryRun ?? false;
  const targetPath = path.join(archivePath, projectName);

  if (!fs.existsSync(sourceDocsPath)) {
    log.warn(`Source docs not found: ${sourceDocsPath}`);
    return false;
  }

  if (!fs.existsSync(targetPath)) {
    if (dryRun) {
      log.info(`  [WhatIf] Would create archive dir: ${targetPath}`);
    } else {
      fs.mkdirSync(targetPath, { recursive: true });
    }
  }

  const syncResult = syncDocsNewestWins(sourceDocsPath, targetPath, {
    backupOnly: opts.backupOnly ?? false,
    dryRun,
  });

  const srcToTgt = syncResult.sourceToTarget.length;
  const tgtToSrc = syncResult.targetToSource.length;

  if (srcToTgt > 0 || tgtToSrc > 0) {
    const sourceVersion = getDocVersion(sourceDocsPath);
    const newVersion = incrementVersion(sourceVersion);
    if (!dryRun) {
      updateDocVersion(targetPath, newVersion, projectName);
      updateDocVersion(sourceDocsPath, newVersion, projectName);
    } else {
      log.info(`  [WhatIf] Would bump version to ${newVersion}`);
    }
    const mode = opts.backupOnly ? 'backup-only' : 'bidirectional';
    log.success(`Backed up ${projectName} docs (v${newVersion}, ${mode}, ${srcToTgt}-> ${tgtToSrc}←)`);
    return true;
  }

  const sourceVersion = getDocVersion(sourceDocsPath);
  log.info(`No changes to backup for ${projectName} (v${sourceVersion ?? 'none'})`);
  return false;
}

// ===========================================================================
// Project docs sync
// ===========================================================================

/**
 * Sync project docs (phase-aware).
 * @param {string} projectName
 * @param {import('./lib/types.mjs').ProjectConfig} projectConfig
 * @param {string} archivePath
 * @param {SyncResult} results
 * @param {boolean} archiveBackupOnly
 * @param {boolean} [dryRun=false]
 */
function syncProjectDocs(projectName, projectConfig, archivePath, results, archiveBackupOnly, dryRun = false) {
  const sourceRepo = projectConfig.source_repo;
  const docsPath = projectConfig.docs_path ?? 'docs';
  const phase = projectConfig.phase ?? 'solo';
  const syncTargets = projectConfig.sync_targets ?? [];
  const sourceDocsPath = path.join(sourceRepo, docsPath);

  console.log('');
  log.info(`─── ${projectName} (${phase}) ───`);

  if (!fs.existsSync(sourceDocsPath)) {
    log.warn(`Docs not found: ${sourceDocsPath}`);
    return;
  }

  ensureDocsExcluded(sourceRepo, docsPath, { dryRun });

  if (phase === 'solo') {
    if (backupDocsToArchive(sourceDocsPath, archivePath, projectName, { backupOnly: archiveBackupOnly, dryRun })) {
      results.docsBackedUp++;
    }
  } else if (phase === 'integrated') {
    // Get branch name
    const branchName = getGitBranch(sourceRepo);

    for (const target of syncTargets) {
      if (!fs.existsSync(target.repo)) {
        log.warn(`Target repo not found: ${target.repo}`);
        continue;
      }

      const targetDocsPath = path.join(target.repo, target.docs_path);
      const repoName = path.basename(target.repo);

      if (!fs.existsSync(targetDocsPath)) {
        if (dryRun) {
          log.info(`  [WhatIf] Would create ${targetDocsPath}`);
        } else {
          fs.mkdirSync(targetDocsPath, { recursive: true });
        }
      }

      const syncResult = syncDocsNewestWins(sourceDocsPath, targetDocsPath, { dryRun });
      const srcToTgt = syncResult.sourceToTarget.length;
      const tgtToSrc = syncResult.targetToSource.length;

      if (srcToTgt > 0 || tgtToSrc > 0) {
        let msg = `  -> ${repoName}: `;
        if (srcToTgt > 0) msg += `${srcToTgt}->`;
        if (tgtToSrc > 0) msg += ` ←${tgtToSrc}`;
        log.plain(msg);

        // Version tracking
        const srcVer = getDocVersion(sourceDocsPath);
        const tgtVer = getDocVersion(targetDocsPath);
        const maxVer = (srcVer && tgtVer) ? (compareVersions(srcVer, tgtVer) > 0 ? srcVer : tgtVer) : (srcVer || tgtVer);
        const newVersion = incrementVersion(maxVer);

        if (!dryRun) {
          updateDocVersion(sourceDocsPath, newVersion, projectName, branchName);
          updateDocVersion(targetDocsPath, newVersion, repoName, branchName);
        } else {
          log.info(`  [WhatIf] Would bump version to ${newVersion}`);
        }
        log.success(`${repoName} synced (v${newVersion})`);
      } else {
        log.info(`${repoName} is up-to-date`);
      }

      ensureDocsExcluded(target.repo, target.docs_path, { dryRun });
      results.docsSynced++;
    }

    // Also backup to archive
    if (backupDocsToArchive(sourceDocsPath, archivePath, projectName, { backupOnly: archiveBackupOnly, dryRun })) {
      results.docsBackedUp++;
    }
  }
}

/**
 * Sync all project docs from config.
 * @param {SyncResult} results
 * @param {boolean} [dryRun=false]
 */
function syncAllProjectDocs(results, dryRun = false) {
  log.divider('PROJECT DOCS SYNC');

  const config = loadSyncConfig();
  if (!config) {
    log.warn('No config loaded, skipping project docs sync');
    return;
  }

  const archivePath = config.global.archive_path;
  const archiveBackupOnly = config.global.archive_backup_only === true;

  if (archiveBackupOnly) {
    log.info('Archive mode: backup-only (deleted files won\'t return)');
  }

  // Ensure archive path exists
  if (!fs.existsSync(archivePath)) {
    if (dryRun) {
      log.info(`  [WhatIf] Would create archive directory: ${archivePath}`);
    } else {
      fs.mkdirSync(archivePath, { recursive: true });
      log.success(`Created archive directory: ${archivePath}`);

      // Initialize as git repo
      try {
        execSync('git init', { cwd: archivePath, stdio: 'pipe' });
      } catch { /* ignore */ }
    }
  }

  // Sync each project
  for (const [projectName, projectConfig] of Object.entries(config.projects)) {
    syncProjectDocs(projectName, projectConfig, archivePath, results, archiveBackupOnly, dryRun);
  }

  // Commit archive changes
  if (!dryRun) {
    try {
      const changes = execSync('git status --porcelain', { cwd: archivePath, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      if (changes.trim()) {
        execSync('git add -A', { cwd: archivePath, stdio: 'pipe' });
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
        execSync(`git commit -m "docs backup ${timestamp}"`, { cwd: archivePath, stdio: 'pipe' });
        log.success('Archive committed');
      }
    } catch { /* ignore */ }
  } else {
    log.info('  [WhatIf] Would commit archive changes');
  }

  console.log('');
  log.success('Project docs sync complete');
}

// ===========================================================================
// Main Execution
// ===========================================================================

/**
 * Main sync entry point.
 * @param {Object} [opts]
 * @param {boolean} [opts.skipTests=false]
 * @param {boolean} [opts.dryRun=false]
 * @param {boolean} [opts.force=false]
 * @param {'newest'|'version'|'content-hash'} [opts.strategy='newest']
 */
export function runSync(opts = {}) {
  const skipTests = opts.skipTests ?? false;
  const dryRun = opts.dryRun ?? false;
  const force = opts.force ?? false;
  const strategy = opts.strategy ?? 'newest';

  console.log('');
  log.divider(`UNIFIED PERSONAL SYNC v${SCRIPT_VERSION} (JS)`);
  if (dryRun) {
    log.warn('DRY-RUN MODE — no files will be modified');
  }
  console.log('');

  // Load config
  const config = loadSyncConfig();
  if (config) {
    log.success(`Loaded config`);
    log.info(`  Projects: ${Object.keys(config.projects).length}`);
    log.info(`  Repos: ${config.all_repos.length}`);
  } else {
    log.warn('Using legacy hardcoded configuration');
  }

  // Get target repos
  let targetRepos = config ? config.all_repos : [];
  if (targetRepos.length === 0) {
    log.warn('No repos configured. Check sync_config.yaml.');
    return;
  }

  // Validate repo paths
  targetRepos = targetRepos.filter((repo) => {
    if (fs.existsSync(repo)) return true;
    log.warn(`Repository path does not exist, skipping: ${repo}`);
    return false;
  });

  log.info('Starting sync...');
  console.log('');

  // === Step 1: Repository Preparation ===
  log.divider('Step 1: Repository Preparation');

  for (const repo of targetRepos) {
    const repoName = path.basename(repo);

    const dirs = [
      path.join(repo, GITHUB_DIR),
      path.join(repo, GITHUB_RULES_DIR),
      path.join(repo, TOOLS_DIR),
      path.join(repo, TOOLS_TESTS_DIR),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        if (dryRun) {
          log.info(`  [WhatIf] Would create ${path.relative(repo, dir)} in ${repoName}`);
        } else {
          fs.mkdirSync(dir, { recursive: true });
          log.success(`Created ${path.relative(repo, dir)} in ${repoName}`);
        }
      }
    }
  }

  log.info('All repositories prepared');
  console.log('');

  // === Step 2: Newest-Wins Sync ===
  log.divider('Step 2: Newest-Wins Sync');
  const results = newSyncResult();

  log.info('Using newest-wins strategy: edit from any repo, newest file wins');
  console.log('');

  // Config-driven dispatch (Phase D): use sync_items if available
  if (config?.sync_items?.length) {
    log.info('Using config-driven sync dispatch');
    syncFromConfig(config.sync_items, targetRepos, results, { dryRun, force, strategy });
  } else {
    // Fallback: hardcoded sync blocks (legacy)
    log.warn('No sync_items in config — using hardcoded fallback');

    // 2a. Sync copilot-instructions.md
    log.info('Syncing copilot-instructions.md...');
    const copilotResult = syncFileAcrossRepos(
      `${GITHUB_DIR}/${COPILOT_FILE_NAME}`,
      targetRepos,
      'copilot-instructions.md',
      { dryRun, force, strategy },
    );
    results.synced += copilotResult.syncedCount;
    results.skipped += copilotResult.skippedCount;

    // 2b. Sync sync script (self-sync — sync the JS tools folder)
    console.log('');
    log.info('Syncing tools/sync/...');
    const syncLibResult = syncFolderAcrossRepos(
      'tools/sync/lib',
      targetRepos,
      { filePattern: '*.mjs', description: 'tools/sync/lib/', dryRun },
    );
    results.scriptsSynced += syncLibResult.syncedCount;

    const topLevelSyncFiles = ['index.mjs', 'init.mjs', 'extract-docs.mjs'];
    for (const file of topLevelSyncFiles) {
      const r = syncFileAcrossRepos(`tools/sync/${file}`, targetRepos, file, { dryRun });
      results.scriptsSynced += r.syncedCount;
    }

    const vendorResult = syncFolderAcrossRepos(
      'tools/sync/vendor',
      targetRepos,
      { filePattern: '*.mjs', description: 'tools/sync/vendor/', dryRun },
    );
    results.scriptsSynced += vendorResult.syncedCount;

    // 2c. Sync legacy PS scripts
    console.log('');
    log.info('Syncing legacy PS scripts...');
    const psScripts = [
      'tools/sync_copilot_instructions.ps1',
      'tools/extract_docs.ps1',
      'tools/init_protocol.ps1',
    ];
    for (const ps of psScripts) {
      const r = syncFileAcrossRepos(ps, targetRepos, path.basename(ps), { dryRun });
      results.scriptsSynced += r.syncedCount;
    }

    // 2d. Sync .github/rules/ folder
    console.log('');
    log.info('Syncing .github/rules/...');
    const rulesResult = syncFolderAcrossRepos(
      GITHUB_RULES_DIR,
      targetRepos,
      { filePattern: '*.md', description: '.github/rules/', dryRun },
    );
    results.rulesSynced += rulesResult.syncedCount;

    // 2e. Sync tools/tests/ folder
    console.log('');
    log.info('Syncing tools/tests/...');
    const testsResult = syncFolderAcrossRepos(
      TOOLS_TESTS_DIR,
      targetRepos,
      { filePattern: '*.ps1', description: 'tools/tests/', dryRun },
    );
    results.testsSynced += testsResult.syncedCount;

    // 2f. Sync .claude/commands/
    console.log('');
    log.info('Syncing .claude/commands/...');
    for (const repo of targetRepos) {
      const commandsDir = path.join(repo, CLAUDE_COMMANDS_DIR);
      if (!fs.existsSync(commandsDir)) {
        if (dryRun) {
          log.info(`  [WhatIf] Would create ${CLAUDE_COMMANDS_DIR} in ${path.basename(repo)}`);
        } else {
          fs.mkdirSync(commandsDir, { recursive: true });
        }
      }
    }
    const commandsResult = syncFolderAcrossRepos(
      CLAUDE_COMMANDS_DIR,
      targetRepos,
      { filePattern: '*.md', description: '.claude/commands/', dryRun },
    );
    results.commandsSynced += commandsResult.syncedCount;

    // 2g. Sync .claude/skills/ (nested — uses recursive mode)
    console.log('');
    log.info('Syncing .claude/skills/...');
    for (const repo of targetRepos) {
      const skillsDir = path.join(repo, CLAUDE_SKILLS_DIR);
      if (!fs.existsSync(skillsDir)) {
        if (dryRun) {
          log.info(`  [WhatIf] Would create ${CLAUDE_SKILLS_DIR} in ${path.basename(repo)}`);
        } else {
          fs.mkdirSync(skillsDir, { recursive: true });
        }
      }
    }

    const skillsResult = syncFolderAcrossRepos(CLAUDE_SKILLS_DIR, targetRepos, {
      filePattern: '*',
      description: '.claude/skills/',
      dryRun,
      recursive: true,
    });
    log.info(`  Skills synced: ${skillsResult.syncedCount} files (${skillsResult.totalFiles} total)`);
  }

  // 2h. Generate CLAUDE.md in all repos
  console.log('');
  log.info('Generating CLAUDE.md files...');
  for (const repo of targetRepos) {
    if (generateClaudeMd(repo, { dryRun })) {
      log.success(`  ${path.basename(repo)}`);
      results.claudeMdGenerated++;
    }
  }

  // 2i. Ensure git exclusions in all repos
  console.log('');
  log.info('Ensuring git exclusions...');
  for (const repo of targetRepos) {
    for (const pattern of EXCLUSION_PATTERNS) {
      addGitExclusion(repo, pattern, { dryRun });
    }
  }

  // 2j. Install pre-commit hooks
  if (process.env.SKIP_HOOK_INSTALL !== '1') {
    console.log('');
    log.info('Installing pre-commit hooks...');
    for (const repo of targetRepos) {
      if (installPreCommitHook(repo, { dryRun })) {
        results.hooksInstalled++;
      }
    }
  } else {
    console.log('');
    log.info('Skipping hook installation (called from pre-commit hook)');
  }

  // === Step 3: Project Docs Sync ===
  syncAllProjectDocs(results, dryRun);

  // === Summary ===
  log.divider('Sync Summary');
  log.plain(`  Sync Strategy:      Newest Wins (edit from any repo)`);
  log.plain(`  Script Version:     v${SCRIPT_VERSION} (JS)`);
  log.plain(`  Total Repos:        ${targetRepos.length}`);
  console.log('');
  log.info('Protocol Files:');
  log.plain(`    Copilot Files:    ${results.synced}`);
  log.plain(`    CLAUDE.md Gen:    ${results.claudeMdGenerated}`);
  log.plain(`    Scripts Synced:   ${results.scriptsSynced}`);
  log.plain(`    Rules Synced:     ${results.rulesSynced}`);
  log.plain(`    Tests Synced:     ${results.testsSynced}`);
  log.plain(`    Commands Synced:  ${results.commandsSynced}`);
  log.plain(`    Hooks Installed:  ${results.hooksInstalled}`);
  log.plain(`    Files Skipped:    ${results.skipped}`);
  console.log('');
  log.info('Project Docs:');
  log.plain(`    Docs Synced:      ${results.docsSynced}`);
  log.plain(`    Docs Backed Up:   ${results.docsBackedUp}`);
  log.plain('='.repeat(60));

  if (results.synced > 0 || results.rulesSynced > 0 || results.docsSynced > 0 || results.docsBackedUp > 0) {
    console.log('');
    log.success('Sync completed successfully!');
    if (results.synced > 0) {
      log.warn('REMINDER: If version changed, update .github/rules/PROTOCOL_CHANGELOG.md');
    }
  } else {
    console.log('');
    log.info('All targets are up-to-date or skipped.');
  }
}

// ===========================================================================
// CLI Entry Point
// ===========================================================================

const isDirectRun = !process.env.VITEST && !process.env.NODE_TEST;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const cliOpts = { skipTests: false, dryRun: false, force: false, strategy: 'newest' };

  for (const arg of args) {
    if (arg === '--skip-tests') cliOpts.skipTests = true;
    if (arg === '--dry-run') cliOpts.dryRun = true;
    if (arg === '--force') cliOpts.force = true;
    if (arg.startsWith('--strategy=')) cliOpts.strategy = arg.split('=')[1];
  }

  try {
    runSync(cliOpts);
  } catch (err) {
    log.error(err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}
