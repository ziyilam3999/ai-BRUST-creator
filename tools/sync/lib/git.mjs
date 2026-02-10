/**
 * @fileoverview Git operations: exclusions, tracking, hooks, CLAUDE.md generation.
 *
 * Ports: Add-GitExclusion, Test-GitIgnored, Test-GitTracked, Remove-FromGitIndex,
 *        Ensure-GitProtection, Install-PreCommitHook, Find-CurrentRepoRoot,
 *        Generate-ClaudeMd from sync_copilot_instructions.ps1 + init_protocol.ps1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { log } from './logger.mjs';
import { getCopilotVersion } from './config.mjs';

/**
 * Check if a path is a git repository.
 * @param {string} repoPath
 * @returns {boolean}
 */
export function isGitRepo(repoPath) {
  return fs.existsSync(path.join(repoPath, '.git'));
}

/**
 * Find the git repository root from a starting directory.
 *
 * Ports: Find-CurrentRepoRoot from PS.
 *
 * @param {string} [startDir]
 * @returns {string}
 */
export function findRepoRoot(startDir) {
  let dir = startDir ?? process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached root
    dir = parent;
  }
  return startDir ?? process.cwd();
}

/**
 * Add an exclusion pattern to .git/info/exclude.
 * Idempotent — skips duplicates.
 *
 * Ports: Add-GitExclusion from PS.
 *
 * @param {string} repoPath
 * @param {string} pattern
 * @param {Object} [opts]
 * @param {boolean} [opts.dryRun=false] - If true, log but skip writes
 * @returns {boolean}
 */
export function addGitExclusion(repoPath, pattern, opts = {}) {
  const dryRun = opts.dryRun ?? false;

  if (!isGitRepo(repoPath)) {
    log.warn(`Not a git repository: ${repoPath}`);
    return false;
  }

  const excludeFile = path.join(repoPath, '.git', 'info', 'exclude');

  // Create directory if needed
  const excludeDir = path.dirname(excludeFile);
  if (!fs.existsSync(excludeDir)) {
    if (dryRun) {
      log.info(`  [WhatIf] Would create directory: ${excludeDir}`);
      return true;
    }
    fs.mkdirSync(excludeDir, { recursive: true });
  }

  // Create file if needed
  if (!fs.existsSync(excludeFile)) {
    if (dryRun) {
      log.info(`  [WhatIf] Would create exclude file and add: ${pattern}`);
      return true;
    }
    fs.writeFileSync(excludeFile, '', 'utf8');
  }

  // Check for duplicate
  const content = fs.readFileSync(excludeFile, 'utf8');
  const lines = content.split('\n').map((l) => l.trimEnd());
  if (lines.includes(pattern)) {
    return true; // Already exists
  }

  if (dryRun) {
    log.info(`  [WhatIf] Would add git exclusion: ${pattern}`);
    return true;
  }

  // Append pattern
  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(excludeFile, `${separator}${pattern}\n`, 'utf8');
  return true;
}

/**
 * Check if a file is ignored by git.
 *
 * Ports: Test-GitIgnored from PS.
 *
 * @param {string} repoPath
 * @param {string} file
 * @returns {boolean}
 */
