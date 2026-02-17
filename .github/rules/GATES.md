# Gate Specifications
<!-- Referenced from: copilot-instructions.md -->
<!-- Version: 8.0.0 -->
<!-- Note: Absorbs content from FAST_PATH.md (deleted in v6.0) and CHECKLISTS.md (deleted in v5.x) -->
<!-- Advanced/optional practices planned for future version -->

## Gate Overview

All 6 gates are **hard-enforced**. If a gate is applicable, it MUST fire.

| Gate | When | Hard? | Observable Artifact |
|------|------|-------|---------------------|
| **OPEN** | First line, every response | YES | Single-line `OPEN:` |
| **THINK** | QCS >= 2 | YES | Evidence + Approach block |
| **GO** | Before code changes | YES | User confirmation prompt |
| **TEST** | After implementation | YES | Coverage tool output |
| **SHIP** | Before commit | YES | Tests + Verified + GATE checklist |
| **LEARN** | **End of EVERY response** | YES | `---` then LEARN block |

**Complete response examples:** See [EXAMPLES.md](EXAMPLES.md) for full agent responses demonstrating all gates in context.

---

## Substance-First Rule

**All gates exist to improve code quality, not to produce formatted output.**

| Priority | What | Override |
|----------|------|--------|
| 1 | **Code correctness** — code compiles, runs, handles edge cases | Never compromised |
| 2 | **Verification** — tests run, output verified, regressions checked | Never compromised |
| 3 | **Gate formatting** — blocks in correct format | May be abbreviated if 1+2 are at risk |
| 4 | **Context sustainability** — agent maintains enough context to complete the task | Follow [CONTEXT.md](CONTEXT.md) for efficient tool use and delegation |

If ceremony is consuming attention needed for code quality, reduce gate block detail rather than reducing code quality. Specifically:
- LEARN can drop to compact format: `LEARN: done | [insight or none] | [N]/[N]`
- THINK can drop Evidence detail (keep Approach)
- SHIP can drop to 3-field format: Tests + Anti-phantom + GATE status

**Never abbreviate:** OPEN (1 line), GO (user safety), TEST command output (verification integrity)

---

## Progressive Ceremony

Gate overhead scales by QCS. Simple tasks get minimal ceremony.

### QCS-Based Gate Activation

| QCS | Gates Active | Token Overhead |
|-----|-------------|----------------|
| 0-1 | OPEN (1 line) + GO (if code) + SHIP (if commit) + LEARN (3 lines) | ~200-450 |
| 2-3 | OPEN + THINK (compact) + GO + TEST + SHIP + LEARN | ~650-1,300 |
| 4-6 | All 6 gates, full ceremony | ~1,300-1,900 |

### Micro-Task Fast Lane (QCS 0)

**Trigger:** Task matches ALL criteria:
- Single file OR terminal-only
- <=3 lines changed (or no code change)
- No behavior change to existing code

**Format:**
```
OPEN: IMPLEMENT | QCS:0 | [task]
```

**Micro-Task Categories:**

| Category | Examples | Gates Active |
|----------|----------|-------------|
| Typos & Text | Fix spelling, update error message | OPEN + SHIP (if commit) + LEARN |
| Imports | Add/remove import, reorder | OPEN + SHIP + LEARN |
| Comments | Add TODO, update comment | OPEN + SHIP + LEARN |
| Trivial Fixes | Missing semicolon, add `const` | OPEN + GO + SHIP + LEARN |
| Config Tweaks | Bump version, toggle flag | OPEN + GO + SHIP + LEARN |
| Terminal Only | Run app, monitor logs, git status | OPEN only |

**Exit to full ceremony if:** Change grows beyond 3 lines, behavior change discovered, or multiple files needed.

### Follow-Up Responses

**In same conversation, after initial OPEN + THINK:**
```
OPEN: [MODE] | QCS:[score] | [task] | follow-up
```
One line. No re-loading context. No repeated THINK.

**Follow-up detection:** Append `| follow-up` when: same task/file continues, user responds to your output, references prior work, or <3 turns since last exchange.

When using `| follow-up`, reference prior context briefly: “Continuing from [prior task summary]” in the first line after OPEN.
**Follow-up default:** When uncertain whether `| follow-up` applies, default to tagging it. Over-tagging is cosmetic; under-tagging wastes tokens via unnecessary context reload.
### When to Skip Planning

MAY skip planning when:
- User uses explicit format: "Fix X in Y file"
- User says "just do it" / "skip planning" / "quick mode"
- Single-file scope with clear behavior
- Follow-up with clear context from previous turn

NEVER skip (even in fast-path): OPEN, GO (before code), SHIP (before commit), LEARN

---

## OPEN Gate

**Trigger:** First line of EVERY response. No exceptions.

**Placement (hard):** OPEN must be character-position-0. No greeting or preamble before `OPEN:`.

**Format (1 line):**
```
OPEN: [MODE] | QCS:[0-6] | [task-summary]
```

**Minimum required:** MODE + QCS + summary (3 fields).
**First response, QCS 2+:** `ctx:` field is REQUIRED. List files loaded via tool calls. Format: `ctx:[file1, file2]`. On follow-up responses, omit ctx.
**QCS 0-1 or follow-up:** `ctx:` field is optional.

**Recommended (full):**
```
OPEN: [MODE] | QCS:[0-6] | [task-summary] | ctx:[files-read]
```

**Conditional suffixes (append when applicable):**
- First response: no suffix
- Follow-up in same mode: `| follow-up`
- Mode change mid-conversation: `| SHIFT from [OLD_MODE]`
- Turn 8-9: `| T[N]` (turn counter for session awareness)
- Turn 10+ (long session): `| session:long`

**Examples:**
```
OPEN: PLAN | QCS:0 | explain concept | ctx:[]
OPEN: IMPLEMENT | QCS:3 | add feature | ctx:[app.tsx]
OPEN: VERIFY | QCS:2 | debug issue | ctx:[form.tsx]
OPEN: IMPLEMENT | QCS:0 | fix typo
OPEN: IMPLEMENT | QCS:3 | fix null pointer | SHIFT from PLAN
OPEN: IMPLEMENT | QCS:2 | continue feature | T9
OPEN: IMPLEMENT | QCS:2 | continue feature | session:long
```

