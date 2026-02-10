# Cross-Platform Sync Tools

Replaces the PowerShell-based sync scripts with cross-platform JavaScript (ESM `.mjs`).

## Prerequisites

- **Node.js 18+** (already present in any repo with `package.json`)
- **Git** (for hook installation, exclusion management)

## Usage

```bash
# Sync across repos (replaces: pwsh tools/sync_copilot_instructions.ps1)
node tools/sync/index.mjs

# Init a new repo (replaces: pwsh tools/init_protocol.ps1)
node tools/sync/init.mjs --target ./new-project

# Extract docs (replaces: pwsh tools/extract_docs.ps1)
node tools/sync/extract-docs.mjs

# With flags
node tools/sync/index.mjs --skip-tests --dry-run
```

Or with npm scripts (in repos that have them in package.json):
```bash
npm run sync
npm run sync:init
npm run sync:extract
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `AI_PROTOCOL_CONFIG` | Explicit path to `sync_config.yaml` |
| `AI_PROTOCOL_REPO` | Path to the ai-protocol repository |
| `SKIP_HOOK_INSTALL` | Set to `1` to skip hook installation (used by hooks to prevent recursion) |

## Architecture

```
tools/sync/
  index.mjs              # CLI: sync orchestrator
  init.mjs               # CLI: init-protocol
  extract-docs.mjs       # CLI: extract-docs
  lib/
    config.mjs           # YAML config loading & path resolution
    sync-engine.mjs      # Core sync logic (newest-wins)
    git.mjs              # Git operations (exclude, track, hooks)
    paths.mjs            # Cross-platform path utilities
    logger.mjs           # Colored console output (ANSI codes)
    types.mjs            # JSDoc type definitions
  vendor/
    js-yaml.mjs          # Vendored js-yaml (single file, ~50KB)
  __tests__/             # Vitest tests
```

## Key Differences from PowerShell Version

1. **No custom YAML parser** — uses vendored `js-yaml` (eliminates 3 past bugs)
2. **No garbage filename filter** — `path.relative()` doesn't produce truncated filenames
3. **No .NET CWD desync workaround** — Node.js `process.cwd()` is always consistent
4. **Cross-platform paths** — `path.join()` and `path.resolve()` everywhere
5. **Pre-commit hook calls `node`** instead of `pwsh`

## Legacy Scripts

The original PowerShell scripts are backed up in `tools/legacy/` for rollback safety.
