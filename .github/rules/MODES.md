# Mode Workflows
<!-- Referenced from: copilot-instructions.md -->
<!-- Version: 7.9.0 -->
<!-- Note: Replaces SCENARIOS.md (v5 had 7 scenarios A-G, v6 has 4 modes) -->

## Overview

Modes control **gate routing** — which gates fire for a given task. Commands within each mode retain their full independent workflows.

| Mode | Trigger Words | Gates | Commit Prefix | Primary Doc |
|------|--------------|-------|---------------|-------------|
| **PLAN** | plan, assess, propose, evaluate, "what if", "how to" | OPEN, THINK?, LEARN | none | progress.md, decisions.md |
| **IMPLEMENT** | implement, create, build, fix, refactor, add, update | OPEN, THINK?, GO, TEST, SHIP, LEARN | feat: / fix: / refactor: | requirements.md |
| **VERIFY** | verify, audit, test coverage, debug, investigate | OPEN, THINK?, LEARN (+SHIP if fixes) | none / test: | defects.md |
| **SHIP** | commit, push, PR | OPEN, SHIP, LEARN | (per source mode) | changelog.md |

`THINK?` = fires only when QCS >= 2

---

## Mode Transition Detection

If mode changes from previous response:
```
OPEN: [MODE] | QCS:[score] | [task] | SHIFT from [OLD_MODE]
```

Common transitions:
- **PLAN → IMPLEMENT:** User says "Execute" / "Do it" / "Go" after plan review
- **VERIFY → IMPLEMENT:** User says "Fix" after debug investigation
- **IMPLEMENT → SHIP:** Implementation complete, ready to commit
- **Any → PLAN:** User says "Wait, let me think" / "What if..."

## Mode Document Map

| Mode | Read First | Update After |
|------|------------|--------------|
| PLAN | `progress.md`, `code-map.md`, `decisions.md` | `progress.md`, `decisions.md` |
| IMPLEMENT | `requirements.md`, `code-map.md` | `requirements.md`, `code-map.md`, `changelog.md` |
| VERIFY | `defects.md`, `code-map.md`, `testing.md` | `defects.md` |
| SHIP | `changelog.md`, `progress.md` | `changelog.md` |

---

## [PLAN] Mode

**Purpose:** Read-only analysis, planning, proposals. No code changes.

**Commands in this mode:** `/plan`

### Workflow

| Step | Action | Output |
|------|--------|--------|
| 1 | OPEN gate (mode + context) | Context loaded |
| 2 | Read `code-map.md`, `decisions.md` | Existing state understood |
| 3 | THINK gate (if QCS >= 2) | Analysis with Evidence + Approach |
| 4 | Draft plan with "Why" for each step | Execution plan |
| 5 | Self-critique: deflate estimates, check ROI, flag near-ceiling targets | Revised plan |
| 6 | Ask clarifying questions | Ambiguity resolved |
| 7 | Present final proposal | User-ready plan |
| 8 | LEARN gate | Task outcome + insight |

**Pending Decisions Check:** When reading `decisions.md`, surface any pending decisions relevant to current task.

**Handoff:** User confirms -> mode shifts to IMPLEMENT, VERIFY, or SHIP.

---

## [IMPLEMENT] Mode

**Purpose:** Code changes — features, fixes, refactoring. Full gate coverage.

**Commands in this mode:** `/implement`, `/fix`, `/refactor`, `/tdd`, `/checkwork`

### Generic Command Pattern

All IMPLEMENT commands follow the same core flow:
```
investigate → plan → (test-first) → execute → verify
```
Command-specific overrides customize one or two steps of this flow. The generic workflow table below shows the full expansion.

Each command retains its unique behavior via overrides:
| Command | Override from Generic Pattern |
|---------|------------------------------|
| `/implement` | Default: full TDD cycle (spec → failing tests → code → green) |
| `/fix` | Investigate step emphasizes reproduce-first (confirm bug exists before diagnosing) |
| `/refactor` | Investigate step requires coverage check; execute step has NO behavior change constraint |
| `/tdd` | Strict red-green-refactor cycle; no skipping test-first |
| `/checkwork` | Alias: run `/verify` then `/test` in sequence |

### Workflow (generic — commands customize steps 3-7)

