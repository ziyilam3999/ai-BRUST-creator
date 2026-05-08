---
type: session-handoff
from_machine: Windows (C:\Users\ziyil\coding_projects\ai-BRUST-creator)
to_machine: MacBook (~/<wherever>/ai-BRUST-creator)
date: 2026-05-07
author_session: brust (Windows)
purpose: Carry open work + investigation findings across machines via git so the next Claude Code session on MacBook can pick up without re-investigating.
---

# Session Handoff — Windows → MacBook

> **For the next Claude Code session reading this on MacBook**: this is your starting context. Load the 16 open items in the "Todo list" section below into a fresh `TaskList`, then continue work. Do NOT re-investigate the deployment surface — the env-var inventory + db gotcha + OAuth callback URLs are already captured here.

## How to use this on MacBook

1. `git clone git@github.com:ziyilam3999/ai-BRUST-creator.git`
2. `cd ai-BRUST-creator && git pull` (in case anything new shipped)
3. `npm install`
4. Recreate `.env` and `.env.local` (see "What does NOT migrate" below)
5. Open the directory in Claude Code
6. As your first prompt, paste: `Read .ai-workspace/sessions/2026-05-07-windows-to-macbook-handoff.md and load the open items into a TaskList in priority order.`

## Todo list — 16 open items at handoff time

### HEADLINES — deploy ai-BRUST-creator to Vercel for E2E