**Mode shift examples (2-turn):**
```
Turn 1: OPEN: VERIFY | QCS:2 | debug null pointer | ctx:[UserService.ts]
Turn 2: OPEN: IMPLEMENT | QCS:2 | fix null pointer | SHIFT from VERIFY
Turn 2 is a follow-up+shift: references prior VERIFY findings, uses SHIFT suffix.
```

### OPEN Self-Check (Before Writing OPEN Line)

Before writing the OPEN line, perform this 4-point check:
1. **Mode:** Scan prompt for FIRST keyword match per Decision Tree.
   Match found? → Use matched Mode. No match? → PLAN (default).
   If follow-up + mode change: append `| SHIFT from [OLD_MODE]`.
2. **QCS:** Count indicators: multi-file? uncertainty? risk? complexity? cross-domain? grep 3+?
   Total = QCS score. At QCS 2+ first response: prepare proof line with `[keyword: "X" → MODE]`.
3. **CTX:** First response + QCS 2+? → CTX block REQUIRED after OPEN.
   Follow-up? → CTX omitted. Check: docs list matches actual tool calls (no phantoms).
4. **Suffix:** First response → no suffix. Follow-up (same task) → `| follow-up`.
   Mode shift → `| SHIFT from [MODE]`. Turn 8+ → `| T[N]`. Turn 10+ → `| session:long`.

If any check fails, fix before outputting OPEN.

### Common OPEN Errors (self-check prevents these)

| Error | Wrong | Right |
|-------|-------|-------|
| VERIFY vs IMPLEMENT | "fix failing tests" at IMPLEMENT | "check why tests fail" → VERIFY |
| QCS inflation | "fix typo" at QCS:2 | "fix typo in validation.ts" → QCS:0 |
| Missing shift suffix | mode change without suffix | `\| SHIFT from VERIFY` |
| QCS risk-path confusion | "fix typo in auth.ts" at QCS:2 (risk: auth) | "fix typo in auth.ts" → QCS:0 (task is typo fix, not auth change) |
| CTX phantom/omission | `ctx:[api.ts, auth.ts]` (only read api.ts) | `ctx:[api.ts]` (matches actual tool calls) |

### Mode-Selection Decision Tree (scan prompt for FIRST match)

| Prompt Contains | Mode | Why |
|----------------|------|-----|
| "investigate", "debug", "check why", "audit", "verify" | VERIFY | Investigation before action |
| "plan", "assess", "should I", "what if", "how to", "evaluate" | PLAN | Read-only analysis |
| "commit", "push", "pr", "ship" | SHIP | Code delivery |
| "implement", "create", "build", "fix", "refactor", "add", "update" | IMPLEMENT | Code changes |
| None of the above (pure Q&A) | PLAN | Default to analysis |

**QCS Calculation Example:**
Prompt: "Refactor the auth middleware to support refresh tokens"
→ multi-file? ✓(+1) | "refactor" risk? ✓(+1) | → QCS: 2

**Additional QCS examples:** QCS 0: "Fix typo on line 42" → all ✗ → 0. QCS 5: "Implement payment with Stripe, migrations, admin dashboard" → multi-file✓ risk✓(payment) complexity✓ cross-domain✓(UI+backend+DB) grep 3+✓ → 5.

**QCS indicator precision:**
- Risk keywords evaluate the *task domain*, not file paths: `auth.ts` in path ≠ risk(auth) unless task changes auth behavior
- Multi-file: count files the *task* touches, not files mentioned in the prompt
- Complexity: applies when task requires novel logic or multi-step reasoning, not when code is merely long

**QCS Proof (Required at QCS 2+, first response only):**
Show indicator scan on one line after OPEN:
`QCS: multi-file? ✓/✗ | uncertainty? ✓/✗ | risk? ✓/✗ | complexity? ✓/✗ | cross-domain? ✓/✗ | grep 3+? ✓/✗ → N [keyword: "X" → MODE]`

**Mode traceability:** The `[keyword: "X" → MODE]` suffix cites the prompt keyword that triggered Mode per the Decision Tree. If no keyword matches: `[keyword: none → PLAN (default)]`.
Example: `QCS: multi-file? ✓ | risk? ✓(auth) → 2 [keyword: "investigate" → VERIFY]`

At QCS 0-1 or follow-up: QCS proof line omitted (overhead exceeds value).

**QCS on mode-shift:** `QCS: [indicator] → [N] (was [M])` — e.g., `+risk(auth) → 3 (was 1)`

### CTX (Required for first response, QCS 2+)

**First response only:** After OPEN line, report session status and files loaded via tool calls.

**Format by QCS:**

QCS 0-1 (inline, optional):
```
CTX: fresh | docs: [list or none]
```

QCS 2+ (multi-line, REQUIRED on first response):
```
CTX:
- Session: [fresh / restored from tmp/session-context.md]
- Docs: [file1, file2, ...] (verified via tool calls)
```

On follow-up responses: omit CTX (context already established).

**Session status determination:**
Session status: `fresh` when no prior messages exist and no `tmp/session-context.md` found. `restored` when `tmp/session-context.md` exists and was read. When uncertain, default to `fresh`.

**CTX detection:** Per OPEN self-check item 3. When uncertain, include CTX.

**CTX accuracy self-check (mechanical):**
0. Determine Session status: check for `tmp/session-context.md` existence via tool call or session history
1. List all `read_file`, `grep_search`, `semantic_search` tool calls made so far
2. Write exactly those file paths in `Docs:[...]` — no phantom files, no omissions
3. Zero tool calls → write `Docs: none` (empty is honest; phantom is not)

**Context loading:** `code-map.md` → grep/search → read_file (sparingly). Spec check: optionally search naming conventions when creating named items.

---

## THINK Gate

**Trigger:** QCS >= 2. Hard-enforced.