| Step | Action | Output |
|------|--------|--------|
| 1 | OPEN gate | Context loaded |
| 2 | THINK gate (if QCS >= 2) | Evidence + Approach |
| 3 | GO gate | User confirmation |
| 4 | Test-first (default) | Failing tests created |
| 5 | Implement code | Feature/fix/refactor done |
| 6 | Verify (tests pass) | Quality confirmed |
| 6b | **Verify-cite** (re-read changed code) | GO spec match confirmed |
| 7 | TEST gate | Coverage verified |
| 8 | Update docs + code-map.md | Docs current |
| 9 | SHIP gate | Verified checklist |
| 10 | Commit | Prefixed commit message |
| 11 | LEARN gate | Outcome + insight |

### Pre-Implementation Baseline Check

**After GO confirmation, before writing any implementation code:**

**Baseline Check:** Run the project's existing test suite with coverage when available:
- **Node.js/TS:** `npx vitest run --coverage` or `npm test -- --coverage`
- **Flutter/Dart:** `flutter test --coverage`
- **Python:** `pytest --cov`
- **Fallback:** `npm test` / `flutter test` (without coverage flag if coverage tool not configured)

REQUIRED for QCS 2+ when Test-first: Y. For QCS 0-1, skip.
Note the baseline coverage % for comparison after implementation.

**Coverage tool failure:** If the coverage command fails (e.g., missing `@vitest/coverage-v8`), fall back to the standard test command without coverage. Coverage absence does NOT block the TEST gate — it is PREFERRED metadata, not a gate requirement.

| QCS | Test-first | Baseline Required? |
|-----|-----------|---------------------|
| 0-1 | N/A (omitted) | No |
| 2+ | Y | **Yes** — run tests before writing code |
| 2+ | N — [reason] | No (TDD waived) |
| 2+ | skip: trivial | No |

The baseline run serves double duty:
1. Establishes RED for TDD (if test-first)
2. Provides terminal evidence that the TEST gate self-check can cite

### TDD Sequencing Rule

See [GATES.md §TDD Workflow Template](GATES.md) for the authoritative TDD sequencing steps (Baseline → Write test → RED CHECK → Implement → GREEN).

**Escape hatches:**
- User says "quick mode" → TDD waived (Test-first: N)
- GO declares `Test-first: N — [reason]` → TDD waived
- GO declares `Test-first: skip: trivial` → TDD waived
- Single GREEN run is sufficient when TDD is waived

### Verify-Cite Rule (QCS 2+)

After implementation, before writing the TEST gate block:
1. Re-read each changed file (or key changed functions) via `read_file`
2. Verify: does the code do what the GO block promised?
   - Does code handle each edge case from THINK? If unhandled → fix before TEST, or note in LEARN Friction.
3. In the TEST block, cite: `Verified: [function/file] matches GO spec — [1-line evidence]`

If a mismatch is found, fix the code before proceeding to TEST. Note the mismatch in LEARN Friction.

At QCS 0-1: skip (overhead exceeds value for micro-tasks).

**Checkpoint Discipline Rule (hard-enforced, IMPLEMENT mode):**
At session turn T4+: if task has ≥2 remaining steps AND no checkpoint file (`tmp/checkpoint-*.md`) written in this session → write checkpoint BEFORE next implementation action. Violation: CE Checkpoint Discipline capped at 2.

### Pre-Implementation Checklist (Multi-Phase Projects)

| Check | Question | If Missing |
|-------|----------|------------|
| Documentation | Does plan include doc steps? | Add: code-map.md, requirements.md |
| TDD Workflow | Each feature has test -> code -> verify? | Add failing test step |
| Progress Tracking | Is progress.md updated? | Add update steps |

### Tool Selection Quick Reference (QCS 2-3)

> Full framework: see CONTEXT.md §2 (loaded at QCS 4+)

| Need | Tool | ~Cost |
|------|------|:-----:|
| Known file + known lines | `read_file` (20-40 lines) | ~500 tok |
| Known file, find pattern | `grep_search` on file | ~200-500 tok |
| Unknown file, known pattern | `grep_search` workspace | ~500-1K tok |
| Broad analysis / counting | `semantic_search` or subagent | ~1-5K tok |

**Decision rule:** Cheapest sufficient tool wins. Multiple small reads > one large search when locations are known.

**Escalation:** If `read_file` total exceeds ~300 lines this session, prefer `grep_search` for remaining lookups.

### `/fix` Specifics

**Override:** Investigate step emphasizes reproduce-first. Confirm the bug exists (run failing case or read error) before diagnosing.