1. **Confirm deployment target = Vercel + path** — choose path A (GitHub integration via vercel.com — recommended, zero CLI) or path B (local `vercel` CLI). User decision needed.
2. **Provision Turso production database + run migrations** — app falls back to `file:local.db` (`src/lib/db/index.ts:7`) if `TURSO_DATABASE_URL` is unset; that fallback won't work on Vercel (read-only filesystem). Required: create Turso DB, capture URL+token, run `npm run db:migrate` against prod URL once. User must confirm whether prod DB already exists.
3. **Connect GitHub repo to Vercel project** — path A: vercel.com → New Project → import `ziyilam3999/ai-BRUST-creator` (auto-detects Next.js 16). Path B: `npm i -g vercel && vercel login && vercel link`.
4. **Push 10 required env vars to Vercel project** — see [Env var inventory](#env-var-inventory-10-required--4-optional) below for the full list.
5. **Register Vercel prod URL as GitHub OAuth callback** — github.com/settings/developers → add `https://<vercel-prod-url>/api/auth/callback/github` to authorized redirects. Recommend creating a *separate* GitHub OAuth app for prod (don't reuse local-dev app's secrets).
6. **Register Vercel prod URL as Atlassian OAuth callback (Phase 3 only)** — developer.atlassian.com/console/myapps → add `https://<vercel-prod-url>/api/atlassian/callback`. Skip if Phase 3 (Confluence/Jira publish) isn't part of this round.
7. **Deploy preview + smoke-test golden path E2E** — trigger preview build, walk: GitHub login → wizard → AI generation → save persists to Turso → reload shows saved doc → optional Atlassian publish. Per global rule: actually use the feature in browser, not just check `next build` succeeded.
8. **Promote preview → production** — path A: merge to master → auto-promote. Path B: `vercel --prod`.

### Repo housekeeping

9. **Sync local master with origin (fast-forward)** — was 1 commit behind on Windows; ALREADY DONE before creating this branch. On MacBook this is a non-issue (fresh clone is at origin).
10. **Resolve README ↔ package.json test-script drift** — README.md:92-93 advertises `npm run test` and `npm run test:e2e`, package.json has neither. Two paths: (A) restore vitest+playwright dev deps + scripts, or (B) strip the lines from README. **Note**: `__tests__/` and `e2e/` dirs are gitignored, so they don't ride along via clone; on MacBook these dirs won't exist unless you copy them manually from Windows. Recommend path B (strip README lines) since the project was intentionally trimmed of tests.
11. **Resolve docs/standards.md TBD placeholders** — `docs/` is now gitignored. On MacBook the file won't exist via clone. Either delete from Windows clone or leave alone (it has no effect on production). Recommend: drop, since it was a stub and dir is no longer tracked.
12. **Delete 3 merged remote feature branches** — `origin/chore/readme-polish-mermaid` (PR #3), `origin/feat/add-ci-and-code-review` (PR #1), `origin/fix/ci-lint-errors` (PR #2). Safe via `git push origin --delete <branch>`. This is a remote operation — works the same on MacBook.
13. **Decide fate of local `backup/pre-cleanup` branch** — Windows-only branch ~many commits ahead of master; snapshot before `dde71de` cleanup. **MacBook fresh clone won't have this branch.** Decision: (A) push to origin as `archive/pre-cleanup` from Windows BEFORE switching machines if you want it preserved, (B) discard. Recommend B unless you've referenced it.
14. **Delete merged local branch `fix/ci-lint-errors`** — Windows-only. Moot on MacBook (won't exist after fresh clone).
15. **Create `.ai-workspace/plans/` scaffold** — DONE in this PR (`.ai-workspace/plans/.gitkeep` added).
16. **Generate `PROJECT-INDEX.md` via /project-index** — not done in this PR to keep diff small. Run `/project-index` skill on MacBook after merging this PR.

## State of repo at handoff (2026-05-07)

- Default branch: `master`
- Latest commit on master: `375c42d` (chore: remove CI code-review)
- This PR's branch: `chore/windows-to-macbook-handoff`
- Working tree: clean
- Open PRs: 0 (this handoff PR will be #4)
- Open GitHub issues: 0
- Last 3 merged PRs: #3 (readme polish), #2 (eslint fix), #1 (CI pipeline)

## Env var inventory (10 required + 4 optional)

Source: `.env.example` + grep of `process.env.*` across `src/`.

### Required for E2E

| Var | Purpose | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public app URL | Same as Vercel prod URL |
| `NEXTAUTH_URL` | NextAuth base URL | Same as Vercel prod URL |
| `NEXTAUTH_SECRET` | JWT signing | **Generate fresh for prod** via `openssl rand -base64 32` — do NOT reuse local |
| `GITHUB_CLIENT_ID` | GitHub OAuth | Recommend separate prod OAuth app |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | Pair with prod ID |
| `ANTHROPIC_API_KEY` | Claude AI generation | From console.anthropic.com |
| `TURSO_DATABASE_URL` | Production DB | **Critical** — fallback to local.db won't work on Vercel |
| `TURSO_AUTH_TOKEN` | Turso auth | Pair with DB URL |

### Required for Atlassian publish (Phase 3 only)

| Var | Notes |
|---|---|
| `ATLASSIAN_CLIENT_ID` | From developer.atlassian.com |
| `ATLASSIAN_CLIENT_SECRET` | Pair with ID |
| `ATLASSIAN_ENCRYPTION_KEY` | **Generate fresh** via `openssl rand -hex 32` (32 bytes hex = 64 chars) |

### Optional (have hard-coded defaults)

| Var | Default | Code reference |
|---|---|---|
| `CONFLUENCE_SPACE_KEY` | `BRUST` | `src/app/api/publish/confluence/route.ts:103` |
| `CONFLUENCE_PARENT_PAGE_ID` | (none) | `src/app/api/publish/confluence/route.ts:104` |
| `JIRA_PROJECT_KEY` | `PROJ` | `src/app/api/publish/jira/route.ts:112` |
| `JIRA_ISSUE_TYPE` | `Story` | `src/app/api/publish/jira/route.ts:113` |

## OAuth callback URLs to register

Both must be registered in their respective dashboards before login/publish flows work in production:

| Provider | Callback URL | Where to add |
|---|---|---|
| GitHub | `https://<vercel-prod-url>/api/auth/callback/github` | github.com/settings/developers |
| Atlassian | `https://<vercel-prod-url>/api/atlassian/callback` | developer.atlassian.com/console/myapps |

## DB fallback gotcha (don't get burned)

`src/lib/db/index.ts:7` falls back to `file:local.db` if `TURSO_DATABASE_URL` is unset:

```ts
url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
```

This is fine for local dev (SQLite file in repo root), but on Vercel:
- Filesystem is read-only outside `/tmp`
- Functions are stateless; any data written would vanish between invocations

**Always set `TURSO_DATABASE_URL` in Vercel env, even if testing.**

## Recommended deploy path

**Path A (GitHub integration via vercel.com)** — zero CLI.
- vercel.com → New Project → import `ziyilam3999/ai-BRUST-creator`
- Vercel auto-detects Next.js 16
- Every push to a branch creates a preview deployment
- Merging to master auto-promotes to production
- Env vars entered once via dashboard (Production + Preview scope)

Tradeoff vs path B (CLI): no scriptable env-var pushes, but no extra tool either. Recommended for solo dev.

## What migrates via git (automatic on MacBook clone)

- All committed source code under `src/`, `public/`
- This handoff doc + `.ai-workspace/plans/.gitkeep`
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `drizzle.config.ts`, `components.json`, `postcss.config.mjs`
- `README.md`, `LICENSE`, `.env.example`, `.gitignore`

## What does NOT migrate (must recreate manually on MacBook)

| Item | How to recreate on MacBook |
|---|---|
| `.env` | Copy from Windows via secure transfer (encrypted ZIP / USB / 1Password), or re-populate from `.env.example` by re-pulling secrets from each provider |
| `.env.local` | Same as above |
| `local.db` | Auto-regenerates on first `npm run dev` (or copy from Windows if you want to preserve dev data) |
| `node_modules/` | `npm install` |
| `.next/`, `tsconfig.tsbuildinfo` | Auto-regenerate on `npm run dev` / `next build` |
| `__tests__/`, `e2e/`, `tools/`, `scripts/`, `docs/` | Gitignored. Were intentionally stripped from production in commit `dde71de`. Don't carry over unless you have a reason. |
| `playwright-report/`, `test-results/`, `tmp/` | Build artifacts; ignore |
| Local-only branches: `backup/pre-cleanup`, `fix/ci-lint-errors` | If you want `backup/pre-cleanup` preserved, push it to origin from Windows BEFORE switching: `git push origin backup/pre-cleanup:archive/pre-cleanup`. Then delete locally. |
| Claude Code memory at `C:\Users\ziyil\.claude\projects\C--Users-ziyil-coding-projects-ai-BRUST-creator\memory\*` | Windows-specific path. MacBook equivalent: `~/.claude/projects/-Users-<you>-coding-projects-ai-BRUST-creator/memory/*` and starts empty. This handoff doc + global cards (under `~/.claude/agent-working-memory/`) cover the project context. |
| Mailbox session ID `38b0dd68-7f5a-4564-af29-b735b96e69b2` | Windows session, not portable. New session on MacBook gets a new ID. |
| `.ai-workspace/sessions/<mailbox-id-file>` | Per-session bookmark; ignore. |

## Path differences to note on MacBook

| Aspect | Windows | MacBook |
|---|---|---|
| Repo path | `C:\Users\ziyil\coding_projects\ai-BRUST-creator` | `~/coding_projects/ai-BRUST-creator` (or wherever you clone) |
| Path separator in errors/logs | `\` | `/` |
| Shell | PowerShell (use `$env:VAR`, `$null`, backtick line cont.) | Bash/Zsh (use `$VAR`, `/dev/null`, `\` line cont.) |
| Claude Code config home | `C:\Users\ziyil\.claude\` | `~/.claude/` |
| Line endings (be aware) | CRLF default | LF default — git's `core.autocrlf` may matter |

## Investigation findings (don't redo on MacBook)

These were measured during the Windows session and saved here so the MacBook session doesn't re-investigate:

1. **No `vercel.json` and no `.vercel/`** — project not yet linked to a Vercel project. `next.config.ts` is empty (no custom config); Next.js 16 default detection works on Vercel.
2. **CI pipeline is live** — `.github/workflows/ci.yml` tracked-but-now-gitignored (works because git updates tracked files even after they're added to .gitignore). Last run on master: success at `2026-04-18T05:12:48Z`.
3. **3 stale remote branches exist** — all merged via PR #1/#2/#3, safe to delete (task #12 above).
4. **No open issues, no open PRs** before this handoff PR.
5. **`docs/`, `__tests__/`, `e2e/`, `tools/`, `scripts/` are gitignored** — these were intentionally stripped from production in commit `dde71de`. Don't fight it; treat them as local-only scratch.

## End of handoff

When the MacBook session has read this and rebuilt the TaskList, mark task #15 (`.ai-workspace/plans/` scaffold) and task #9 (master sync) as completed — both were done as part of this handoff PR.
