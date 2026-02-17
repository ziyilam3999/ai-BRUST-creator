# Phase 5 Execution Plan — CE 80% Push

**Version:** v3 (Final — post Critique 1 + Critique 2)
**Created:** 2026-02-17
**Target:** CE ≥80.0%, Gate ≥82.5%, Substance ≥74.5%
**Baseline:** v10.5.0 — CE 79.04%, Gate 82.25%, Substance 73.95%
**Protocol version target:** v10.6.0

---

## Pipeline

This plan was produced via the multi-round critique pipeline:

| Step | Status | Key Findings |
|------|--------|-------------|
| Research | ✅ Done | 427-line report; CE gap 0.96pp; Checkpoint Discipline weakest (~2.2/3); VQ weakest substance (~2.35/3) |
| Draft v1 | ✅ Done | 7 steps; VQ-1 + CP-1 + CP-2 + CTX-1 + VQ-2 + SHIP-1 + simulation |
| Critique 1 | ✅ Done | 3 BLOCKING (CP-1 subjective trigger, ungrounded CE estimates, CTX-1 token cost), 5 MEDIUM |
| Correct → v2 | ✅ Done | Replaced CP-1 trigger with turn-count; added Step 0; reduced CTX-1 to ~30 lines; dropped CP-2 |
| Critique 2 | ✅ Done | 1 BLOCKING (CP-1 in wrong file — CONTEXT.md QCS 4+ only), 5 MEDIUM |
| Correct → v3 | ✅ Done | Moved CP-1 to MODES.md; VQ-1 obligation not ordering; fixed all vocabulary |

---

## Token Budget

| Step | Tokens | Target File |
|------|--------|-------------|
| VQ-1 | ~80 | GATES.md |
| CP-1 | ~80 | MODES.md |
| CTX-1 | ~240 | MODES.md |
| SHIP-1 | ~40 | GATES.md |
| **Total** | **~440** | |

Budget available: ~1,700-1,950 tokens. Headroom: ~1,260-1,510.

---

## Steps

### Step 0: Validate Assumptions (PREREQUISITE)
- [ ] Score CE dimensions (Subagent Discipline, Checkpoint Discipline, Tool Selection) on SIM-45, SIM-46, SIM-47
- [ ] Score VQ on 3 IMPLEMENT scenarios — determine failure mode
- [ ] Decision gate: confirm priority ordering before proceeding

### Step 1: VQ-1 — Verification Read Rule
- [ ] File: `.github/rules/GATES.md`, insert after "Each Verified line must cite..." paragraph (~L547)
- [ ] Content: Verification Read Rule (hard-enforced) — obligation pattern, not ordering
- [ ] ~80 tokens

**Exact content:**
```markdown
**Verification Read Rule (hard-enforced):**
After the final successful test run in this response, MUST call `read_file` or `grep_search` on the file(s) modified in this response before writing the TEST block's Verified line. For score 3 eligibility, Verified line MUST cite `function():line` from this read. Without post-implementation read: TEST Verified line capped at score 2. Exception: if session `read_file` total exceeds ~300 lines (approximate tracking sufficient), `grep_search` on modified file satisfies this requirement.
```

### Step 2: CP-1 — Checkpoint Discipline Rule
- [ ] File: `.github/rules/MODES.md`, insert after Verify-Cite Rule (~L157), before Pre-Implementation Checklist
- [ ] Content: Checkpoint Discipline Rule (hard-enforced, IMPLEMENT mode)
- [ ] ~80 tokens

**Exact content:**
```markdown
**Checkpoint Discipline Rule (hard-enforced, IMPLEMENT mode):**
At session turn T4+: if task has ≥2 remaining steps AND no checkpoint file (`tmp/checkpoint-*.md`) written in this session → write checkpoint BEFORE next implementation action. Violation: CE Checkpoint Discipline capped at 2.
```

### Step 3: CTX-1 — Tool Selection Quick Reference
- [ ] File: `.github/rules/MODES.md`, insert after Pre-Implementation Checklist (~L164), before `/fix` Specifics
- [ ] Content: Tool Selection Quick Reference table + decision rule + escalation
- [ ] ~240 tokens

**Exact content:**
```markdown
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
```

### Step 4: SHIP-1 — Claims Precision Common Error
- [ ] File: `.github/rules/GATES.md`, insert as last row in Common SHIP Errors table (~L663)
- [ ] Content: Verb-count mismatch row
- [ ] ~40 tokens

**Exact content:**
```markdown
| Verb-count mismatch | Claims: "2 modified" but response text says "updated", "added", "created" (3 action verbs) | Claims count matches ALL action verbs in response text — each action = 1 claim. Mismatch → SHIP capped at 2 |
```

### Step 5: Simulation & Validation
- [ ] 10-scenario targeted simulation
- [ ] Decision gates: CE ≥80.0%, Gate ≥82.25%, Substance ≥74.5%
- [ ] Rollback criteria defined

### Step 6: Tracking & Ship
- [ ] Update progress.md, PROTOCOL_CHANGELOG.md, long-term plan
- [ ] Run sync: `node tools/sync/index.mjs`
- [ ] Commit as v10.6.0

---

## Rollback Criteria

- Gate regression >0.5pp → investigate/revert
- Substance regression >0.3pp → investigate/revert
- CE regression → revert CTX-1 first (highest token cost), then CP-1
- Any metric below v10.4.1 baseline → full revert to v10.5.0

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| VQ-1 as obligation, not ordering | Critique 2 M-1: "FIRST tool call" blocks legitimate intermediate calls |
| CP-1 in MODES.md, not CONTEXT.md | Critique 2 B-1: CONTEXT.md is QCS 4+ only; MODES.md loaded at QCS 2+ |
| CTX-1 compact with back-reference | Avoids duplication at QCS 4+ while covering 42% QCS 2-3 gap |
| Dropped CP-2 | Critique 1 M5: redundant with CP-1's invariant+cap |
| Step 0 prerequisite | Both critiques: ungrounded CE estimates risk targeting wrong bottleneck |
