/**
 * @fileoverview Core sync logic: newest-wins file and folder sync.
 *
 * Ports: Sync-DocsNewestWins, Sync-FileNewestWinsAllRepos,
 *        Sync-FolderNewestWinsAllRepos from sync_copilot_instructions.ps1.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { log } from './logger.mjs';

/** @typedef {import('./types.mjs').DocsSyncResult} DocsSyncResult */
/** @typedef {import('./types.mjs').FileNewestWinsResult} FileNewestWinsResult */
/** @typedef {import('./types.mjs').FolderSyncResult} FolderSyncResult */

// =========================================================================
// Phase 1: Version parsing & comparison utilities
// =========================================================================

/** Regex to parse version from copilot-instructions.md first line */
const PROTOCOL_VERSION_REGEX = /v(\d+\.\d+\.\d+)/;

/** Files that carry an embedded protocol version header */
const VERSION_CHECKED_FILES = ['copilot-instructions.md'];

/**
 * Parse the protocol version from the first line of a file.
 * Looks for `<!-- copilot-instructions vX.Y.Z ... -->` pattern.
 *
 * @param {string} filePath - Absolute path to file
 * @returns {string|null} Version string like "7.3.0" or null
 */
export function parseProtocolVersion(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
    const match = firstLine.match(PROTOCOL_VERSION_REGEX);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Compare two semver version strings.
 * Handles null by treating it as "0.0.0".
 *
 * @param {string|null} a
 * @param {string|null} b
 * @returns {number} negative if a<b, 0 if equal, positive if a>b
 */
export function semverCompare(a, b) {
  const pa = (a ?? '0.0.0').split('.').map(Number);
  const pb = (b ?? '0.0.0').split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/**
 * Check if the given relativePath is a version-checked protocol file.
 * @param {string} relativePath
 * @returns {boolean}
 */
function isVersionCheckedFile(relativePath) {
  const basename = path.basename(relativePath);
  return VERSION_CHECKED_FILES.includes(basename);
}

/**
 * Custom error for version regressions detected during sync.
 */
export class VersionRegressionError extends Error {
  /**
   * @param {string} message
   * @param {string} winnerVersion
   * @param {string} higherVersion
   * @param {string} repoWithHigher
   */
  constructor(message, winnerVersion, higherVersion, repoWithHigher) {
    super(message);
    this.name = 'VersionRegressionError';
    this.winnerVersion = winnerVersion;
    this.higherVersion = higherVersion;
    this.repoWithHigher = repoWithHigher;
  }
}

/**
 * Recursively enumerate all files under a directory.
 * Returns map of relativePath -> fs.Stats.
 * @param {string} dirPath - Absolute directory path
 * @returns {Map<string, {fullPath: string, stats: fs.Stats}>}
 */
function enumerateFiles(dirPath) {
  /** @type {Map<string, {fullPath: string, stats: fs.Stats}>} */
  const result = new Map();
  if (!fs.existsSync(dirPath)) return result;

  const resolved = path.resolve(dirPath);

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
        walk(fullPath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(resolved, fullPath);
        result.set(relativePath, { fullPath, stats: fs.statSync(fullPath) });
      }
    }
  }

  walk(resolved);
  return result;
}

/**
 * Simple filename sanity check. Replaces the old $GARBAGE_FILENAME_PATTERN.
 * path.relative() doesn't produce truncated filenames, but we keep a minimal
 * guard as regression protection.
 * @param {string} fileName
 * @returns {boolean} true if filename is suspicious
 */
export function isSuspiciousFilename(fileName) {
  if (!fileName || fileName.length < 3) return true;
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  // Extension-only files like ".md" — Node treats ".md" as a basename with no ext,
  // so we check if the name starts with '.' and has no further content before the ext
  if (!base || base === '.') return true;
  // Dotfile with no extension — path.extname('.md') returns '' so base = '.md'
  // Catch extension-only names like ".md", ".js" (dot + 1-2 lowercase chars)
  // Allow real dotfiles like ".env" (3+ chars after dot), ".gitignore", etc.
  if (fileName.startsWith('.') && !ext && /^\.[a-z]{1,2}$/.test(fileName)) {
    return true;
  }
  // No extension and very short — likely truncated
  if (!ext && fileName.length < 3) return true;
  return false;
}

/**
 * Compute MD5 hash of a file's contents.
 * @param {string} filePath
 * @returns {string}
 */