export function isGitIgnored(repoPath, file) {
  try {
    const result = execSync(`git status --porcelain "${file}"`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return !result.trim();
  } catch {
    return false;
  }
}

/**
 * Check if a file is tracked in the git index.
 *
 * Ports: Test-GitTracked from PS.
 *
 * @param {string} repoPath
 * @param {string} file
 * @returns {boolean}
 */
export function isGitTracked(repoPath, file) {
  try {
    const result = execSync(`git ls-files "${file}"`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return !!result.trim();
  } catch {
    return false;
  }
}

/**
 * Remove a file from the git index (stop tracking), keep working copy.
 *
 * Ports: Remove-FromGitIndex from PS.
 *
 * @param {string} repoPath
 * @param {string} file
 * @returns {boolean}
 */
export function removeFromGitIndex(repoPath, file) {
  try {
    execSync(`git rm --cached "${file}"`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    execSync(`git commit -m "chore: stop tracking ${path.basename(file)}"`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    log.success(`Removed from git tracking: ${file}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure git protection for a file: untrack + exclude + verify.
 *
 * Ports: Ensure-GitProtection from PS.
 *
 * @param {string} repoPath
 * @param {string} filePattern - Pattern for git exclusion
 * @param {string} filePath - Actual file path for tracking check
 * @param {import('./types.mjs').SyncResult} results
 */
export function ensureGitProtection(repoPath, filePattern, filePath, results) {
  if (isGitTracked(repoPath, filePattern)) {
    log.info('File is tracked in git, removing from index...');
    if (removeFromGitIndex(repoPath, filePattern)) {
      results.untracked++;
    }
  }

  if (addGitExclusion(repoPath, filePattern)) {
    results.excluded++;
  }

  if (isGitIgnored(repoPath, filePath)) {
    results.verified++;
  }
}

/**
 * Install a pre-commit hook that runs extract-docs and sync via node.
 *
 * Ports: Install-PreCommitHook from PS.
 * Key change: calls `node` instead of `pwsh`.
 *
 * @param {string} repoPath
 * @param {Object} [opts]
 * @param {boolean} [opts.dryRun=false] - If true, log but skip writes
 * @returns {boolean} true if hook was installed or updated
 */
export function installPreCommitHook(repoPath, opts = {}) {
  const dryRun = opts.dryRun ?? false;

  if (!isGitRepo(repoPath)) {
    log.warn(`Not a git repository: ${repoPath}`);
    return false;
  }

  const hooksDir = path.join(repoPath, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Hook content — uses LF line endings, calls node
  const hookContent = `#!/bin/sh
# ===========================================================================
# PRE-COMMIT HOOK - Auto-installed by tools/sync/index.mjs
# ===========================================================================
# This hook runs before every commit to:
#   1. Update docs from code comments (extract-docs.mjs)
#   2. Sync docs across all repos (index.mjs)
#
# Docs remain private - they are excluded via .git/info/exclude
# ===========================================================================

if command -v node >/dev/null 2>&1; then
    REPO_ROOT="$(git rev-parse --show-toplevel)"

    # Step 1: Extract docs from code comments
    if [ -f "$REPO_ROOT/tools/sync/extract-docs.mjs" ]; then
        node "$REPO_ROOT/tools/sync/extract-docs.mjs" 2>/dev/null || true
    fi

    # Step 2: Sync across repos (skip hook install to prevent recursion)
    if [ -f "$REPO_ROOT/tools/sync/index.mjs" ]; then
        SKIP_HOOK_INSTALL=1 node "$REPO_ROOT/tools/sync/index.mjs" 2>/dev/null || true
    fi
fi

exit 0
`;

  // Check if hook exists and is identical
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing === hookContent) {
      log.info(`Pre-commit hook up-to-date in ${path.basename(repoPath)}`);
      return false;
    }
  }

  if (dryRun) {
    log.info(`  [WhatIf] Would install pre-commit hook in ${path.basename(repoPath)}`);
    return true;
  }

  try {
    // Write with LF line endings
    fs.writeFileSync(hookPath, hookContent, { encoding: 'utf8' });

    // Make executable on non-Windows
    if (process.platform !== 'win32') {
      fs.chmodSync(hookPath, 0o755);
    }

    log.success(`Installed pre-commit hook in ${path.basename(repoPath)}`);
    return true;
  } catch (err) {
    log.error(`Failed to install pre-commit hook: ${err.message}`);
    return false;
  }
}

/**
 * Generate CLAUDE.md from copilot-instructions.md.
 *
 * Ports: Generate-ClaudeMd from sync + init_protocol.
 *
 * @param {string} repoPath
 * @param {Object} [opts]
 * @param {boolean} [opts.dryRun=false] - If true, log but skip writes
 * @returns {boolean}
 */
export function generateClaudeMd(repoPath, opts = {}) {
  const dryRun = opts.dryRun ?? false;
  const copilotPath = path.join(repoPath, '.github', 'copilot-instructions.md');
  const claudePath = path.join(repoPath, 'CLAUDE.md');

  if (!fs.existsSync(copilotPath)) return false;

  try {
    let content = fs.readFileSync(copilotPath, 'utf8');
    const version = getCopilotVersion(copilotPath) ?? 'unknown';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Fix relative paths: CLAUDE.md is at root, so rules/ -> .github/rules/
    content = content
      .replace(/\]\(rules\//g, '](.github/rules/')
      .replace(/\[rules\//g, '[.github/rules/');

    const header = `# CLAUDE.md
# ===========================================================================
#   AUTO-GENERATED - DO NOT EDIT DIRECTLY
# ===========================================================================
# Source:    .github/copilot-instructions.md
# Version:   v${version}
# Generated: ${timestamp}
#
# To update: Edit .github/copilot-instructions.md, then run:
#            node tools/sync/index.mjs
# ===========================================================================

`;

    if (dryRun) {
      log.info(`  [WhatIf] Would generate CLAUDE.md in ${path.basename(repoPath)} (v${version})`);
      return true;
    }

    fs.writeFileSync(claudePath, header + content, 'utf8');
    return true;
  } catch (err) {
    log.error(`Failed to generate CLAUDE.md: ${err.message}`);
    return false;
  }
}

/**
 * Get the current git branch name.
 * @param {string} repoPath
 * @returns {string}
 */
export function getGitBranch(repoPath) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return branch || 'unknown';
  } catch {
    return 'unknown';
  }
}