**Format (2-15 lines depending on QCS):**
```
THINK:
- Evidence: [what I found — file refs from tool calls]
- Approach: [plan + any risks] [SECURITY if auth/payment]
```

**Rules:**
- Evidence must cite real file paths from actual tool calls
- No self-assessed confidence scores
- Evidence gaps → list as assumptions at GO gate
- SECURITY tag auto-added to Approach when task involves auth, payment, credentials, encryption

**Scaling (quality floors, not line targets):**
- QCS 2-3: Compact — Evidence + Approach. Minimum: 1 file citation, 1 risk/assumption.
- QCS 4-5: Standard — Multiple evidence citations, explicit risk inline. Minimum: 2 citations, edge cases.
- QCS 6: Deep — Add mid-checkpoint ("Pausing — are assumptions correct?") before Approach. Minimum: 3 citations.

**Conflicting evidence:** Flag as `Conflict: [A] vs [B] — resolving by [approach]`.

**SECURITY auto-triggers:** auth, payment, user data, credentials, permissions, encryption, tokens, API keys, secrets, PII, GDPR, session management

**Evidence citation template:** Per self-check items 1-2: `[file]:[line] — [finding]` citations from actual tool calls. QCS 2-3: compact (inline). QCS 4+: itemized list.

**IMPLEMENT mode addition (QCS 2+):**
After Evidence and Approach, add an edge-case prompt:
```
- Edge cases: [list 2-3 edge cases the implementation must handle]
```

Edge cases come from Evidence — look for null inputs, empty collections, async race conditions, error states, boundary values. Minimum 2 items. If no edge cases apply (pure config, comment-only change): `Edge cases: N/A — [reason]`.

Example: `Edge cases: null user object, empty permissions array, concurrent session invalidation`

**Edge case quality:** See Common THINK Errors table (generic vs evidence-derived). Score 3 cites Evidence findings with file:line; score 2 uses generic checklist items. Each edge case at score 3 cites a specific Evidence finding and derives the risk from the actual code pattern.

**Edge case accountability:** Per TEST SC6 — each edge case addressed in implementation or GO Assumptions.

**Evidence precision rules (hard-enforced):**
1. Each Evidence item MUST correspond to an actual tool call (`read_file`, `grep_search`, etc.) made in this response
2. Format: `[file]:[line] — [specific finding]` (not "I checked file.ts" or "the file has relevant code")
3. Minimum evidence items: QCS 2-3 = 1 citation, QCS 4+ = 2 citations
4. If fewer tool calls than minimum were made, cite what exists honestly. Do not fabricate additional citations to meet the minimum.
6. If no tool calls were made: Evidence = "No tool calls — approach based on user description"

**Self-Check (Before Writing THINK Block):**
Before writing any THINK block, perform this 4-point check:
1. **Evidence format:** Does each item follow `[file]:[line] — [specific finding]`?
   Banned: "I looked at", "I checked", "based on review", "the codebase shows."
   If no tool calls made: write "No tool calls — approach based on user description."
2. **Citation count:** 1 minimum for QCS 2-3, 2 for QCS 4+. If fewer tool calls than minimum,
   cite what exists honestly. Do not fabricate.
3. **Risk in Approach:** At least one `Risk:` statement required.
   If no risks: `Risk: None identified — [1-line justification why low risk]`.
4. **Depth:** QCS 2-3 → compact (3-5 lines)? QCS 4-5 → standard (5-10 lines)? QCS 6 → deep (10-15 lines + mid-checkpoint)?
   If depth mismatches QCS tier → adjust before outputting.

If any check fails, fix before outputting THINK.

**Evidence validity:** `file:line — finding` = valid. Vague claims or fabricated paths = invalid. See self-check items 1-2.

### Common THINK Errors (self-check prevents these)

| Error | Wrong | Right |
|-------|-------|-------|
| Generic edge cases | `Edge cases: null input, empty array, invalid type` | `Edge cases: [auth.ts:47] userId from auth header → null when unauthenticated; [cache.ts:23] Map.get() → undefined for missing key` |
| Generic phrasing | `Evidence: I looked at auth.ts and found validation logic` | `Evidence: auth.ts:47 — validateEmail() uses regex; auth.ts:62 — signOut() calls invalidateSession()` |
| Missing risk or wrong depth | `Approach: Add validation.` (QCS 4+, no Risk, compact 2 lines) | `Approach: Add email validation via middleware. Risk: regex DoS on untrusted input. [5+ lines at QCS 4+]` |

---

## GO Gate

**Trigger:** Before any code changes. IMPLEMENT and VERIFY (if fixes) modes.

**Format (3-6 lines):**
```
GO:
- Plan: [1-line summary of what you'll do]
- Files: [N] modify, [N] create
- Test-first: [Y / N — reason / skip: trivial]
- Assumptions: [scan: library? pattern? naming? scope? gaps?] → [specific items, or "None — fully specified"]
- Reply to confirm, "modify" to change, "cancel" to stop
```

**Field definitions:**
- **Plan:** 1-line summary of what you'll do. When `Test-first: Y` at QCS 2+, the Plan field MUST begin with "Step 1: Run baseline tests. Step 2: Write failing test for [behavior]." This is not advisory — it is required for TDD traceability.
- **Files:** Count of files to modify and create.
- **Test-first (QCS 2+ required, QCS 0-1 omit):** Explicit TDD decision. Values:
  - `Y` — will write tests before implementation (default for behavior changes)
  - `N — [reason]` — user said "quick mode" or has specific justification
  - `skip: trivial` — change is <=3 lines with no behavior change
- **TDD Plan (QCS 2+, when Test-first: Y):** Names the specific test deliverables before implementation begins.
  Format: `Test file: [path], Cases: [case1, case2, ...], Strategy: RED→GREEN`
  - Test file: path to the test file (existing or to-be-created)
  - Cases: list of specific test case names/descriptions (minimum 2)
  - Strategy: always `RED→GREEN` unless user said "quick mode" (then `test-after`)
  This field creates accountability: TEST gate must show these cases executing.