| Step | Action |
|------|--------|
| 1 | **Reproduce:** Confirm the bug exists. Run the failing case or read the error. |
| 2 | **Diagnose:** Find root cause. Use THINK gate. Check for `tmp/debug-plan.md` (from /debug). |
| 3 | **Fix:** Minimal change. Write failing test first (recommended). GO gate for confirmation. |
| 4 | **Verify:** Run tests. TEST gate with verbatim quote. Check regressions. |

**Exception:** Trivial fix (typo, 1 line) -> may skip failing test step.

### `/refactor` Specifics

**Override:** Investigate step requires coverage check. Execute step must preserve behavior (NO behavior change).

| Step | Action |
|------|--------|
| 1 | Analyze code & identify targets; coverage check (search for tests) |
| 2 | Write characterization tests if coverage gap |
| 3 | Execute refactor |
| 4 | Verify ALL tests pass (confirm NO behavior change) |

### `/checkwork` Specifics

**Alias:** Run `/verify` (3 checklists: best practices, efficiency, security) then `/test` (gap analysis + fill gaps) in sequence. Outputs combined findings.

---

## [VERIFY] Mode

**Purpose:** Investigation, auditing, testing. Read-only unless fixes needed.

**Commands in this mode:** `/verify`, `/debug`, `/test`

Each command retains its unique workflow:
| Command | Unique Behavior |
|---------|----------------|
| `/verify` | 3 checklists: best practices, efficiency, security. `--security` flag adds OWASP Top 10. |
| `/debug` | 4-step investigation: Gather, Hypothesize, Test, Confirm |
| `/test` | Module inventory, gap analysis matrix, fill gaps |

### Workflow (generic)

| Step | Action | Output |
|------|--------|--------|
| 1 | OPEN gate | Context loaded |
| 2 | THINK gate (if QCS >= 2) | Evidence + role analysis |
| 3 | Investigation / Analysis | Findings |
| 4 | Present findings | User-ready report |
| 5 | If fixes needed -> GO gate -> shift to IMPLEMENT | |
| 6 | LEARN gate | Outcome + insight |

### `/debug` Specifics (4-Step)

Simplified workflow: Gather evidence → Form hypothesis → Test hypothesis → Confirm fix

| Step | Action |
|------|--------|
| 1 | **Gather evidence:** Read error messages, logs, stack traces. Use THINK gate. Read `code-map.md` to identify affected areas. |
| 2 | **Form hypothesis:** State what you think is wrong and why. |
| 3 | **Test hypothesis:** Run targeted tests or add logging to confirm/reject. |
| 4 | **Confirm fix:** Verify the issue is resolved. If not, iterate (max 5 per SESSION.md). |

**Handoff:** User says "Fix" -> mode shifts to IMPLEMENT, `/fix` command.

### Debug Hypothesis Table

| # | Hypothesis | Confidence | Evidence | Status |
|---|------------|------------|----------|--------|
| H1 | [Theory] | 0.X | [Basis] | ⏳/✅/❌ |

Pursue highest confidence first. If all < 0.7, gather more evidence.

### `/verify` Specifics

**3 Checklists:**
- Best Practices: naming, function size, DRY, SOLID, error handling
- Efficiency: O(n) analysis, resource cleanup, data structures
- Security: credentials, input validation, injection, XSS, logging

**`--security` flag:** Adds OWASP Top 10 checklist + framework-specific security checks.

### `/test` Specifics

| Step | Action |
|------|--------|
| 1 | Inventory modules + existing tests |
| 2 | Present gap analysis table |
| 3 | Confirm plan |
| 4 | Delete obsolete, create missing |
| 5 | Verify all pass |

---

## [SHIP] Mode

**Purpose:** Commit, push, PR. Final verification before shipping.

**Commands in this mode:** `/commit`, `/push`, `/pr`

### Workflow

| Step | Action | Output |
|------|--------|--------|
| 1 | OPEN gate | Context loaded |
| 2 | Run `/update` (docs/learn/explain) | Docs synced |
| 3 | SHIP gate | Verified checklist |
| 4 | Commit with appropriate prefix | Code committed |
| 5 | LEARN gate | Outcome + insight |
| 6 | Post-commit: `/context-save` | Session state saved |

---

## Exceptions

| Exception | Handling |
|-----------|----------|
| Device-specific bugs | Cannot unit test -> document why |
| Platform-specific | Use integration test plan |
| Visual bugs | Screenshot-based verification |
| Not unit-testable | Document reason, use manual test |

---

## Bundling Rules

When user says "Bundle" for mid-task mode shifts:
- Still update relevant doc (`refactoring.md`, `defects.md`)
- Combined commit: `feat: X + refactor: Y`
