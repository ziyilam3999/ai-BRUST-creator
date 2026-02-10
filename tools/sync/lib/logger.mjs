/**
 * @fileoverview Colored console output using ANSI codes (no dependencies).
 */

const colors = {
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

export const log = {
  /** @param {string} msg */
  success: (msg) => console.log(`${colors.green}[ok] ${msg}${colors.reset}`),

  /** @param {string} msg */
  info: (msg) => console.log(`${colors.cyan}->  ${msg}${colors.reset}`),

  /** @param {string} msg */
  warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),

  /** @param {string} msg */
  error: (msg) => console.log(`${colors.red}[x] ${msg}${colors.reset}`),

  /** @param {string} title */
  divider: (title) => {
    const bar = '='.repeat(55);
    console.log('');
    console.log(`${colors.cyan}${bar}${colors.reset}`);
    console.log(`${colors.cyan}${title}${colors.reset}`);
    console.log(`${colors.cyan}${bar}${colors.reset}`);
  },

  /** @param {string} msg */
  plain: (msg) => console.log(msg),
};