function md5Hash(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Copy a file, creating parent directories as needed.
 * @param {string} src
 * @param {string} dest
 */
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

/**
 * Bidirectional file-level sync between two directory trees (newest wins).
 *
 * Ports: Sync-DocsNewestWins from PS.
 *
 * @param {string} sourcePath - First docs folder path
 * @param {string} targetPath - Second docs folder path
 * @param {Object} [opts]
 * @param {string[]} [opts.excludeFiles=['.doc-version.yaml']] - Files to skip
 * @param {boolean} [opts.backupOnly=false] - If true, target-only files are skipped
 * @param {boolean} [opts.dryRun=false] - If true, log actions but skip all writes
 * @returns {DocsSyncResult}
 */
export function syncDocsNewestWins(sourcePath, targetPath, opts = {}) {
  const excludeFiles = opts.excludeFiles ?? ['.doc-version.yaml'];
  const backupOnly = opts.backupOnly ?? false;
  const dryRun = opts.dryRun ?? false;

  /** @type {DocsSyncResult} */
  const result = { sourceToTarget: [], targetToSource: [], skipped: [] };

  // Normalize paths
  const srcResolved = path.resolve(sourcePath);
  const tgtResolved = path.resolve(targetPath);

  // Enumerate both directories
  const sourceFiles = enumerateFiles(srcResolved);
  const targetFiles = enumerateFiles(tgtResolved);

  // Filter out excluded and suspicious files
  /** @param {string} relPath */
  const shouldExclude = (relPath) => {
    const baseName = path.basename(relPath);
    if (excludeFiles.includes(relPath) || excludeFiles.includes(baseName)) return true;
    if (isSuspiciousFilename(baseName)) return true;
    return false;
  };

  for (const key of sourceFiles.keys()) {
    if (shouldExclude(key)) sourceFiles.delete(key);
  }
  for (const key of targetFiles.keys()) {
    if (shouldExclude(key)) targetFiles.delete(key);
  }

  // Union of all relative paths
  const allPaths = new Set([...sourceFiles.keys(), ...targetFiles.keys()]);

  for (const relativePath of allPaths) {
    const srcEntry = sourceFiles.get(relativePath);
    const tgtEntry = targetFiles.get(relativePath);
    const srcFullPath = path.join(srcResolved, relativePath);
    const tgtFullPath = path.join(tgtResolved, relativePath);

    if (srcEntry && !tgtEntry) {
      // Source-only -> copy to target
      if (dryRun) {
        log.info(`  [WhatIf] Would copy ${relativePath} source -> target`);
      } else {
        copyFile(srcEntry.fullPath, tgtFullPath);
      }
      result.sourceToTarget.push(relativePath);
    } else if (!srcEntry && tgtEntry) {
      // Target-only
      if (backupOnly) {
        result.skipped.push(relativePath);
      } else {
        if (dryRun) {
          log.info(`  [WhatIf] Would copy ${relativePath} target -> source`);
        } else {
          copyFile(tgtEntry.fullPath, srcFullPath);
        }
        result.targetToSource.push(relativePath);
      }
    } else if (srcEntry && tgtEntry) {
      // Both exist -> compare timestamps with 1-second tolerance
      const srcTime = srcEntry.stats.mtimeMs;
      const tgtTime = tgtEntry.stats.mtimeMs;
      const diffSeconds = (srcTime - tgtTime) / 1000;

      if (diffSeconds > 1) {
        // Source newer -> copy to target
        if (dryRun) {
          log.info(`  [WhatIf] Would copy ${relativePath} source -> target (newer)`);
        } else {
          copyFile(srcEntry.fullPath, tgtFullPath);
        }
        result.sourceToTarget.push(relativePath);
      } else if (diffSeconds < -1) {
        // Target newer -> copy to source (even in BackupOnly for genuinely newer files)
        if (dryRun) {
          log.info(`  [WhatIf] Would copy ${relativePath} target -> source (newer)`);
        } else {
          copyFile(tgtEntry.fullPath, srcFullPath);
        }
        result.targetToSource.push(relativePath);
      } else {
        // Same time (within tolerance)
        result.skipped.push(relativePath);
      }
    }
  }

  return result;
}

/**
 * Sync a single file across all repos using newest-wins strategy.
 *
 * Ports: Sync-FileNewestWinsAllRepos from PS.
 *
 * Phase 1: Version regression safety check for protocol files.
 * Phase 3: Strategy support (newest, version, content-hash) + mtime preservation.
 *
 * @param {string} relativePath - Path relative to repo root
 * @param {string[]} allRepos - Array of repo root paths
 * @param {string} description - Human-readable name for logging
 * @param {Object} [opts]
 * @param {boolean} [opts.dryRun=false] - If true, log actions but skip all writes
 * @param {boolean} [opts.force=false] - If true, bypass version regression check
 * @param {'newest'|'version'|'content-hash'} [opts.strategy='newest'] - Winner selection strategy
 * @returns {FileNewestWinsResult}
 */
export function syncFileAcrossRepos(relativePath, allRepos, description, opts = {}) {
  const dryRun = opts.dryRun ?? false;
  const force = opts.force ?? false;
  const strategy = opts.strategy ?? 'newest';

  /** @type {FileNewestWinsResult} */
  const result = {
    winnerRepo: null,
    winnerTime: null,
    syncedCount: 0,
    skippedCount: 0,
    notFoundCount: 0,
    versionWarning: false,
  };

  // Collect all candidate files with stats
  /** @type {{repo: string, filePath: string, stats: fs.Stats}[]} */
  const candidates = [];

  for (const repo of allRepos) {
    const filePath = path.join(repo, relativePath);
    if (fs.existsSync(filePath)) {
      candidates.push({ repo, filePath, stats: fs.statSync(filePath) });
    } else {
      result.notFoundCount++;
    }
  }

  if (candidates.length === 0) {
    log.warn(`  ${description} not found in any repo`);
    return result;
  }

  // --- Phase 3: Strategy-based winner selection ---

  let winner;

  if (strategy === 'content-hash') {
    // If all files identical by hash, skip entirely
    const hashes = candidates.map((c) => ({ ...c, hash: md5Hash(c.filePath) }));
    const uniqueHashes = new Set(hashes.map((h) => h.hash));
    if (uniqueHashes.size === 1) {
      // All identical — pick first as nominal winner, skip all
      winner = candidates[0];
      result.winnerRepo = path.basename(winner.repo);
      result.winnerTime = new Date(winner.stats.mtimeMs);
      result.skippedCount = candidates.length - 1;
      log.info(`  ${description} all copies identical (content-hash) — skipped`);
      return result;
    }
    // Different content: fall back to version as tiebreaker, then mtime
    if (isVersionCheckedFile(relativePath)) {
      candidates.sort((a, b) => {
        const va = parseProtocolVersion(a.filePath);
        const vb = parseProtocolVersion(b.filePath);
        const vCmp = semverCompare(vb, va); // descending
        return vCmp !== 0 ? vCmp : b.stats.mtimeMs - a.stats.mtimeMs;
      });
    } else {
      candidates.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);
    }
    winner = candidates[0];
  } else if (strategy === 'version' && isVersionCheckedFile(relativePath)) {
    // Sort by version descending, mtime as tiebreaker
    candidates.sort((a, b) => {
      const va = parseProtocolVersion(a.filePath);
      const vb = parseProtocolVersion(b.filePath);
      const vCmp = semverCompare(vb, va); // descending
      return vCmp !== 0 ? vCmp : b.stats.mtimeMs - a.stats.mtimeMs;
    });
    winner = candidates[0];
  } else {
    // Default: newest mtime wins
    candidates.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);
    winner = candidates[0];
  }

  const newestFile = winner.filePath;
  const newestRepo = winner.repo;
  const newestTime = winner.stats.mtimeMs;

  result.winnerRepo = path.basename(newestRepo);
  result.winnerTime = new Date(newestTime);

  const timeStr = result.winnerTime.toISOString().replace('T', ' ').slice(0, 19);
  log.info(`  ${description} winner: ${result.winnerRepo} (${timeStr})`);

  // --- Phase 1: Version regression safety check ---
  if (strategy === 'newest' && isVersionCheckedFile(relativePath)) {
    const winnerVersion = parseProtocolVersion(newestFile);
    for (const candidate of candidates) {
      if (candidate.repo === newestRepo) continue;
      const otherVersion = parseProtocolVersion(candidate.filePath);
      if (otherVersion && winnerVersion && semverCompare(otherVersion, winnerVersion) > 0) {
        const otherRepoName = path.basename(candidate.repo);
        log.warn(`VERSION REGRESSION: ${description} winner has v${winnerVersion} but ${otherRepoName} has v${otherVersion}`);
        if (!force) {
          throw new VersionRegressionError(
            `VERSION REGRESSION: ${description} mtime winner has v${winnerVersion} but ${otherRepoName} has v${otherVersion}. Use --force to override.`,
            winnerVersion,
            otherVersion,
            otherRepoName,
          );
        }
        result.versionWarning = true;
      }
    }
  }

  // Step 2: Copy to all other repos (skip if MD5 identical)
  const newestHash = md5Hash(newestFile);
  // Phase 3: Get source stats for mtime preservation
  const sourceStats = fs.statSync(newestFile);

  for (const repo of allRepos) {
    if (repo === newestRepo) continue;

    const targetPath = path.join(repo, relativePath);
    const repoName = path.basename(repo);

    // Create directory if needed
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      if (dryRun) {
        log.info(`  [WhatIf] Would create directory: ${targetDir}`);
      } else {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }

    // Check if update needed
    let needsUpdate = true;
    if (fs.existsSync(targetPath)) {
      const targetHash = md5Hash(targetPath);
      if (targetHash === newestHash) {
        needsUpdate = false;
      }
    }

    if (needsUpdate) {
      if (dryRun) {
        log.info(`  [WhatIf] Would sync to ${repoName}`);
        result.syncedCount++;
      } else {
        try {
          fs.copyFileSync(newestFile, targetPath);
          // Phase 3: Preserve source timestamp on target
          fs.utimesSync(targetPath, sourceStats.atime, sourceStats.mtime);
          log.success(`  -> Synced to ${repoName}`);
          result.syncedCount++;
        } catch (err) {
          log.error(`  Failed to sync to ${repoName}: ${err.message}`);
        }
      }
    } else {
      log.info(`  ${repoName} is up-to-date`);
      result.skippedCount++;
    }
  }

  return result;
}