- **Assumptions:** List unverified decisions. "None" is valid.

If Plan includes tests, TEST gate must quote terminal output (see TEST Verbatim Quote Rule).

**The `Assumptions` field is ALWAYS present.** Write `None` if no assumptions.

**Assumption generation checklist (scan before writing "None"):**
1. Did you choose a library, framework, or API version? → Assumption
2. Did you choose a design pattern the user didn't specify? → Assumption
3. Did you choose naming conventions or file locations? → Assumption
4. Are there multiple valid approaches and you picked one? → Assumption
5. Did THINK identify any evidence gaps? → Carry forward as Assumption
6. Does the user's request have ambiguous scope? → Scope assumption: "Interpreting X as Y, not Z"

If ANY of the above apply, list them. "None" is valid ONLY when the task is fully specified and you made zero design decisions.

**Assumption exemptions (NOT scope concerns):**
Standard practices named in the prompt are not scope concerns UNLESS the specific approach is ambiguous ("add tests" without specifying unit/integration/e2e = assumption; "add unit tests" = not).

**Assumptions quality:** `None` when choices were made = score 2. List specific choices = score 3.

**Self-Check (Before Writing GO Block, QCS 2+):**
Before writing any GO block at QCS 2+, perform this 4-point check:
1. **Plan-TDD prefix:** If Test-first: Y, does Plan begin with "Step 1: Run baseline tests. Step 2: Write failing test..."?
   If no → fix before outputting.
2. **Assumptions scan:** Run the 6-item checklist above. Count results. If count > 0 but you wrote "None" → list them.
   If count = 0 → write "None — fully specified."
3. **TDD Plan field:** If Test-first: Y, is TDD Plan present with test file + ≥2 cases + strategy?
   If no → add before outputting.
4. **Assumption count (QCS 2+):** Count listed assumptions. If checklist (item 2) yielded > 0 items, verify ≥ 2 specific assumptions listed. If count < 2 → add specific items from checklist results.

If any check fails, fix before outputting GO.

### Common GO Errors (self-check prevents these)

| Error | Wrong | Right |
|-------|-------|-------|
| Phantom "None" | `Assumptions: None` (chose Tailwind, port 3000) | `Assumptions: 1. Tailwind (not CSS modules). 2. Port 3000.` |
| Vague TDD Plan | `TDD Plan: Test it works` | `TDD Plan: Test file: x.test.ts, Cases: [validates-email, rejects-weak-pwd], Strategy: RED→GREEN` |
| Missing Plan prefix | `Plan: Add validation and tests` (QCS 2+, Test-first: Y) | `Plan: Step 1: Run baseline. Step 2: Write failing test for validation. Step 3: Implement.` |
| Missing scope | `Assumptions: None` (user said "should I", "maybe") | `Assumptions: 1. Scope: Interpreting "products page" as products list view, not product detail page` |

**Assumption depth (QCS 2+):** Minimum 2 specific assumptions when checklist yields items. Name specific choices ("Using Tailwind" not "chose styling approach"). QCS 0-1: omit per micro-format. "None" at QCS 2+ is rare — verify via self-check item 4.

**Scope surfacing:** User uncertainty ("should I", "maybe", "not sure") → Assumptions: `Scope: Interpreting "[phrase]" as [interpretation]`. See Common Error row 4.

**Shortened format for micro-tasks (QCS 0-1):**
```
GO:
- Plan: [1-line]
- Files: [N files]
- Reply to confirm
```

### Flexible Confirmation

**Confirmation:** yes/go/approved/do it → proceed. hold/cancel/question → reject. Ambiguous → re-prompt.

### GO Gate Output Routing (QCS 2+)

When GO content exceeds ~500 tokens (multi-phase plans, 3+ assumptions, open questions), write to file.

**File convention:** `tmp/go-review/{command}/{NNN}-{descriptor}-go-gate.md`

| Routing | When |
|---------|------|
| Inline chat | QCS 0-1, or QCS 2+ with ≤3 files and no open questions |
| File (mandatory) | Multi-phase plan, open questions, or >500 tokens |

**Chat output when file used:** `GO gate written → [path]. Review and reply: confirm / modify [phase#] / show [phase#] / cancel`

**Cleanup:** Delete `tmp/go-review/` files after task commit.

### TDD Workflow Template (IMPLEMENT Mode, QCS 2+)

When `Test-first: Y` is declared in GO, follow this workflow mechanically:

| Step | Action | Terminal Call? | Expected Output |
|------|--------|---------------|------------------|
| 0 | Run baseline tests | YES | `> [test cmd] → "[N] passed, [N] failed"` |
| 1 | Write failing test(s) per TDD Plan Cases | No | Test file created/modified |
| 2 | Run tests — verify RED | YES | New tests MUST show as failed |
| 2b | **RED CHECK** — count new failures | YES | `RED CHECK: [N] new test(s) failing → proceed` |
| 3 | Implement minimum code to pass | No | Source file(s) modified |
| 4 | Run tests — verify GREEN | YES | `> [test cmd] → "[N+M] passed, 0 failed"` |
| 5 | Refactor if needed (optional) | No | Source file(s) cleaned up |
| 6 | Run tests — confirm still GREEN (if step 5) | YES | `> [test cmd] → "[N+M] passed, 0 failed"` |

**Hard rules:**
- Steps 0, 2, 4 require terminal calls (minimum 3 `run_in_terminal`)
- RED (Step 2): MUST show new failures. All passing → test doesn't verify new behavior → rewrite
- GREEN (Step 4): MUST show all tests passing including new ones

**First-Command Rule (hard-enforced, v10.4.1):**
When `Test-first: Y` is declared in GO, the agent's **FIRST tool call** after GO confirmation MUST be `run_in_terminal` with the baseline test command (Step 0). This means: NO `edit_file`, `create_file`, `replace_string_in_file`, or any file-modification tool before the baseline test run. Any implementation tool call before baseline run → TDD sequence violated → TEST gate capped at score 2. Note in LEARN Friction: "TDD gap: implementation before baseline."

