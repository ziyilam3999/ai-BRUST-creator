# PowerShell to JavaScript Migration Summary

> Completed: 2026-02-10

## Overview

The three PowerShell scripts (`sync_copilot_instructions.ps1`, `extract_docs.ps1`, `init_protocol.ps1`) were rewritten as cross-platform JavaScript ESM modules under `tools/sync/`.

## File Inventory

### Shared Libraries (`tools/sync/lib/`)

| File | Lines | Purpose |
|------|-------|---------|
| `types.mjs` | 81 | JSDoc typedefs for IDE IntelliSense |
| `logger.mjs` | ~35 | ANSI-colored terminal output |
| `paths.mjs` | 48 | Cross-platform path utilities |
| `config.mjs` | ~221 | YAML config loading, version management |
| `git.mjs` | ~248 | Git operations (exclusions, hooks, CLAUDE.md) |
| `sync-engine.mjs` | ~327 | Core newest-wins sync logic |

### Entry Points (`tools/sync/`)

| File | Lines | Replaces |
|------|-------|----------|
| `index.mjs` | ~578 | `sync_copilot_instructions.ps1` |
| `extract-docs.mjs` | ~586 | `extract_docs.ps1` |
| `init.mjs` | ~286 | `init_protocol.ps1` |

### Vendor

- `vendor/js-yaml.mjs` — js-yaml v4.1.1 (vendored, zero npm dependencies)

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| `sync-engine.test.mjs` | 16 | All pass |
| `config.test.mjs` | 20 | All pass |
| `git.test.mjs` | 10 | All pass |
| `init.test.mjs` | 15 | All pass |
| `extract-docs.test.mjs` | 22 | All pass |
| **Total** | **83** | **All pass** |

Run with:

```bash
npm run test:tools
```

## npm Scripts

```json
{
  "sync": "node tools/sync/index.mjs",
  "sync:init": "node tools/sync/init.mjs",
  "sync:extract": "node tools/sync/extract-docs.mjs",
  "test:tools": "vitest run --config vitest.config.tools.ts"
}
```

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **ESM-only (.mjs)** | No build step, runs directly with `node` |
| **JSDoc annotations** | Full type hints without TypeScript compilation |
| **Vendored js-yaml** | No `npm install` needed for the sync tools |
| **Separate vitest config** | `vitest.config.tools.ts` runs in `node` environment (not `jsdom`) |
| **Backward compatible** | Same `sync_config.yaml` format, same env vars |

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SYNC_CONFIG_PATH` | Override path to `sync_config.yaml` | Auto-detected |
| `PROTOCOL_REPO` | Override protocol repo location | Auto-detected |
| `SYNC_DRY_RUN` | Preview changes without writing | `false` |
| `SYNC_VERBOSE` | Enable verbose logging | `false` |

## Rollback

Original PowerShell scripts are backed up to `tools/legacy/` with timestamps. To restore:

```powershell
Copy-Item tools/legacy/sync_copilot_instructions.ps1 tools/sync_copilot_instructions.ps1
Copy-Item tools/legacy/extract_docs.ps1 tools/extract_docs.ps1
Copy-Item tools/legacy/init_protocol.ps1 tools/init_protocol.ps1
```

## Known Limitations

- Shebang lines (`#!/usr/bin/env node`) removed from `init.mjs` and `extract-docs.mjs` due to Vite/Rollup parse failures during testing. Files are invoked via `node <file>` directly.
- ASCII-only output characters used in logger (no emoji) for maximum terminal compatibility.