/**
 * Sync a folder's files across all repos using newest-wins strategy.
 *
 * Ports: Sync-FolderNewestWinsAllRepos from PS.
 *
 * @param {string} relFolderPath - Folder path relative to repo root
 * @param {string[]} allRepos - Array of repo root paths
 * @param {Object} [opts]
 * @param {string} [opts.filePattern='*'] - Glob pattern (simplified: just extension filter)
 * @param {string} [opts.description=''] - Logging label
 * @param {boolean} [opts.dryRun=false] - If true, log actions but skip all writes
 * @param {boolean} [opts.recursive=false] - If true, walk subdirectories recursively
 * @returns {FolderSyncResult}
 */
export function syncFolderAcrossRepos(relFolderPath, allRepos, opts = {}) {
  const filePattern = opts.filePattern ?? '*';
  const description = opts.description ?? relFolderPath;
  const dryRun = opts.dryRun ?? false;
  const recursive = opts.recursive ?? false;

  /** @type {FolderSyncResult} */
  const result = { totalFiles: 0, syncedCount: 0, skippedCount: 0 };

  // Gather all unique relative file paths from all repos
  const allRelativePaths = new Set();

  for (const repo of allRepos) {
    const folderPath = path.join(repo, relFolderPath);
    if (fs.existsSync(folderPath)) {
      try {
        if (recursive) {
          // Walk subdirectories recursively
          const files = enumerateFiles(folderPath);
          for (const relPath of files.keys()) {
            const fileName = path.basename(relPath);
            if (filePattern === '*' || fileName.endsWith(filePattern.replace('*', ''))) {
              // Store relative path from relFolderPath using forward slashes for consistency
              allRelativePaths.add(relPath.replace(/\\/g, '/'));
            }
          }
        } else {
          // Flat: only direct children
          const entries = fs.readdirSync(folderPath, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isFile()) continue;
            if (filePattern === '*' || entry.name.endsWith(filePattern.replace('*', ''))) {
              allRelativePaths.add(entry.name);
            }
          }
        }
      } catch {
        // Skip unreadable directories
      }
    }
  }

  result.totalFiles = allRelativePaths.size;

  if (result.totalFiles === 0) {
    log.info(`  No files found in ${description}`);
    return result;
  }

  // For each file, find newest and sync
  for (const relPath of allRelativePaths) {
    const fullRelPath = path.join(relFolderPath, relPath);
    const displayName = recursive ? relPath : path.basename(relPath);
    const fileResult = syncFileAcrossRepos(fullRelPath, allRepos, displayName, { dryRun });
    result.syncedCount += fileResult.syncedCount;
    result.skippedCount += fileResult.skippedCount;
  }

  return result;
}