**First-Command Self-Check:** Immediately after GO confirmation, ask: "Is my next tool call `run_in_terminal`?" If NO → stop, run tests first.

**RED CHECK Rule (hard-enforced):**
- After running tests at Step 2, output: `RED CHECK: [N] new test(s) failing → proceed`
- If RED CHECK shows 0 new failures: `RED CHECK: 0 new failing → test does not validate new behavior → REWRITE`
- Agent MUST rewrite the test before proceeding to Step 3. Implementation code written with all-passing tests is NOT TDD.
- If after rewrite, RED CHECK still shows 0: note in LEARN Friction: "TDD gap: could not produce failing test for [behavior]"

### Common TDD Errors (self-check prevents these)

| Error | Wrong | Right |
|-------|-------|-------|
| RED CHECK narrative | `"Tests failed as expected"` (no terminal output) | `RED CHECK: 2 new test(s) failing → [case1, case2]` with terminal paste showing error messages |
| First-Command violation | GO confirms → next call is `edit_file` (implementation before baseline test) | GO confirms → next call is `run_in_terminal` with test command (baseline first per First-Command Rule) |

**RED CHECK Prerequisite (hard-enforced):**
- TEST gate score ≥ 3 requires a passing RED CHECK (N > 0 new failures confirmed)
- If RED CHECK was not performed or showed 0, TEST gate is capped at score 2
- If TDD is not applicable (config change, docs-only, no test framework): `RED CHECK: N/A — [reason]` bypasses the cap

**TDD Output Proof (v7.6+):**
- RED CHECK: Include terminal output showing the failing test name + error message
- GREEN CHECK: Include terminal output showing all tests passing (including new ones)
- If terminal output is unavailable, state: `TEST OUTPUT: [reason unavailable]`
- Output proof moves TDD from "pattern demonstrated" to "output proved"

**TDD Evidence Scoring:** Terminal paste with errors = 3 | RED CHECK counts only = 2 | Narrative ("I wrote tests first") = ≤1.

**Self-check:** If your terminal history doesn't show RED → GREEN progression, TDD was not followed. Note honestly in TEST block and LEARN Friction.
**T10+ shortcut:** Use late-session TDD format below (1 line replaces full template).

**TDD Quick Path (single-function, QCS 2-3):**
For simple additions (1 function, 1 test file), use this 4-step shortcut:
1. Baseline: `[test cmd]` → note pass count + coverage
2. Write test → run → confirm RED: `RED CHECK: [N] new failing → proceed`
3. Implement → run → confirm GREEN: `[N+K] passed, 0 failed`
4. Report: `RED: [N] failed | GREEN: [N+K] passed | Δcov: [X]→[Y]%`

Use full 7-step template for: multi-file TDD, QCS 4+, or complex state interactions.

**Late-session TDD (T10+ / session:long):**
When session is at turn 10+, use abbreviated TDD format to conserve context:
```
RED: [cmd] → [N] failed | GREEN: [cmd] → [N] passed | Δcov: [X]→[Y]%
```
This single-line format replaces the multi-step template. Still requires actual terminal runs.

---

## TEST Gate

**Trigger:** After implementation complete. IMPLEMENT mode.

**Format — QCS 0-1 (1 line):**
```
TEST: [exact terminal command you ran] → "[copy-paste pass/fail line from terminal output]" → GATE:[status]
```

**Format — QCS 2+ (2 lines):**
```
TEST:
- Run: [exact terminal command you ran] → "[copy-paste pass/fail line from terminal output]"
- GATE: [PASSED / BLOCKED: reason]
```

**Format — QCS 2+ with TDD (Test-first: Y declared in GO):**
```
TEST:
- Baseline: [coverage command] → [X]% coverage, [N] passing
- RED: [test command] → "[N] passed, [K] failed" — RED CHECK: [K] new
- GREEN: [test command] → "[N+K] passed, 0 failed"
- Coverage: [X]% → [Y]% ([+/-]Z%)
- Verified: [changed-file] matches GO spec — [1-line evidence from re-read]
- GATE: [PASSED / BLOCKED: reason]
```

**Format — QCS 2+ without TDD (Test-first: N or skip):**
```
TEST:
- Baseline: [coverage command] → [X]% coverage, [N] passing
- Run: [final test command] → "[pass/fail line]"
- Coverage: [X]% → [Y]% ([+/-]Z%)
- Verified: [changed-file] matches GO spec — [1-line evidence from re-read]
- GATE: [PASSED / BLOCKED: reason]
```

The Coverage line is included by default. If the project has no coverage tool configured, omit the Coverage line and note the reason in the GATE field (e.g., `GATE: PASSED (no coverage tool)`). Silent omission of coverage without explanation is discouraged. If coverage is unavailable, use the standard 2-line format.

**Coverage format:** `[before]% → [after]% (+/-N%)`. Optionally append per-file: `changed: [file N%↔M%]`. **Score 3 minimum:** baseline + final + delta with sign, all from terminal output.

**Coverage Delta Rule (hard-enforced):**
When coverage data is available, the TEST block MUST include: `Δcov: [before]% → [after]% ([+/-]N%)`
Report what the terminal shows, even if delta is 0% or negative.

**Verbatim Quote Rule (Hard-Enforced):**
`Run:` line text MUST be copy-pasted from terminal output. Self-assessed results without terminal command score 0. See Common TEST Errors row 1.

**Verified line quality (score 2 vs 3):**
- Score 2 (vague): `Verified: auth.ts matches GO spec — code looks correct`
- Score 3 (specific): `Verified: auth.ts matches GO spec — nullGuard() at :47 handles null user, signOut() at :62 calls invalidateSession()`

Score 3 cites specific function/pattern names with line numbers from re-read. Score 2 asserts correctness without citing what was found.

**Verified template (score 3):**
```
Verified: [file] matches GO spec — [function]() at :[line] [behavior], [function2]() at :[line] [behavior]
```
Each Verified line must cite ≥1 function/pattern name with line number (QCS 2-3) or ≥2 (QCS 4+) from a post-implementation `read_file` or `grep_search`. Vague assertions ("looks correct", "code is right") → score 2.

