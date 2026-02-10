/**
 * @fileoverview Cross-platform path utilities.
 */
import path from 'node:path';
import os from 'node:os';

/**
 * Resolve ~ to home directory.
 * @param {string} p
 * @returns {string}
 */
export function expandHome(p) {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

/**
 * Test if two paths resolve to the same location.
 * Case-insensitive on Windows, case-sensitive elsewhere.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function isSamePath(a, b) {
  const ra = path.resolve(a);
  const rb = path.resolve(b);
  if (process.platform === 'win32') {
    return ra.toLowerCase() === rb.toLowerCase();
  }
  return ra === rb;
}

/**
 * Get relative path with forward slashes (for git patterns).
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
export function gitRelativePath(from, to) {
  return path.relative(from, to).split(path.sep).join('/');
}

/**
 * Normalize a path to its resolved, trimmed form.
 * @param {string} p
 * @returns {string}
 */
export function normalizePath(p) {
  return path.resolve(p);
}
