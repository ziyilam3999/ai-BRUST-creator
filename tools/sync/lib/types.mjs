/**
 * @fileoverview JSDoc type definitions and shared constants for the sync tool.
 */

/** Shared version constant for all sync scripts */
export const SCRIPT_VERSION = '2.23.0';

/**
 * @typedef {Object} SyncConfig
 * @property {GlobalConfig} global
 * @property {Object<string, ProjectConfig>} projects
 * @property {string[]} all_repos - Resolved absolute paths to all repos
 * @property {SyncItem[]} [sync_items]
 * @property {string[]} [exclusions]
 */

/**
 * @typedef {Object} GlobalConfig
 * @property {string} base_path
 * @property {string} protocol_repo
 * @property {string} archive_path
 * @property {boolean} [archive_backup_only]
 */

/**
 * @typedef {Object} ProjectConfig
 * @property {boolean} [docs_enabled]
 * @property {string} [docs_path]
 * @property {string} [phase]
 * @property {string} [source_repo] - Resolved absolute path
 * @property {SyncTarget[]} [sync_targets]
 */

/**
 * @typedef {Object} SyncTarget
 * @property {string} repo - Resolved absolute path
 * @property {string} docs_path
 */

/**
 * @typedef {Object} SyncItem
 * @property {'file'|'folder'} type
 * @property {string} source - Relative path from repo root
 * @property {string} [filePattern='*'] - Glob filter for folder items (e.g. '*.md', '*.mjs')
 * @property {boolean} [recursive=false] - Walk subdirectories for folder items
 * @property {string} [description] - Logging label override (defaults to source)
 * @property {boolean} [ensureDir=false] - Create target dir in all repos if missing
 */

/**
 * @typedef {Object} SyncResult
 * @property {number} synced
 * @property {number} skipped
 * @property {number} excluded
 * @property {number} untracked
 * @property {number} verified
 * @property {number} scriptsSynced
 * @property {number} rulesSynced
 * @property {number} testsSynced
 * @property {number} docsBackedUp
 * @property {number} docsSynced
 * @property {number} hooksInstalled
 * @property {number} claudeMdGenerated
 * @property {number} commandsSynced
 */

/**
 * @typedef {Object} FileNewestWinsResult
 * @property {string|null} winnerRepo
 * @property {Date|null} winnerTime
 * @property {number} syncedCount
 * @property {number} skippedCount
 * @property {number} notFoundCount
 * @property {boolean} [versionWarning] - True if version regression detected but --force used
 */

/**
 * @typedef {Object} FolderSyncResult
 * @property {number} totalFiles
 * @property {number} syncedCount
 * @property {number} skippedCount
 */

/**
 * @typedef {Object} DocsSyncResult
 * @property {string[]} sourceToTarget - Relative paths copied source→target
 * @property {string[]} targetToSource - Relative paths copied target→source
 * @property {string[]} skipped - Relative paths skipped
 */

export {};