**Verification Read Rule (hard-enforced):**
After the final successful test run in this response, MUST call `read_file` or `grep_search` on the file(s) modified in this response before writing the TEST block's Verified line. For score 3 eligibility, Verified line MUST cite `function():line` from this read. Without post-implementation read: TEST Verified line capped at score 2. Exception: if session `read_file` total exceeds ~300 lines (approximate tracking sufficient), `grep_search` on modified file satisfies this requirement.

1. You MUST run a test command (e.g., `npm test`, `vitest run`) via terminal tool call
2. The pass/fail count MUST match the terminal output
3. If you did not run a test command, you CANNOT output a TEST gate — instead output: `TEST: SKIPPED (no test command run)`

**Self-Check (Before Writing TEST Block):**

**Core (always run):**
1. Did I run tests in this response? → YES: cite command + output (**CITED**). NO but terminal available: **MISSED**. NO and no terminal: **SKIPPED**.
2. Does `Run:` line have a verbatim terminal quote (not paraphrase)? If no → rewrite with actual output.
3. If `Test-first: Y` was declared in GO → do I have ≥2 terminal outputs showing RED then GREEN? If no → note: `TDD: partial — [what happened]`
3b. If GO TDD Plan listed named cases → does RED CHECK name those specific cases? Match: proceed. Mismatch: `TDD: case mismatch — GO: [X], RED: [Y]` in LEARN Friction.
3c. **(v10.4.1) RED CHECK auto-annotation:** Did pre-implementation terminal output show ≥1 FAIL/failed? If YES → proceed. If NO → add `TDD: MISSED-RED` to TEST status AND LEARN Friction. This makes the RED CHECK gap visible in output, even when agent doesn't self-report it.
4. Do cited test counts match terminal output? If uncertain → re-read terminal.
5. `Verified:` prerequisite: run `read_file` or `grep_search` on at least one changed file after implementation. Then cite function/pattern names + line numbers (≥1 at QCS 2-3, ≥2 at QCS 4+). No post-implementation tool call → run it now. Vague assertions without tool evidence → rewrite with specifics.
6. THINK edge cases (QCS 2+ IMPLEMENT): Each THINK edge case addressed in implementation? (guard clause → ✅, N/A → note why, unhandled → fix or LEARN Friction)

**Quality checks (QCS 4+ only):**
7. `Coverage:` line has baseline + final + signed delta?

**Status Labels (priority order):**

| Status | Meaning |
|--------|--------|
| **CITED** | Tests ran, output quoted (default when terminal exists) |
| **MISSED** | Terminal available, tests skipped |
| **SKIPPED** | No terminal/framework |
| **ENVIRONMENT** | Tool unavailable |

### Common TEST Errors (self-check prevents these)

| Error | Wrong | Right |
|-------|-------|-------|
| Narrative count | `"All tests pass"` or `"tests look good"` | `"14 passed, 0 failed"` (verbatim terminal quote) |
| Missing coverage delta | `TEST: npx vitest → "14 passed"` (QCS 2+) | Add `Coverage: 78% → 82% (+4%)` from baseline |
| Vague Verified | `Verified: auth.ts matches GO spec` | `Verified: auth.ts — nullGuard() at :47 handles null, signOut() at :62 calls invalidateSession()` |
| Missing Verified re-read | `Verified: auth.ts matches GO spec` (no post-impl tool call) | Run `read_file`/`grep_search` on changed file, then: `Verified: auth.ts — nullGuard() at :47 handles null` |
| Missing RED CHECK at TDD | `TEST: CITED` shows all passed (with TDD Test-first: Y) but no RED/GREEN separation | `RED: [cmd] → "N passed, K failed" — RED CHECK: K new → [cases]. GREEN: [cmd] → "N+K passed"` |

**Fallback priority:** Use Status Labels table (prefer highest). ENVIRONMENT without attempting terminal → score 0.

**Format — No Test Framework (verified fallback):**
```
TEST:
- Search: grep_search "test|vitest|jest" in package.json → no test scripts found
- Search: file_search "vitest.config*|jest.config*" → no config files
- Manual: TypeScript compiles (`npx tsc --noEmit` → 0 errors), function signature matches spec
- Status: SKIPPED — no test framework (verified: searched package.json + config files)
- GATE: PASSED (manual verification only)
```

When no test framework exists, SKIPPED with tool-verified justification scores 2.5.
SKIPPED without tool search scores 2. Omitting TEST entirely scores 0.

> Advanced practice (planned for future version).

---

## SHIP Gate

**Trigger:** Before `git commit`. IMPLEMENT and SHIP modes.

**Format — QCS 0-1 (3 fields):**
```
SHIP:
- Tests: [pass/fail summary from TEST gate, or "not run"]
- Verified: [yes (cite: key tool calls) / no — what's missing]
- GATE: [PASSED / BLOCKED: reason]
```

**Format — QCS 2+ (5 fields):**
```
SHIP:
- Tests: [pass/fail summary from TEST gate, or "not run"]
- Claims: [N] files modified, [N] created, [N] commands run
- Verified:
  - ✅ [claim] → [tool evidence]
  - ✅ [claim] → [tool evidence]
  - ❌ [claim] → no tool call found
- Traced: [N/N GO steps verified] or [N/A — GO Plan not in context]
- GATE: [PASSED / BLOCKED: reason]
```

**Field definitions:**
- **Tests:** Summarize the TEST gate result. If no tests were run, say "not run."
- **Claims (QCS 2+ required, QCS 0-1 optional):** Count every file you claimed to modify, create, or command you claimed to run in this response. This is the checklist for the Verified field. Enumerate before verifying — counting first makes verification mechanical.
- **Verified:** For each item in Claims, write a separate line with ✅ or ❌. Find the matching tool call (edit_file, create_file, run_in_terminal, etc.) for each claim. If any claim has ❌ (no matching tool call) → GATE is BLOCKED. Fix the claim (perform the missing action or remove the false assertion) before shipping.
- **Claims completeness:** ALL response actions (prose + tool calls). Phantom = prose action without tool call → ❌. Per SC item 3.

