# Open Items — ai-BRUST-creator

> **Resume context.** Last updated 2026-05-07 from Windows session "brust" handing off to MacBook session "macbook-brust".
> Full handoff context (env vars, OAuth callbacks, DB gotcha, migration mechanics) lives in [`.ai-workspace/sessions/2026-05-07-windows-to-macbook-handoff.md`](sessions/2026-05-07-windows-to-macbook-handoff.md).
> This file is the focused checklist agents load into a `TaskList` on resume. Edit this file as items complete or new ones surface.

---

## Headlines — deploy ai-BRUST-creator to Vercel for E2E

- [ ] **H1.** Confirm deployment target = Vercel + path (GitHub integration vs CLI)  *(decision)*
- [ ] **H2.** Provision Turso production database + run migrations  *(decision: does prod DB exist?)*
- [ ] **H3.** Connect repo to Vercel project (GitHub integration on vercel.com, OR `vercel link` locally)
- [ ] **H4.** Push 10 required env vars to Vercel project (see handoff doc § Env var inventory)
- [ ] **H5.** Register Vercel prod URL as GitHub OAuth callback — `/api/auth/callback/github`
- [ ] **H6.** Register Vercel prod URL as Atlassian OAuth callback (Phase 3 only) — `/api/atlassian/callback`
- [ ] **H7.** Deploy preview + smoke-test golden path E2E (login → wizard → AI gen → save → reload)
- [ ] **H8.** Promote preview → production after smoke test passes

## Repo housekeeping

- [x] **C1.** Sync local master with origin (was 1 commit behind on Windows; done before handoff PR)
- [ ] **C2.** Resolve README ↔ package.json test-script drift  *(decision: restore tests OR strip README lines — recommend strip since `__tests__/` and `e2e/` are now gitignored)*
- [ ] **C3.** Resolve `docs/standards.md` TBD placeholders  *(decision: drop, since `docs/` is now gitignored anyway)*
- [ ] **C4.** Delete 3 merged remote branches: `origin/chore/readme-polish-mermaid`, `origin/feat/add-ci-and-code-review`, `origin/fix/ci-lint-errors`  *(confirm before push)*
- [ ] **C5.** Decide fate of Windows-only `backup/pre-cleanup` branch  *(if preserving, push to origin as `archive/pre-cleanup` BEFORE leaving Windows; otherwise moot on MacBook)*
- [ ] **C6.** Delete merged Windows-only `fix/ci-lint-errors` branch  *(moot on MacBook fresh clone)*
- [x] **C7.** Create `.ai-workspace/plans/` scaffold (done in handoff PR via `.gitkeep`)
- [ ] **C8.** Generate `PROJECT-INDEX.md` via `/project-index` skill  *(run on MacBook after merge)*

---

## Status legend

- `[ ]` pending
- `[x]` done
- *(decision)* — needs user input before agent can proceed
- *(confirm)* — agent has approach, awaiting go-signal for destructive op

## Resume protocol for next session

1. Read this file + the handoff doc it links to.
2. Build a `TaskList` matching the unchecked items, preserving section order (headlines first).
3. Surface the *decision* items to the user before doing anything autonomous.
4. As items complete: tick the box here AND update this file's commit on the next PR. Both the `TaskList` and this file are living documents — keep them in sync.