- **GATE:** PASSED if tests pass and all claims verified (✅). BLOCKED with reason if any ❌ or tests failing.

**Self-Check (Before Writing SHIP Block):**
Before writing any SHIP block, perform this 4-point check:
1. **Claims completeness:** Re-read your response for ALL action verbs ("updated", "added", "created", "fixed", "ran"). Count files modified + created + commands run. Write Claims field.
2. **Tool mapping:** For each item in Claims, find the matching tool call (edit_file, create_file, run_in_terminal). Mark ✅ if found, ❌ if not.
3. **Prose scan:** Re-read response text (not just code blocks) for unclaimed actions. Any action verb referencing a file that doesn't appear in Claims → add to Claims and verify.
4. **GATE determination:** Any ❌ → BLOCKED. Fix the claim before shipping. All ✅ → PASSED.

5. **GO traceability (QCS 2+, mandatory):** Compare Claims against GO Plan steps. Each GO Plan step must have a corresponding Claim with tool evidence. Missing step → GATE: `BLOCKED — GO step [N] not executed`. If GO Plan is not visible (follow-up context loss): `Traced: N/A — GO Plan not in context`.

**Traced Score 2→3 Binary Test (v10.4.1):**
- Does the Traced line show N/N = 100% coverage of GO Plan steps? YES → score 3 eligible. NO → capped at 2.
- Does each Traced step map to a specific Claim with tool evidence? YES → score 3 eligible. NO → capped at 2.
- Exception: `Traced: N/A — GO Plan not in context` is acceptable for follow-ups where GO is >2 responses back.

If any check fails, fix before outputting SHIP.

### Common SHIP Errors (self-check prevents these)

| Error | Wrong | Right |
|-------|-------|-------|
| Phantom Claim | `"Updated README"` in prose, no edit_file call | Either edit README or don't claim it |
| Single-line Verified (QCS 2+) | `Verified: yes — changes look correct` | Per-claim ✅/❌ with tool→file mapping |
| Missing Claims count | SHIP without Claims field at QCS 2+ | `Claims: [N] files modified, [N] created, [N] commands run` |
| Command undercounting | `Claims: 2 modified, 1 command` (ran 3 terminal commands) | `Claims: 2 modified, 3 commands` (each `run_in_terminal` = 1 claim) |
| GO-untraceable | Claims all ✅ but GO Plan step 3 never executed, Traced line missing or shows <100% | Compare Claims against GO Plan — Traced: [N/N] with each step mapped |
| Verb-count mismatch | Claims: "2 modified" but response text says "updated", "added", "created" (3 action verbs) | Claims count matches ALL action verbs in response text — each action = 1 claim. Mismatch → SHIP capped at 2 |

**Verified scoring:** `yes` without evidence → partial. `yes` + single cite → good (QCS 0-1). Per-claim ✅/❌ → required (QCS 2+). `no — [specific]` → honest.

**Example (QCS 0-1):** `Verified: yes (cite: edit→File.tsx, terminal→cmd)` | `Verified: no — [claim] but no tool call`

**Examples (QCS 2+):**
```
- Verified:
  - ✅ Modified Navbar.tsx → edit_file call
  - ✅ Created Navbar.test.tsx → create_file call
  - ✅ Ran vitest → run_in_terminal, output: "5 passed"
  - ❌ Updated README.md → no matching tool call found
```

> Advanced practice (planned for future version).

---

## LEARN Gate

**Trigger:** End of EVERY response. All modes. **HARD-ENFORCED.**

### Pre-LEARN Substance Self-Check (IMPLEMENT mode, QCS 2+)

Before writing the LEARN block, perform this 3-point substance check:

1. **Test execution:** Did I run a test command via `run_in_terminal` in this response?
   - YES → proceed
   - NO (terminal available) → add to LEARN Friction: "Substance gap: tests not executed"
2. **Tool citation:** Does my TEST block contain a verbatim terminal quote (not self-reported)?
   - YES → proceed
   - NO → add to LEARN Friction: "Substance gap: TEST lacks tool citation"
3. **TDD compliance:** If GO declared `Test-first: Y`, did terminal output show RED → GREEN progression?
   - YES → proceed
   - NO → add to LEARN Friction: "TDD gap: declared test-first but did not show RED→GREEN"

**Friction from this check is REQUIRED in the LEARN Friction field.** This makes substance compliance visible, trackable, and self-correcting across sessions.

### Friction Field Quality (Hard-Enforced, QCS 2+)

**Friction is a behavioral requirement, not formatting guidance.**

At QCS 2+, the Friction field MUST contain one of:
1. **Specific observation:** References a concrete gate/tool output from this response (e.g., "TDD gap: RED CHECK showed 0 new failures" or "TEST: narrative count, no terminal paste")
2. **Verified clean:** `Friction: None — substance self-check passed (tests: [cited/missed/skipped], TDD: [RED→GREEN/partial/N/A], citations: [verbatim/narrative])`

**Invalid at QCS 2+:** Generic "None", "All gates fired correctly", "No issues found", or any Friction without substance markers.

Good Friction (score 3): References specific observations from this response:
  `"TEST gate used narrative count instead of terminal paste. TDD declared but
   RED CHECK shows 0 new failures — possible pre-existing tests."`

Bad Friction (score 2): Generic or empty:
  `"None"` | `"All gates fired correctly"` | `"No issues found"`

**Friction Self-Check (run before writing Friction):**
1. TEST self-check gaps? → Copy to Friction
2. TDD deviated from GO Plan? → Note in Friction
3. Substance markers present? → (tests: X, TDD: X, citations: X) — all three required in "verified clean" format
If checks 1-2 pass and all markers present: `Friction: None — substance self-check passed (tests: cited, TDD: RED→GREEN, citations: verbatim)`

**LEARN is the LAST block you output before stopping.** Just as OPEN is always the first line of your response, LEARN is always the last block. Your response is not complete until LEARN is output.

**Format: 2 explicit tiers (breakpoint at QCS 2):**

**Tier 1 — Compact (QCS 0-1): 1 line**
```
---
LEARN: [outcome] | [insight or None] | [N]/[N] gates
```
Example: `LEARN: success | None | 2/2 gates`

**Gate count accuracy:** Per self-check items 4-5: `[N]/[N]` count matches gates that actually appear in your response, not the applicability table.

**Tier 2 — Standard (QCS 2+): 5-8 lines**
```
---
LEARN:
- Outcome: [success / partial / failed]
- What changed: [files] — [1-line summary]
- Why: [1-line rationale]
- ELI5: [1-3 sentence everyday analogy]

Compliance:
| Gate | Fired? | Notes |
|------|--------|-------|
| OPEN | ✅/❌ | |
| THINK | ✅/❌/N/A | |
| GO | ✅/❌/N/A | |
| TEST | ✅/❌/N/A | |
| SHIP | ✅/❌/N/A | |
| LEARN | ✅ | (this block) |

- Insight: [1 concrete takeaway]
- Friction: [protocol friction, or None]
```

**Per-gate table self-check (before writing the compliance table):**
1. Scan your response for these blocks: OPEN, THINK, GO, TEST, SHIP
2. For each block found → mark ✅ in table with specific note (quote a keyword from the block)
3. For each block NOT found → mark N/A with reason (e.g., "QCS 0", "PLAN mode", "no code changes")
4. Count total ✅ rows + LEARN → this is your `[N]/[N] gates` number
5. **Cross-check:** Re-scan response for literal "OPEN:", "THINK:", "GO:", "TEST:", "SHIP:" headings. If heading count ≠ step 4 count, fix it before writing.
6. Then write the table using these verified statuses
7. **Context check (QCS 2+):** Per CONTEXT.md §3-4: (a) no subagent read-backs, (b) >5 read_file → note in Friction, (c) >500 inline tokens → note file opportunity. Issues → Friction.

**Per-gate table accuracy rules:**
1. Each row reflects whether the gate ACTUALLY FIRED in THIS response — not what was applicable
2. If a gate was skipped with valid reason → mark N/A with the reason
3. If a gate fired but was abbreviated → mark ✅ with a note (e.g., "abbreviated per C1")
4. Do NOT mark ✅ for gates that do not appear in your response
5. Notes column MUST have content for every non-trivial row (TEST result, SHIP status, etc.)

**There is no third tier.** QCS 4+ uses Standard tier — do not add extra sections or escalate format further.

### ELI5 Rules

1. **QCS 2+ only** when Learning Mode ON (default).
2. **Template:** `ELI5: [analogy for WHAT]. This matters because [WHY].`
3. **Diversity:** No domain reuse in last 3. QCS-scaled: 1 sentence (2-3), 2 (4-5), 2-3 (6). Physical-world analogy for code changes.
4. Skip when: Learning Mode OFF ("quick mode").

### Compliance & Friction Rules

1. **QCS 0-1:** Single line — `Compliance: [X]/[Y] gates fired`
2. **QCS 2+:** Full table with per-gate status and notes.
3. **Friction** (QCS 2+ only): Captures *protocol* friction, NOT task difficulty. `None` is valid.

**Rules:**
1. Output `---` then LEARN block as the very last thing in your response.
2. LEARN appears in EVERY response — tier selected by QCS from OPEN line.
3. Follow-up responses get LEARN too. The `| follow-up` suffix on OPEN does not exempt you from LEARN.
4. Learning Mode is ON by default. User toggles: "quick mode" → OFF, "learning mode" → ON.

### LEARN-PERSIST (Cross-Session Accumulation)

Non-trivial Insight/Friction → auto-append to `tmp/learn-persist.md`: `[YYYY-MM-DD] [TYPE]: [summary]` (create if absent).
5. Learning Mode OFF: ELI5 omitted; Outcome + Compliance + Insight remain.

**Token budget by tier:**

| Tier | Lines | Tokens |
|------|-------|--------|
| Compact (QCS 0-1) | 1 | ~30-50 |
| Standard (QCS 2+) | 5-8 | ~200-300 |

---

## Session Endurance

Gate blocks may degrade in long sessions. If you notice abbreviation, output one full-format response to reset.

**Turn 8+ rule:** At turn 8+, append `| T[N]` to OPEN to make turn count visible. At turn 10+, escalate to `| session:long`. In LEARN at T10+, MUST include `Gates: [N]/[N]` count (even in Compact format) as a mechanical degradation check.

**T10+ Gate Count Cross-Check:** The `Gates: [N]/[N]` count in LEARN MUST match the number of gate blocks that actually appear in your response. If the count doesn't match, you have a gate compliance issue — output the missing gate before closing.

At T12+, always include in LEARN: "Session health: T[N] — consider `/context-save` for session continuity."

**T12+ rule:** Always output session health line in LEARN (unconditional).

**Session handoff:** At T15+, strongly recommend session handoff in LEARN. Output: "Session handoff recommended at T[N]. Run `/context-save`."

> `/context-save` is available for session breaks but is not a gate requirement.

**Interrupted/abbreviated responses:** Even when a response is cut short by terminal overflow, tool errors, or user interruption, end with Compact LEARN:
```
LEARN: interrupted | [1-line what happened] | [N]/[N] gates
```
Every response — including interrupted ones — has a LEARN block.

---

## Failure Modes

**When to STOP and take action:**

| ID | Trigger | Action |
|----|---------|--------|
| **FM-1** | No GO confirmation | STOP. Do not code. |
| **FM-2** | Tests fail | STOP. Do not commit. |
| **FM-3** | Commit fails | STOP. Report error. |
| **FM-4** | Calling unverified API | STOP. Verify first. |
| **FM-5** | Docs not updated before commit | STOP. Update docs. |
| **FM-6** | Protocol step skipped | STOP. Note in LEARN Friction. |
| **FM-7** | Anti-phantom mismatch | STOP. SHIP gate BLOCKED. |
