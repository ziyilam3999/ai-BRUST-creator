# Protocol Changelog
<!-- Version: 1.7.0 -->

> **Purpose:** Track version history of `copilot-instructions.md`
> **Location:** `.github/copilot-instructions.md`
> **Archive:** For versions prior to v7.2.0, see [docs/changelog-archive.md](../../docs/changelog-archive.md)

---

## [v10.13.0] - 2026-02-20

### LP Bootstrap + Plan-File Rule

**Driver:** [2026-02-19] PROCESS entries in learn-persist.md — plan-file-first pattern effectiveness. Changes derived via full 2-round critique pipeline with blocker resolution (B1: PROTOCOL_LITE.md unreachable at QCS 0-1; B2: rubric contradiction when score 3 not updated atomically).

#### GATES.md (8.3.0 → 8.4.0)
- OPEN self-check: 4-point → 5-point check; item 5 = LP Bootstrap (load learn-persist.md Turn 1, append `| LP:[N]` suffix)
- Common OPEN Errors: add "LP suffix missing" row
- GO gate format: 3-6 lines → 3-7 lines; add `Plan File:` field after `Files:` field
- GO self-check: 5-point → 6-point check; item 6 = Plan File at QCS 3+ multi-phase (hard-enforced; `N/A — QCS<3` if not applicable)

#### PROTOCOL_LITE.md
- Add LP Bootstrap trigger after OPEN gate `Follow-up:` line
- Fixes B1: QCS 0-1 sessions (SIM-50) load PROTOCOL_LITE.md only — GATES.md item 5 was architecturally unreachable without this patch

#### SIMULATION_PLAN.md §6.3 (6.2.0 → 6.3.0)
- Score 1 row: add "OR at QCS 3+ multi-phase Plan File field absent" clause
- Score 3 row: add Plan File requirement (`tmp/<task-slug>-plan.md` at QCS 3+, or `N/A — QCS<3` stated explicitly)
- Both rows updated atomically — fixes B2 rubric contradiction (score 1 and score 3 must be consistent)

#### MODES.md (7.11.0 → 7.12.0)
- Generic IMPLEMENT Workflow table: add step 2b "Write plan file" (QCS 3+ multi-phase only)
- Add Plan-File Rule section after Checkpoint Discipline Rule (hard-enforced cross-reference to GATES.md §GO Gate)

#### EXAMPLES.md
- Add Example T: QCS 3 multi-phase showing plan-file creation before GO block with `Plan File:` field; score 3 vs score 1 contrast

**Projected gain:** +0.15pp gate (83.18% → ~83.33%); CE Δ ~−0.06pp net.

---

## [v10.12.0] - 2026-02-19

### Propagate Multi-Round Critique & Harden Protocol Rules

**Driver:** [2026-02-18] PROCESS entries in learn-persist.md — TDD violations and multi-round critique effectiveness. Changes derived via 2-round independent critique pipeline (R1: strategic, R2: tactical) which itself validated the approach.

#### MODES.md — PLAN Step 5: Structured self-critique checklist
- Replaced prose "Self-critique: deflate estimates, check ROI" with 3-item enforcement checklist
- New meta-item: *physically enforceable* check — catches unenforced mechanisms before plan is presented
- Scope: PLAN mode Step 5 only (not THINK gate — avoids contaminating IMPLEMENT-mode THINK)

#### MODES.md — TDD Sequencing Rule: TP-1 cross-reference
- Extended existing GATES.md link to also cite First-Command Rule (TP-1) with mechanical consequence
- Closes discoverability gap that caused [2026-02-18] TDD violations

#### improve-protocol.md — Step 3A: Machine-readable Phase Verdict Table
- Added required `Phase | Verdict | Rationale` table at end of `critique-round2.md` output spec
- Step 3B now reads this table only — not prose — making 3A→3B handoff deterministic and `/simulate`-verifiable
- Prevents 3B from hallucinating verdicts when 3A produces narrative critique

#### improve-protocol.md — Step 1: PROCESS entries triage subagent
- Added dispatched subagent to sweep `tmp/learn-persist.md` at start of every `/improve-protocol` run
- Surfaces un-propagated PROCESS entries as plan candidates
- Propagation-status convention: `[propagated → {file} §{section}]` prevents re-triaging actioned entries

#### improve-protocol.md — Step 6: Finalization Checklist
- Added explicit 4-item checklist (version bump, changelog, propagation markers, sync) before numbered steps
- Prevents finalization tasks being forgotten — previously relied on memory; now enforced as a visible gate
- Checklist scoped to `/improve-protocol` Step 6 only (not SHIP gate — items are command-specific, not general)

---

## [v10.11.0 — ROADMAP CLOSED] - 2026-02-18

### Roadmap Closure — Protocol Evolution Complete

**Final scores (sim-141):** Gate 82.94% | Substance 75.36% | CE 80.00% | Spread 0.08pp
**Total sessions:** ~33 (v7.4 → v10.11.0)
**Decision:** D-015 — accept as official final scores, enter maintenance mode

#### Closure Items Implemented

##### SESSION.md — Learn-Persist Bootstrap (A2)
- Added "Learn-Persist Bootstrap" section before Resume Protocol
- On session start, auto-loads 5 most recent learn-persist entries from last 7 days
- `LP:[N]` suffix appended to OPEN line when entries loaded
- Silent fallback: if file missing, empty, or <5 entries → skip without error

##### SIMULATION_PLAN.md — SIM-50: Cross-Session Recovery (A3)
- Added SIM-50 scenario to Category 3 (Gate-Specific Deep Tests)
- 2-session simulation: Session A populates learn-persist, Session B tests bootstrap + /learn-review
- Scoring rubric: 0-3 scale for cross-session recovery pipeline
- Scenario count: 49 → 50. Version: 6.2.0 → 6.3.0

##### .claude/commands/learn-review.md — /learn-review Command (A1)
- New command: reads tmp/learn-persist.md, groups entries by category (INSIGHT, FRICTION, BUG, VIOLATION, OPTIMIZATION, GAP)
- 8-step workflow: parse → filter → group → detect patterns → report → propose refinements → apply (if requested)
- Supports timeframe and category filters
- Completes Phase 3 cross-session intelligence loop (LEARN-PERSIST → bootstrap → /learn-review)

##### MCP gate_check Spike (B1)
- Spike report: `tmp/mcp-gate-check-spike.md`
- Verdict: **Partially viable** — 22/34 self-check items (65%) mechanically parseable via regex. 12/34 (35%) require semantic judgment
- 3 viability criteria: parse ≥3 items ✅, validate sample ⚠️ partial, <5s ✅
- Recommendation: defer to maintenance. Revisit if /simulate scoring becomes a bottleneck

#### Item Disposition (17 items — complete accounting)
- **3 implemented:** /learn-review (A1), session bootstrap (A2), SIM-50 (A3)
- **1 spike:** MCP gate_check (B1) — partially viable, deferred
- **1 maintenance rule:** GATES.md 950-line dedup trigger (C1)
- **6 spun off:** Phase 5A/5B/5D, P25, model-tier config, cross-family validation → progress.md
- **6 dropped:** P17 (XML markers), cost tracking, escalation protocol, Opus v8.4 control, Phase 3C (QCS), Phase 4C (YAML)

#### Closure Validation — sim-142 (2026-02-18)
- **8-scenario single-run subset** (SIM-01, -03, -05, -07, -09, -11, -18, -46)
- **Exit criteria: 8/8 PASS** — zero regression confirmed
- QCS 0-1 invariants (6 scenarios): 99.4% — SESSION.md bootstrap confirmed NOT leaking into Protocol Lite
- A2 CE delta: −0.01pp (predicted −0.01 to −0.02pp) — well above 79.95% floor
- Official roadmap scores confirmed unregressed: Gate 82.94% / Sub 75.36% / CE 80.00%
- **Sonnet 4.6 established as ongoing monitoring model baseline** (replaces Opus 4.6)
- Report: `tmp/sim-report/sim-report-142-v10.11.0-closure-consolidated.md`

#### Maintenance Mode
- No new metric-targeting phases
- Regression monitoring: ad-hoc (>0.10pp → targeted fix)
- GATES.md dedup: 950-line threshold (currently ~875)
- 6-month adoption review: advisory, 12-scenario subset simulation

---

## [v10.11.0] - 2026-02-18

### Changed — Phase 10: Final Metric Phase (Gate 83% Step 2)

**Strategic context:** v10.10.0 achieved 82.82% gate, 75.30% substance, 80.02% CE. Phase 10 is the **final metric-targeting phase** before roadmap closure. 3 changes target Gate ≥82.90% (floor) / ≥83.00% (stretch), Substance ≥75.30%, CE ≥79.95%. Strict 3-change scope constraint enforced for measurement precision.

#### EXAMPLES.md — P10-G1: Example R (TEST Score 2 vs Score 3 — TDD Evidence Quality)
- Added Example R after Example S: demonstrates TEST score discrimination focused on TDD evidence quality
- Score 3 requires verbatim terminal evidence: RED CHECK with assertion failure messages, GREEN CHECK with pass count, coverage delta (Δ+Npp with before/after numbers), Verified with function:line citations
- Score 2 shows plausible narrative ("tests failed, then passed") without terminal output — caps at score 2
- Teaching point: "describing TDD" vs "evidencing TDD" is the score 2→3 boundary
- TEST has 2nd-largest gate gap (0.480/3) — largest untargeted gate; proven Example pattern from P9-G1
- Impact: Gate +0.04-0.08pp (High confidence)

#### GATES.md — P10-G2: GO Self-Check 5 (Advisory Numbered Steps) + SHIP Common Error 8
- GO Self-Check expanded from 4 to 5 items: SC5 "Are Plan implementation steps explicitly numbered?" (advisory, not blocking)
- Numbered GO steps create a reference list that SHIP Traced can mechanically confirm — shifts cognitive cost from SHIP-time recall to GO-time planning
- SHIP Common Error row 8 added: "Unnumbered GO plan → recall failure → Traced undercounts" with cross-reference to GO SC5
- Root cause fix for 35% SHIP non-adoption identified in Phase 9: cognitive load at abbreviation time
- Impact: Gate +0.03-0.06pp (Medium confidence)

#### MODES.md + GATES.md — P10-S1: S7-V VERIFY Investigation Completeness
- VERIFY workflow step 7 strengthened: "Investigation coverage: N/M where N = items investigated, M = items from Investigation Plan. Score 3 requires N ≥ M-1"
- TEST Self-Check 9 added (VERIFY-specific, advisory): "If VERIFY mode: does LEARN include Investigation coverage: N/M field?"
- Extends Phase 9's S7-V Investigation Plan with completion scoring mechanism (same pattern as S7 Traced N/N for IMPLEMENT)
- Impact: Substance +0.04-0.08pp (Medium-High confidence)

#### Token Budget
- EXAMPLES.md: +42 lines (1010 → 1052)
- GATES.md: +4 lines net (871 → 875, safe at 75 lines headroom to 950 trigger)
- MODES.md: -1 line net (317 → 316, row expansion consolidated)
- QCS 0-1 impact: None (all changes in QCS 2+ tier files)

---

## [v10.10.0] - 2026-02-18

### Changed — Phase 9: Gate 83% Step 1 + Substance Momentum

**Strategic context:** v10.9.0 achieved 82.66% gate, 75.25% substance, 80.00% CE. Phase 9 targets Gate ≥82.85% (stretch) / ≥82.66% (floor) and Substance ≥75.35% (stretch) / ≥75.25% (floor) through 5 changes across EXAMPLES.md, GATES.md, MODES.md, CONTEXT.md. Multi-round critique pipeline applied; sim ran dual-run (R1 optimistic + R2 conservative) → consolidated.

#### EXAMPLES.md — P9-G1: Example S (SHIP Traced Heterogeneous Plan)
- Added Example S after Example Q: demonstrates SHIP Traced 5/5 vs 3/5 discrimination
- GO plan: schema migration + API endpoint + validation layer + integration test + documentation update (heterogeneous 5-step)
- SHIP Traced must reference all 5 steps by partial match — missing 2 → score capped at 2
- First SHIP example in EXAMPLES.md; fills critical format-teaching gap
- Impact: SHIP +0.03-0.06pp gate (primary driver for SIM-17)

#### GATES.md — P9-G1: SHIP Common Error (Traced Count Mismatch)
- Added CE row 7: "Traced count mismatches GO step count → score capped at 2"
- Compressed prior rows 4-6 to maintain 870-line net-zero budget
- Impact: compound with Example S — behavioral reinforcement

#### EXAMPLES.md — P9-G2a: Example N Scenario 5 (QCS 2 vs 3 Boundary)
- Added Scenario 5 to Example N: "update 3 config files to use new env var naming" → mechanical multi-file = QCS 2, not QCS 3
- Multi-file alone does not trigger QCS 3; requires uncertainty/risk/cross-domain indicator
- Impact: OPEN +0.02-0.04pp gate (QCS disambiguation)

#### GATES.md — P9-G2b: LEARN-1 Friction Quality Cap
- Added sentence to LEARN-1 Field Presence Rule: "Friction value of `None`, `N/A`, or single-word generic at QCS 2+ → LEARN capped at score 2"
- Compressed "Bad Friction" example from 2 lines to 1 line (net-zero budget)
- Binary enforcement: specific substance markers OR score 2 — no ambiguity
- Impact: LEARN +0.04-0.08pp gate (highest-performing Phase 9 change at +0.06pp consolidated, 80% adoption)

#### MODES.md — P9-S1: S7-V VERIFY Investigation Plan
- Expanded VERIFY workflow from 6 to 7 steps
- Step 3 (new): "Investigation Plan: State numbered list of areas to check"
- Step 7 LEARN: "include Investigation coverage: N/M plan items addressed"
- Impact: Substance +0.03-0.07pp (primary), Gate +0.01-0.02pp (secondary), CE −0.01pp (minor overhead)
- VERIFY substance baseline established: 76.1% (SIM-06)

#### CONTEXT.md — P9-C1: S2 Enforcement Common Error
- Added Common Error table at end of §2 anti-patterns: "Skipped headers-first scan for unfamiliar file — read entire file instead → read first 15 lines to confirm relevance before full read (~100 tok vs ~500 tok)"
- S2 adoption: 52% → 60% (+8pp)
- Impact: CE +0.02-0.04pp

**Metrics (sim-135 consolidated):** Gate 82.82% (+0.16pp) | Substance 75.30% (+0.05pp) | CE 80.02% (+0.02pp)
**R1/R2 spread:** 0.09pp gate (tightest since Phase 5)
**Decision:** All 3 floor targets PASS. Stretch targets missed by ≤0.05pp. Deployed.
**Token budget:** GATES.md net-zero (870 lines). EXAMPLES.md +73 lines (936→1009). MODES.md +2 lines. CONTEXT.md +3 lines.

---

## [v10.7.0] - 2026-02-17

### Changed — Phase 6: Gate Push (OPEN + LEARN + CE + THINK)

**Strategic context:** v10.6.0 achieved 82.31% gate, 75.12% substance, 79.14% CE. Phase 6 targets Gate ≥82.40% (floor) by addressing the weakest gates (OPEN ~2.540, LEARN ~2.580) and adding CE deduplication. Multi-round critique pipeline: 2 rounds, 6 BLOCKING + 9 MEDIUM issues found and resolved.

#### GATES.md — OPEN-1: Suffix Enforcement (P0)
- Added mechanical follow-up detection rule after OPEN Self-Check item 4
- Detection: scan conversation for prior OPEN line. Present → `follow-up`. Absent → no suffix
- Hard rule: no `follow-up` + `SHIFT` combination. Cap: 2 suffixes max per OPEN line
- Impact: OPEN +0.02-0.05 raw → +0.01-0.03pp gate

#### GATES.md — LEARN-1: Field Presence Rule (P0)
- Added hard-enforced rule: Tier 2 LEARN must contain `Outcome`, `What changed`, `Insight`
- Missing any of the 3 required fields → LEARN capped at score 2
- ELI5 additionally required when Learning Mode ON (default). Omitted only in "quick mode"
- Impact: LEARN +0.02-0.04 raw → +0.01-0.02pp gate

#### GATES.md — CE-1: THINK Deduplication T6+ (P1)
- Added forward-looking deduplication rule in Session Endurance section
- From turn 6+, THINK Evidence must not re-derive findings from prior turns
- Must reference prior turn instead: `Evidence: [per T3 analysis] — [file]:[line] confirmed [finding]`
- Re-derivation → THINK capped at score 2. New file/line tool calls always permitted
- Impact: CD +0.05-0.10 raw → CE +0.02-0.04pp

#### GATES.md — THINK-1: Evidence Citation Score 3 Threshold (P1)
- Extended Evidence precision rule 3: added score 3 eligibility requirement
- At QCS 4+: ≥2 citations from distinct tool calls required for THINK score 3
- Fewer than 2 distinct-file citations → THINK capped at score 2
- Impact: THINK +0.01-0.02 raw → +0.005-0.01pp gate

**Metrics (projected):** Gate 82.34-82.39% | Substance 75.12% | CE 79.16-79.18%
**Token budget:** +220 tokens (1,290 remaining of 1,950)
**Validation:** npm test 495/495 passed

---

## [v10.6.0] - 2026-02-17

### Changed — Phase 5: CE 80% Push (Behavioral Invariants)

**Strategic context:** v10.5.0 achieved 82.25% gate, 73.95% substance, 79.04% CE. Phase 5 targets Substance ≥74.5% through VQ behavioral invariant (TP-1 pattern), and CE improvement through Checkpoint Discipline + Tool Selection. Multi-round critique pipeline: 2 rounds, 4 BLOCKING + 10 MEDIUM issues found and resolved before implementation.

#### GATES.md — VQ-1: Verification Read Rule (P0)
- Added hard-enforced rule: after final successful test run, MUST call read_file/grep_search on modified files before writing Verified line
- Score 3 eligibility requires function():line citation from post-implementation read
- Without post-implementation read: TEST Verified line capped at score 2
- Exception: if session read_file >300 lines, grep_search satisfies requirement
- Impact: VQ 1.98 → ~2.33 (+0.35)

#### MODES.md — CP-1: Checkpoint Discipline Rule (P1)
- Added hard-enforced rule (IMPLEMENT mode): at session turn T4+, if ≥2 remaining steps AND no checkpoint file written → write checkpoint BEFORE next implementation action
- Violation: CE Checkpoint Discipline capped at 2
- Placed in MODES.md (not CONTEXT.md) for QCS 2+ availability — Critique 2 B-1 fix

#### MODES.md — CTX-1: Tool Selection Quick Reference (P1)
- Added 4-row tool selection table to IMPLEMENT section (loaded at QCS 2-3)
- Content: read_file/grep_search/semantic_search/subagent with cost estimates
- Decision rule + escalation trigger for >300 lines
- Back-reference to CONTEXT.md §2 for QCS 4+ deduplication
- 42% of scenarios (QCS 2-3) now get tool selection guidance

#### GATES.md — SHIP-1: Claims Precision Common Error (P2)
- Added verb-count mismatch row to Common SHIP Errors table
- Mismatch between Claims count and action verbs in response text → SHIP capped at 2

#### Simulation Results (sim-121)
- Gate: 82.31% (+0.06pp from v10.5.0)
- Substance: 75.12% (+1.17pp) — VQ-1 headline improvement
- CE: 79.14% (+0.10pp)
- All metrics improved, no regressions, Substance target achieved

---

## [v10.5.0] - 2026-02-17

### Changed — Phase 4B: Conditional Tech Stack Loading + Context Optimization

**Strategic context:** v10.4.1 achieved 82.25% gate, 73.95% substance, 78.64% CE. Phase 4B targets CE improvement through context optimization — reducing QCS 4+ token load by 25% via conditional loading and lazy-load annotations. Two critique rounds (Research → Draft → Critique 1 → Fix → Critique 2 → Fix → Final) prevented 3 issues before implementation.

#### copilot-instructions.md — PROTOCOL_CHANGELOG.md → Lazy-Load (P0)
- Changed Reference Index annotation from unconditional to lazy-load
- Only loaded when `/improve-protocol` invoked or user asks about version history
- Impact: 1,080 lines (~6,500 tokens, 22% of QCS 4+ load) removed from always-loaded

#### copilot-instructions.md — QCS 4+ Loading Instruction Fix (P0)
- Changed: "All rules files per Reference Index" → "All rules files per Reference Index (respecting conditional and lazy-load annotations)"
- Added explicit QCS 4+ instruction: load all files EXCEPT lazy-load + conditional (unless condition met)
- Structural fix: prevents "All" from overriding per-entry annotations

#### copilot-instructions.md — Step 3a: Project Type Detection (P1)
- Added Step 3a: detect project type at QCS 2+ per PROJECT_DETECTION.md
- Load matching COMMANDS.[type].md; do NOT load other project types

#### copilot-instructions.md — Reference Index Updated (P1)
- Added conditional entries: COMMANDS.node.md, COMMANDS.python.md, STYLES.react.md
- Updated STYLES.md label to "Coding Styles (Universal)"
- Updated Flutter annotation to match conditional pattern

#### PROJECT_DETECTION.md v2.0.0 — Python Detection + Exclusion Column (P1)
- Added Python detection row (pyproject.toml/setup.py/requirements.txt)
- Added "Do NOT Load" exclusion column to detection table
- Added Python to project-specific behaviors table

#### STYLES.md v2.0.0 — Physical Split (P1)
- Trimmed STYLES.md to universal conventions only (~35 lines)
- Created STYLES.react.md (v1.0.0) with TS/React/Next.js conventions (~53 lines, conditional)
- Physical split required — agents cannot load partial files (Critique 2 finding)

#### COMMANDS.md v3.1.0 — Header Links Removed (P2)
- Removed header links to COMMANDS.flutter.md and COMMANDS.node.md
- Replaced with "Project-specific commands loaded automatically per PROJECT_DETECTION.md"
- Prevents reference leakage that defeats conditional loading

#### Legacy File Housekeeping (P3)
- Archived 11 legacy files to .github/rules/archive/: CHECKLISTS.md, DOCS_MAP.md, FAST_PATH.md, GATES_ADVANCED.md, LEARNINGS.md, MCR.md, PROTOCOL_CHANGELOG_ARCHIVE.md, PROTOCOL_EVOLUTION.md, QUICKSTART.md, RECOVERY.md, SCENARIOS.md
- Fixed inbound references: ARCHITECTURE.md (removed GATES_ADVANCED.md, updated LEARNINGS.md → LEARN-PERSIST), COMMANDS.md (/learn link updated)
- Active rules files reduced from 31 → 20

#### Simulation Results
- sim-119 (projection): Gate 82.25% (maintained), Substance 73.95% (maintained), CE 79.04% (+0.40pp)
- sim-120 (consolidated): All decision gates passed. First protocol version above CE 79%.
- Method: Conservative projection (zero rubric changes → gate/substance deductive, CE from token math)

---

## [v10.4.1] - 2026-02-17

### Changed — Post-4A Consolidation (TDD + SHIP Targeted Fixes)

**Strategic context:** v10.4.0 (Protocol Lite) achieved 82.10% gate, 71.50% substance, 78.64% CE. Session 1 root-cause analysis identified TDD modal score 2.0 as primary substance bottleneck — agents called `edit_file` before running baseline tests, violating Test-first intent without violating the letter of the First-Command Rule. Session 6 delivered three targeted fixes. Simulation (sim-117 subset + sim-118 projection) validated +2.45pp substance — 2nd-largest single-version gain in protocol history.

#### GATES.md — TP-1: First-Command Rule Strengthened (P0)
- Changed: "FIRST `run_in_terminal` call after GO" → "FIRST **tool call** after GO must be `run_in_terminal`"
- Closes loophole: agents can no longer call `edit_file` before any testing
- TEST gate capped at score 2 on violation + LEARN Friction note required
- Impact: +2.45pp substance (TDD modal 2.0 → 3.0)

#### GATES.md — TP-2: RED CHECK Auto-Annotation (P1)
- Added TEST self-check item 3c: `TDD: MISSED-RED` auto-annotation
- Fires when pre-implementation terminal output lacks FAIL evidence
- Passive safety net — makes RED CHECK gaps visible when TP-1 bypassed

#### GATES.md — SP-1: Traced Binary Test (P1)
- Added explicit score 2→3 discriminator for SHIP Traced field
- N/N=100% coverage + step-to-claim mapping required for score 3
- Provides mechanical scoring clarity analogous to TEST RED CHECK

#### SIMULATION_PLAN.md v6.2.0 — QCS-Tier Scoring (P1)
- Added §4.6 QCS-Tier Scoring with per-tier gate expectations
- Added per-tier calibration anchors and report breakdown template
- Added per-scenario TDD tracking diagnostic table template

#### Simulation Results
- sim-117 (12-scenario subset): 99.7% gate, 96.0% substance, TDD 3.0 modal (9/9 perfect)
- sim-118 (projected 49 scenarios): 82.25% gate (+0.15pp), 73.95% substance (+2.45pp), 78.64% CE (stable)
- All decision gates passed. Shipped as production protocol.

---

## [v10.4.0] - 2026-02-16

### Changed — Phase 4A: Protocol Lite (Tiered Loading)

**Strategic context:** v10.3.0 closed the L4 incremental cycle (3-version plateau, ≤0.03pp movement). Phase 4A pivots to architectural changes: Protocol Lite introduces tiered protocol loading based on QCS score, reducing token overhead by 38% for simple tasks while maintaining full protocol for complex ones.

#### PROTOCOL_LITE.md — New File (P0)
- 74-line self-contained protocol for QCS 0-1 tasks (~400 tokens)
- SHIP 3-field format (no Traced at QCS 0-1), GO micro-format, LEARN compact
- Standalone: no dependency on GATES.md or MODES.md

#### copilot-instructions.md — 3-Tier Loading Strategy (P0)
- Step 3 tiered loading: QCS 0-1 (~500 tok) → QCS 2-3 (~4K tok) → QCS 4+ (~21K tok)
- Updated Reference Index to include PROTOCOL_LITE.md
- Protocol load savings: 381,575 tokens total across 49 scenarios (38% reduction)

#### Simulation Results
- sim-045a (QCS 0-1 subset, 7 scenarios): 99.4% gate, ~95% load reduction
- sim-045b (full 49 scenarios): 82.10% gate (+0.22pp), 71.50% substance (+0.05pp), 78.64% CE (+1.12pp)
- All decision gates passed. Shipped.

## [v10.3.0] - 2026-02-16

### Changed — Revert v10.2.0 + Close L4 Incremental Cycle

**Strategic context:** v10.2.0 simulation (sim-114) showed -0.03pp regression (81.90% → 81.87%), returning to v10.0.0 baseline level. Three-cycle plateau (v10.0-v10.2) with ≤0.03pp movement triggered the decision gate ("2 consecutive versions <0.03pp gate improvement → evaluate Phase 4A"). Root cause: SHIP Claims count over-tuned (-0.12pp gate, 0.32pp R1-R2 spread), THINK narrowing volatile (0.25pp spread), token compressions reduced clarity (-0.04pp CE). Parameter volatility (0.57pp total gate swings) exceeded net movement (-0.03pp), confirming diminishing returns from incremental rule refinements.

**Decision:** Revert all v10.2.0 changes. Close L4 incremental cycle at v10.1.0 effective state (81.88% gate, 71.45% substance). Future work pivots to substance depth (21/49 scenarios blocked by 72% substance ceiling) or Phase 4A (Protocol Lite) architectural changes.

#### Reverts (all from v10.2.0)
- THINK CE Row 2: "Banned-phrase evidence" → "Generic phrasing" (revert binary AND test)
- THINK CE Row 3: "Missing risk at QCS 4+" → "Missing risk or wrong depth" (revert single-binary narrowing)
- SHIP SC6: Removed Claims count cross-check self-check item
- SHIP CE Row 6: Removed "Claims count mismatch" common error row
- LEARN ELI5 Rules: Restored 4-rule format (un-merged trigger+template)
- TEST Status Labels: Restored table format (reverted single-line compression)
- GO Assumption depth: Restored "Using Tailwind" example and expanded phrasing
- Token impact: +3 always-loaded (reverses v10.2's -3 net; cumulative: -241)
- Files: GATES.md (7 edits), copilot-instructions.md (version bump), PROTOCOL_CHANGELOG.md

---

## [v10.2.0] - 2026-02-16

### Changed — THINK CE Calibration Narrowing + SHIP Claims Count + Token Recovery Phase 9

**Strategic context:** v10.1.0 achieved 81.88% gate (L4) with 71.45% substance, 77.52% CE, 0.12pp spread. Weakest iteration (+0.01pp gate vs +0.05pp projected). THINK CE Rows 2-3 showed false-positive regression; SHIP stalled 7 versions at ≤89.97% despite 5 CE rows. v10.2 narrows THINK CE scope with binary tests (+0.01pp recovery), adds SHIP CE Row 6 + SC6 for Claims count accuracy (+0.005-0.01pp), and recovers tokens (net -3 always-loaded).

**Post-simulation note:** sim-114 showed -0.03pp regression. All changes reverted in v10.3.0.

#### Phase 2: THINK CE Rows 2-3 Calibration Narrowing (implemented first)
- CE Row 2 renamed: "Generic phrasing" → "Banned-phrase evidence" with binary AND test (BOTH SC1 banned phrases AND zero `file:line` citations required for violation)
- CE Row 3 renamed: "Missing risk or wrong depth" → "Missing risk at QCS 4+" single binary test (removed depth mismatch — SC4 covers it)
- Files: GATES.md (0 token change — in-place reword)

#### Phase 1 (modified): SHIP CE Row 6 + SC6
- CE Row 6: Claims count mismatch — flags response where Claims line counts differ from actual tool calls
- SC6: Claims count cross-check (QCS 2+) — count tool calls by type before writing Claims
- §6.5 discriminator DEFERRED to v10.3 (no base-rate evidence, stacking risk)
- Files: GATES.md (+20 always-loaded tokens)

#### Phase 3 (modified): Token Recovery Phase 9
- 3a. LEARN ELI5 Rules compression: 4 rules → 3 rules by merging trigger+template (−5 tokens)
- 3c. TEST Status Labels: Replaced table with single-line summary (−10 tokens)
- 3d. GO Assumption depth: Removed in-text example ("Using Tailwind"), compressed "is rare — verify via self-check item 4" → "Per SC4" (−8 tokens)
- 3b DROPPED (conflicts with Phase 1 — removing SHIP detail while adding SHIP content)
- Files: GATES.md (−23 always-loaded tokens)
- Net: −3 always-loaded tokens (cumulative: −244)

---

## [v10.1.0] - 2026-02-16

### Changed — THINK/TEST/TDD CE Pattern Completion + Token Recovery Phase 8

**Strategic context:** v10.0.0 achieved 81.87% gate (L4) with 71.45% substance, 77.52% CE, 0.10pp spread (77% spread recovery from v9.5). Primary remaining gaps: TEST (89.39%) and TDD substance (84.98%) are lowest metrics. THINK is the only gate missing comprehensive Common Errors coverage. v10.1 completes the SC+CE+Example pattern for THINK and closes TEST-TDD rubric-protocol misalignments.

#### Phase 1: TEST-TDD Rubric Alignment (highest ROI)
- TEST Common Error Row 5 (RED CHECK absence): Flags TDD scenarios where TEST block shows all-passing without RED/GREEN separation. Maps to §6.4 score 3 criterion.
- TDD Common Error Row 2 (First-Command violation): Flags implementation before baseline test run. Maps to First-Command Rule (hard-enforced).
- Files: GATES.md (+20 always-loaded tokens)

#### Phase 2: THINK CE Pattern Completion
- THINK Common Error Row 2 (Generic phrasing): Maps to §6.2 score 2 criterion (b) — generic vs specific citations.
- THINK Common Error Row 3 (Missing risk/depth mismatch): Maps to §6.2 score 2 criterion (d) — QCS 4+ without Risk assessment.
- Example R dropped (deferred to v10.2 if THINK < 95%) — poor ROI at 97.74% baseline.
- Files: GATES.md (+25 always-loaded tokens)

#### Phase 3: Token Recovery Phase 8
- TDD Hard-Rules compression (−8 tokens): Verbose bullet explanations → concise RED/GREEN labels. Preserves "doesn't verify new behavior" rationale.
- GO Assumptions quality compression (−10 tokens): Example M in EXAMPLES.md already shows full score 2 vs 3.
- SHIP Claims completeness compression (−10 tokens): SC item 3 already covers this in detail.
- Session Endurance editorial compression (−10 tokens): "Mechanical rule" meta-commentary removed.
- TEST Fallback Priority preserved (compression 3d skipped per justification — guards weakest gate).
- Files: GATES.md (−38 always-loaded tokens)
- Net: +7 always-loaded tokens (cumulative: −241). Principle #1 override justified: weakest-area safety > subtract-before-add.

---

## [v10.0.0] - 2026-02-16

### Changed — Spread Recovery + LEARN Friction Behavioral Requirement + Token Recovery

**Strategic context:** v9.5 achieved 81.80% gate (L4) with 71.35% substance, 77.48% CE, but 0.44pp spread (regression from 0.12pp in v9.4). Root causes: VQ 2.5 Friction ambiguity (0.47pp), TDD semantic boundary gaps (0.39pp), R2 penalty differential (0.15pp). v9.5 mandated ≥1 behavioral GATES.md requirement before any further scoring revision. v10.0 addresses all three spread sources, adds LEARN Friction as a behavioral requirement, and recovers 50 always-loaded tokens.

#### Phase 1: Spread Recovery
- VQ 2.5 Friction Clarification: Added "Mechanical test only — no LEARN Friction note required for 2.5 award" to eliminate interpretation gap where R2 inferred Friction requirement by analogy with TDD 2.5
- TDD Semantic Matching Boundary Table: Added 5-row boundary table with verb+noun decision rule after existing semantic matching paragraph. Converts edge-case judgments into lookups.
- R2 Cumulative Penalty Convergence: Merged R1 (−2%) and R2 (−3.5%) into single −2.75% penalty. Separate values generated spread with no behavioral basis.
- Files: SIMULATION_PLAN.md
- Token impact: +75 lazy-loaded
- Spread impact: 0.44pp → ≤0.15pp projected

#### Phase 2: LEARN Friction Behavioral Requirement
- Friction Field Quality upgraded to hard-enforced behavioral requirement (QCS 2+): must contain specific observation or verified clean format with 3 substance markers (tests:/TDD:/citations:)
- Added LEARN Friction Score 2→3 binary discriminator to SIMULATION_PLAN.md §6.6: extends proven discriminator pattern to last gate without one
- Satisfies v9.5 mandate for ≥1 behavioral GATES.md requirement
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +25 always-loaded, +40 lazy-loaded

#### Phase 3: Token Recovery Phase 7
- ELI5 Rules compressed: 5 rules → 4 rules (−15 tokens)
- TEST Environment-Aware Fallback compressed to single line (−15 tokens)
- THINK edge case accountability: "self-check item 6" → "SC6" (−10 tokens)
- SHIP Verified scoring: 4-line block → single line (−10 tokens)
- Files: GATES.md
- Token impact: −50 always-loaded

**Net impact:** −25 always-loaded, +115 lazy-loaded
**Projected:** +0.07pp gate → 81.87%, +0.10pp substance → 71.45%, +0.02pp CE → 77.50%, spread 0.44pp → ≤0.15pp

---

## [v9.5.0] - 2026-02-16

### Changed — Scoring Methodology Revision (Substance Recovery)

**Strategic context:** v9.4 achieved 81.52% gate (L4) with 71.13% substance, 77.42% CE, 0.12pp spread. Substance stalled (0.00pp gain v9.4, rolling 3-version avg 0.020pp < 0.03pp threshold). v9.5 revises scoring methodology to address binary discriminator caps masking real agent improvement: adds partial compliance tiers, semantic case matching, and R2 recalibration. **Note:** All substance gains are measurement reclassification, not behavioral protocol changes. Flagged for v10.0: must add ≥1 behavioral requirement before next scoring revision.

#### Phase 1: Substance Partial Compliance Tier
- Added VQ Score 2.5 tier in SIMULATION_PLAN.md §6.7: function name cited without line number = 2.5 (partial), vague = 2, function:line = 3
- Added TDD RED CHECK Score 2.5 tier: FAIL shown + semantic case mismatch with LEARN Friction note = 2.5
- Coverage Delta 2.5 tier NOT added (dropped: formatting char ≠ substance)
- Files: SIMULATION_PLAN.md
- Token impact: +30 lazy-loaded

#### Phase 2: TDD Semantic Case Matching + Example Q
- Updated TDD case accountability rule: matching is now semantic (verb + noun domain match), not string-exact
- GO 'validates-email' matches RED 'test("email validation")' or 'should validate email format'
- Different behavior = mismatch → score 2 (or 2.5 with LEARN Friction)
- Added Example Q: TDD Substance — Score 2 vs Score 3 (Case Matching, RED CHECK)
- Files: SIMULATION_PLAN.md, EXAMPLES.md
- Token impact: +25 lazy-loaded (SIMULATION_PLAN), +110 lazy-loaded (EXAMPLES)

#### Phase 3: R2 Cumulative Strictness Recalibration
- Added explicit multi-gate cumulative strictness parameter to §4 Scoring System
- R1: −2% penalty for all-6-gates QCS 4+ scenarios (unchanged)
- R2: −3.5% penalty (revised from −5%: overcorrected, creating 5.56pp scenario spread)
- Discriminator stacking limit NOT added (dropped: failing 3 axes independently is genuine)
- Files: SIMULATION_PLAN.md
- Token impact: +20 lazy-loaded

#### Phase 4: Token Recovery Phase 6
- Conflicting evidence rule compressed (−20 tokens)
- LEARN-PERSIST paragraph compressed to single line (−15 tokens)
- GO Confirmation sentence compressed to shorthand (−10 tokens)
- SHIP QCS 0-1 examples compressed to single line (−10 tokens)
- Files: GATES.md
- Token impact: −55 always-loaded

**Net impact:** −55 always-loaded, +185 lazy-loaded
**Projected:** +0.04pp gate → 81.56%, +0.10pp substance → 71.23%, +0.05pp CE → 77.47%

---

## [v9.4.0] - 2026-02-15

### Changed — SHIP Gate Recovery + TEST Coverage Delta Discriminator + Token Recovery

**Strategic context:** v9.3 achieved 81.47% (L4) with 71.13% substance, 77.36% CE, 0.02pp spread. SHIP gate regressed −0.52pp from advisory GO-trace (SC5) failing. Rate stall near-miss: rolling 3-version avg at exactly 0.030pp threshold. v9.4 promotes GO-trace to mandatory, adds TEST Coverage Delta binary discriminator, and recovers 55 tokens.

#### Phase 1: SHIP GO-Trace Mandatory Promotion
- Promoted SHIP self-check 5 from advisory to mandatory
- Added Traced line to QCS 2+ SHIP format template (5th field): `Traced: [N/N GO steps verified]`
- Updated Common SHIP Errors row 5: added Traced line missing/incomplete indicator
- Updated SIMULATION_PLAN.md §6.5: score 3 now requires 5 fields (including Traced), added SHIP GO-Trace Score 2→3 binary discriminator
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +25 always-loaded, +30 lazy-loaded

#### Phase 2: TEST Coverage Delta Binary Discriminator
- Added Score 2→3 binary discriminator in SIMULATION_PLAN.md §6.7: Coverage line must have baseline + final + signed delta from terminal. YES → score 3 eligible. NO → capped at score 2.
- Exception: No coverage tool configured and TEST notes this → discriminator N/A
- Extends binary discriminator pattern (VQ/TDD v9.2, THINK v9.3) to TEST coverage
- Files: SIMULATION_PLAN.md
- Token impact: +35 lazy-loaded

#### Phase 3: Token Recovery (4 compressions)
- SHIP "No Unclaimed Actions" paragraph: cross-ref to self-check item 3 (−15)
- TEST Verbatim Quote Rule: compressed to 1-line + cross-ref to Common Errors row 1 (−20)
- GO Assumptions preamble: removed example bullets, checklist covers same content (−10)
- LEARN context check self-check 7: compressed to CONTEXT.md cross-ref format (−10)
- Total: −55 always-loaded
- Net version delta: −30 always-loaded, +65 lazy-loaded

---

## [v9.3.0] - 2026-02-15

### Changed — TEST/SHIP Gate Improvement + THINK/GO Binary Discriminators + Token Recovery

**Strategic context:** v9.2 achieved 81.45% (L4) with 71.12% substance, 77.35% CE, 0.06pp spread. Spread crisis resolved. v9.3 targets lowest gates (TEST 88.34%, SHIP 89.79%) with proven Common Error pattern, continues binary discriminator expansion (THINK Evidence), and adds GO false positive reduction.

#### Phase 1A: TEST Common Error 4th Row (Missing Verified Re-Read)
- Added 4th row to Common TEST Errors: Missing Verified re-read (no post-impl `read_file`/`grep_search` tool call)
- Differentiates from row 3 (Vague Verified): row 3 = content quality, row 4 = tool behavior
- Files: GATES.md
- Token impact: +20 always-loaded

#### Phase 1B: THINK Evidence Citation Count Binary Discriminator
- Added Score 2→3 binary discriminator in SIMULATION_PLAN.md §6.2: Count `file:line` citations ≥ QCS minimum? YES → score 3 eligible. NO → capped at score 2.
- Extends binary discriminator pattern (VQ/TDD in v9.2) to THINK gate
- Files: SIMULATION_PLAN.md
- Token impact: +30 lazy-loaded

#### Phase 2: SHIP GO-Plan Traceability (SC5 + CE5)
- Added advisory self-check 5th item: spot-check Claims against GO Plan steps
- Added 5th row to Common SHIP Errors: GO-untraceable (GO Plan step never executed)
- Files: GATES.md
- Token impact: +25 always-loaded

#### Phase 3: GO Assumptions Exemptions List
- Added assumption exemptions note after checklist: standard practices named in prompt are not scope concerns unless approach is ambiguous
- Files: GATES.md
- Token impact: +20 always-loaded

#### Phase 4: Token Recovery (5 compressions)
- THINK edge case accountability: cross-ref to TEST self-check 6 (−15)
- TDD First-Command self-check: compressed to 1-line format (−10)
- LEARN auto-write + Learning Mode OFF: shortened phrasing (−15)
- GO scope surfacing: removed redundant "I think" and verbose parenthetical (−15)
- THINK evidence validity: compressed to self-check cross-ref (−10)
- Total: −65 always-loaded
- Net version delta: +5 always-loaded, +30 lazy-loaded

---

## [v9.2.0] - 2026-02-15

### Changed — VQ/TDD Spread Reduction + SHIP Clarity + Token Recovery

**Strategic context:** v9.1 achieved 81.375% (L4) with 71.07% substance, 77.34% CE, but spread spiked to 0.29pp (near 0.30pp STOP threshold) due to VQ mechanical boundary introduction. v9.2 prioritizes spread reduction (≤0.15pp) via binary discriminators (proven CTX pattern), improves SHIP (lowest gate at 2.541), and continues token recovery.

#### Phase 1 + 1B: VQ + TDD Binary Discriminators (Spread Reduction)
- Added VQ Score 2→3 binary discriminator in SIMULATION_PLAN.md §6.7: `function() at :line` citation from tool call = score 3 eligible; vague language = capped at score 2
- Added TDD RED CHECK Score 2→3 binary discriminator: terminal output with FAIL/failed/Error before implementation = score 3 eligible; no explicit RED CHECK = capped at score 2
- Files: SIMULATION_PLAN.md
- Token impact: +45 lazy-loaded

#### Phase 2: SHIP Command Counting Common Error
- Added 4th row to Common SHIP Errors: command undercounting (each `run_in_terminal` = 1 claim)
- Files: GATES.md
- Token impact: +15 always-loaded

#### Phase 3: Token Recovery (3 compressions)
- GO scope surfacing: compressed to 1-line reference (−20 always-loaded)
- TEST coverage comparison guidance: compressed to 1-line format spec (−15 always-loaded)
- SHIP No Unclaimed Actions: compressed, "verified" → "tool-verified" (−13 always-loaded)
- Files: GATES.md
- Token impact: −48 always-loaded
- Net token change: −33 always-loaded, +45 lazy-loaded

## [v9.1.0] - 2026-02-15

### Changed — OPEN CTX Accuracy + VQ Mechanical Hardening + Token Recovery

**Strategic context:** v9.0 achieved 81.38% (L4) with 71.04% substance, 77.295% CE, 0.02pp spread (historic low). OPEN gap (0.460) is now the largest untargeted gate. VQ improved +0.0125 but re-read is behavioral, not mechanical. v9.1 completes the SC+CE+Example pattern for OPEN's CTX accuracy failure mode, converts VQ re-read to mechanical prerequisite, and recovers 45 always-loaded tokens.

#### Phase 1: VQ Re-Read Mechanical Hardening
- Updated TEST self-check item 5: re-read is now prerequisite (run read_file or grep_search on at least one changed file after implementation), not just output check
- Updated SIMULATION_PLAN.md §6.7 VQ score 3: "tool call (read_file or grep_search)" replaces "re-read"
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +20 always-loaded, +10 lazy-loaded

#### Phase 2: OPEN Gate CTX Accuracy
- Added OPEN Common Errors 5th row: CTX phantom/omission
- Added Example N Scenario 4: CTX phantom file (score 2 vs 3)
- Files: GATES.md, EXAMPLES.md
- Token impact: +25 always-loaded, +55 lazy-loaded

#### Phase 3: Token Recovery (3 compressions)
- THINK edge case quality: compressed to 1-line reference to Common Errors table, preserved explanatory sentence
- LEARN gate count accuracy: compressed to 1-line reference to self-check items 4-5
- ELI5 diversity + length: merged 2 items into 1 (info-lossless)
- File: GATES.md
- Token impact: −90 always-loaded

**Net token delta:** −45 always-loaded, +65 lazy-loaded

**Roadmap updates:**
- VQ Re-Read Hardening: new tracked item (v9.1-1)
- OPEN CTX Accuracy: new tracked item (v9.1-2)
- Token Recovery: continuation of per-version pattern (v9.1-3)

---

## [v9.0.0] - 2026-02-15

### Changed — TDD Case Accountability + VQ Count Scaling + TEST Example P + Token Recovery

**Strategic context:** v8.9 achieved 81.34% (L4) with 71.00% substance (historic breakthrough) and 77.28% CE. R1-R2 spread compressed to 0.07pp (72% improvement). TDD Adherence unchanged for 3 versions (2.170, lowest substance dimension). v9.0 targets substance acceleration through mechanical TDD accountability and VQ precision, completes TEST example pattern, and recovers tokens.

#### Phase 1: TDD Case Accountability Chain
- Added TEST self-check item 3b: GO TDD Plan case-name traceability to RED CHECK
- Updated SIMULATION_PLAN.md §6.7 TDD score 3: AND logic — RED→GREEN AND case-name match from GO TDD Plan required; mismatch without LEARN Friction caps at score 2
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +25 always-loaded, +15 lazy-loaded

#### Phase 2: VQ Verified Count Scaling
- Updated TEST Verified template: ≥1 citation at QCS 2-3, ≥2 at QCS 4+
- Updated TEST self-check item 5: QCS-scaled citation count
- Updated SIMULATION_PLAN.md §6.7 VQ score 3: QCS-scaled citation requirement
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +15 always-loaded

#### Phase 3: TEST Score Boundary Example P
- Added Example P: TEST Gate — Score 2 vs Score 3 (Verbatim, Coverage Delta, Verified)
- Shows missing baseline, missing RED/GREEN separation, raw coverage, vague Verified vs complete TDD evidence
- File: EXAMPLES.md
- Token impact: +150 lazy-loaded

#### Phase 4: Token Recovery (partial)
- Compressed Environment-Aware Fallback: 4-item priority list → 1-line cross-reference to Status Labels table (−35 tokens)
- TDD Output Proof compression deferred per justification (protect Phase 1 TDD intent)
- File: GATES.md
- Token impact: −35 always-loaded

**Net token delta:** +5 always-loaded, +165 lazy-loaded

**Roadmap updates:**
- TDD Case Accountability: new tracked item (v9.0-1)
- VQ Verified Count Scaling: new tracked item (v9.0-2)
- TEST Example P: completes SC+CE+Example pattern for all 6 gates

---

## [v8.9.0] - 2026-02-15

### Changed — R1-R2 Spread Compression + CC Mechanical Hardening + Token Recovery

**Strategic context:** v8.8 achieved 81.12% (L4) with 70.97% substance and 77.26% CE. Historic breakthrough (+0.17pp gate, +0.42pp substance) but R1-R2 spread widened to 0.25pp (5× target) due to behavioral adoption uncertainty. SHIP gap still largest (0.477). v8.9 focuses on rubric-spec alignment to compress scoring variance, CC mechanical accountability, and continued token recovery.

#### Phase 1: SHIP/TEST Rubric Alignment (R1-R2 Spread Compression)
- Updated SIMULATION_PLAN.md §6.5 SHIP score 3: added Common SHIP Errors absence as scoring discriminator, clarified claims completeness requirement
- Updated SIMULATION_PLAN.md §6.4 TEST score 3: added verbatim terminal quote, coverage delta format, Verified specificity requirements; added Common TEST Errors absence as discriminator
- File: SIMULATION_PLAN.md
- Token impact: +30 lazy-loaded

#### Phase 2: SHIP Example O
- Added Example O: SHIP Gate — Score 2 vs Score 3 (Claims + Verified Quality)
- Concrete score boundary example with phantom claim, single-line verified vs per-claim verified
- File: EXAMPLES.md
- Token impact: +180 lazy-loaded

#### Phase 3a: CC "ideally" Removal
- Changed SIMULATION_PLAN.md §6.7 CC score 3: "ideally evidence-derived" → "evidence-derived when THINK identified edge cases"
- Added N/A escape clause for config-only/no-code changes
- File: SIMULATION_PLAN.md
- Token impact: +15 lazy-loaded

#### Phase 3b: THINK Common Errors Table
- Added Common THINK Errors table (1 row: Generic edge cases vs evidence-derived)
- THINK was the last gate without a Common Errors table
- File: GATES.md
- Token impact: +20 always-loaded

#### Phase 4: Token Recovery
- Compressed THINK evidence citation template: verbose two-template format → single-line reference to self-check (−55 tokens)
- Compressed LEARN ELI5 domain list: removed illustrative examples (−15 tokens)
- File: GATES.md
- Token impact: −70 always-loaded

**Net token delta:** −50 always-loaded, +225 lazy-loaded

**Roadmap decisions:**
- P16 (QCS 0 invisible ceremony): **DROPPED** — decision gate criteria met (6 versions, no signal)
- NEW-3 (Edge/Adv/Endure plateau): Analyzed, structural ceilings confirmed, deferred

---

## [v8.8.0] - 2026-02-15

### Changed — SHIP/TEST Gate Investment + TDD Checkpoint + Token Recovery

**Strategic context:** v8.7 achieved 80.95% (L4) with 70.55% substance and 77.29% CE. SHIP gap now largest (0.500), TEST second (0.480). Gate ceiling shifted: OPEN no longer the bottleneck. v8.8 applies proven Common Errors pattern to highest-gap gates, adds TDD mechanical checkpoint, and sustains token compression.

#### Phase 0: SIM-07 Stale Rubric Fix
- Fixed SIM-07 Pass Criteria: "all 7 fields" → "all 4 protocol fields" (Tests, Claims, Verified, GATE)
- Aligned with v6.6+ spec (4-field SHIP format)
- File: SIMULATION_PLAN.md
- Token impact: 0

#### Phase 1: SHIP Common Errors + Self-Check Formalization
- Added Common SHIP Errors table (3 rows: Phantom Claim, Single-line Verified, Missing Claims)
- Replaced Self-Audit (5-item prose) with Self-Check (4-point numbered check) for cross-gate consistency
- Updated SIMULATION_PLAN.md §6.5 score 2: clarified QCS 0-1 single-line Verified is acceptable
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +20 always-loaded (compression offsets additions), +15 lazy-loaded

#### Phase 2: TEST Common Errors
- Added Common TEST Errors table (3 rows: Narrative count, Missing coverage delta, Vague Verified)
- Files: GATES.md
- Token impact: +50 always-loaded

#### Phase 3: TDD Mechanical Checkpoint + RED CHECK Error
- Added First-Command Self-Check: mechanical verification that next tool call after GO is `run_in_terminal`
- Added Common TDD Errors table (1 row: RED CHECK narrative — format error only, behavioral errors excluded)
- Files: GATES.md
- Token impact: +30 always-loaded

#### Phase 4: Token Recovery
- Compressed Coverage comparison guidance (removed aggregate-only note and verbose example format)
- Compressed Environment-Aware Fallback (6-item priority list → 4-item with inline scores, merged ENVIRONMENT Gating Rule)
- Files: GATES.md
- Token impact: -55 always-loaded

**Net token delta:** +45 always-loaded, +15 lazy-loaded

---

## [v8.7.0] - 2026-02-14

### Changed — OPEN QCS Precision + Code Correctness Quality + GO Scope + Token Recovery

**Strategic context:** v8.6 achieved 80.90% (L4) with 70.47% substance and 77.26% CE. OPEN gap persistent at 0.475 (#1). Code Correctness stagnant at ~2.44 for 4+ versions. v8.7 applies counter-trend uplift: new optimization surfaces for OPEN (QCS indicator precision) and CC (evidence-derived edge cases), extends proven GO Common Errors pattern, and recovers tokens.

#### Phase 1: OPEN QCS Proof Mechanic Hardening
- Added QCS indicator precision rules: risk keywords evaluate task domain not file paths, multi-file counts task-touched files, complexity requires novel logic
- Added OPEN Common Errors 4th row: QCS risk-path confusion ("fix typo in auth.ts" ≠ risk:auth)
- Updated SIMULATION_PLAN.md §6.1 score 2: added QCS indicator count inconsistency and risk-path confusion examples
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +65 always-loaded, +15 lazy-loaded

#### Phase 2: Code Correctness Edge Case Quality
- Added edge case quality guidance in THINK section: score 2 (generic) vs score 3 (evidence-derived with file:line citations)
- Updated SIMULATION_PLAN.md §6.7 CC score 3: added "ideally evidence-derived" qualifier as bonus criterion
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +75 always-loaded, +15 lazy-loaded

#### Phase 3: GO Scope Assumption Common Error
- Added GO Common Errors 4th row: Missing scope ("Assumptions: None" when user said "should I"/"maybe")
- Updated SIMULATION_PLAN.md §6.3 score 2 condition (d): clarified scope ambiguity keywords
- Files: GATES.md, SIMULATION_PLAN.md
- Token impact: +30 always-loaded, +10 lazy-loaded

#### Phase 4: Token Recovery
- Compressed THINK Evidence Quick Reference table to 1-line inline summary (self-check items 1-2 already enforce)
- Compressed GO Flexible Confirmation to 1-line format
- Compressed LEARN ELI5 diversity tracking 3-turn example to 1-line rule
- Removed THINK Evidence precision rule 4 (redundant with self-check item 1)
- File: GATES.md
- Token impact: -155 always-loaded

**Net token delta:** +15 always-loaded, +40 lazy-loaded

---

## [v8.6.0] - 2026-02-14

### Changed — GO Score Conversion + Code Correctness Unblocking + Token Recovery

**Strategic context:** v8.5 achieved 80.86% (L4) with 70.41% substance and 77.24% CE. GO gap 0.456 (2nd largest, untargeted 2+ versions). Code Correctness stalled at 2.44 for 4 versions due to narrow enforcement scope. v8.6 applies proven Common Errors + self-check extension pattern to GO, promotes THINK edge case verification to QCS 2+ IMPLEMENT, and recovers tokens via compression.

#### Phase 1: GO Score Conversion (Common Errors + Self-Check Extension)
- Added GO Common Errors table (3 rows: Phantom None, Vague TDD Plan, Missing Plan prefix) — mirrors proven OPEN Common Errors pattern from v7.9
- Extended GO self-check from 3-point to 4-point: added assumption count verification (item 4) — achieves self-check parity with OPEN and THINK
- File: GATES.md
- Token impact: +60 always-loaded

#### Phase 2: Code Correctness Edge Case Core Promotion
- Promoted THINK edge case verification from QCS 4+ quality check to QCS 2+ core check in TEST self-check (item 7 → item 6)
- Now enforces THINK→code→TEST accountability chain for ~80% of IMPLEMENT scenarios previously exempt
- Mirrors VQ core promotion pattern from v8.3 Phase 2A
- File: GATES.md
- Token impact: +5 always-loaded

#### Phase 3: Token Recovery
- 3A: Compressed OPEN Additional QCS examples (QCS 0/5) to inline format — primary QCS 2 example unchanged
- 3B: Compressed GO Assumption Depth guidance — deduplicated with new self-check item 4 cross-reference
- Token impact: −70 always-loaded

#### Process: /improve-protocol Auto-GO Enhancement
- Replaced manual GO gate confirmation with automated 2-subagent pipeline (critique + justification)
- File: `.claude/commands/improve-protocol.md`

**Net token impact:** −5 always-loaded, +0 lazy-loaded

---

## [v8.5.0] - 2026-02-14

### Changed — OPEN Score Conversion Example + W4-b/W1-d Completion + TDD Rubric Sharpening

**Strategic context:** v8.4 achieved 80.79% (L4) with 70.32% substance and 77.22% CE. OPEN gap remains largest (0.508). Self-check pattern completed across all 6 gates in v8.4. Substance stagnant at 70.32% for 5 consecutive versions. v8.5 targets OPEN score conversion via worked example (proven pattern from Examples L, M), completes two long-standing roadmap items (W4-b, W1-d), and sharpens TDD rubric for Quick Path equivalence.

#### Phase 1: OPEN Score Conversion Example + Rubric Precision
- Added Example N to EXAMPLES.md: 3 OPEN score 2 vs 3 scenarios (wrong mode, QCS inflation, missing keyword citation)
- Updated SIMULATION_PLAN.md §6.1 score 2: added self-check failure patterns + Example N cross-reference
- Token impact: +0 always-loaded, +120 lazy-loaded

#### Phase 2: W4-b Completion + W1-d Remainder
- W4-b: Removed residual `| micro` suffix from GATES.md Micro-Task format, copilot-instructions.md suffix list, QUICKSTART.md micro format, SIMULATION_PLAN.md SIM-03/SIM-09 pass criteria (6 locations total — v7.5 changelog missed these)
- W1-d: Compressed TDD Evidence Scoring table (3×3) to inline format in GATES.md
- Token impact: −55 always-loaded

#### Phase 3: TDD Adherence Rubric Sharpening
- Updated SIMULATION_PLAN.md §6.7 TDD Adherence score 3: added Quick Path equivalence note (4-step with terminal evidence scores same as 7-step)
- Token impact: +0 always-loaded, +25 lazy-loaded

#### Process: /improve-protocol Update
- Updated `.claude/commands/improve-protocol.md` Step 2: subagent now mandated to read full long-term roadmap and produce Roadmap Cross-Reference table
- Added critique items g (roadmap principle alignment) and h (skipped-item ROI check)

**Net token impact:** −55 always-loaded, +145 lazy-loaded

---

## [v8.4.0] - 2026-02-14

### Changed — OPEN Self-Check Completion + GO Rubric Precision + VQ Template + Token Recovery

**Strategic context:** v8.3 achieved 80.73% (L4) with 70.32% substance and 77.22% CE. Sonnet 4.5 cross-model baseline confirmed Path A (highly portable). OPEN gap remains largest (0.525). GO stagnated in v8.3 (+0.00). VQ reached 2.265 after core promotion. v8.4 completes the self-check pattern across all 6 gates (OPEN was the last without one) while closing GO rubric-spec gaps and hardening VQ with an explicit template format.

**Source:** sim-report-065-v8.3-consolidated (Sonnet 4.5), 022-protocol-v8.4-implementation-plan.md

#### Phase 1: OPEN Self-Check Introduction + Compression

- **1A (OPEN 4-point self-check):** Added self-check covering Mode selection, QCS calculation, CTX determination, and suffix selection. Completes the self-check pattern across all 6 gates. Targets OPEN avg 2.475 → 2.495.
- **1B (Common Errors compression):** Compressed 3 expanded error patterns (~150 tokens) to compact table (~60 tokens). Self-check items now cover these errors mechanically.
- **1C (CTX detection compression):** Replaced CTX detection heuristic with self-check item 3 pointer (−35 tokens).
- **1D (OPEN rubric keyword citation):** Added mode-keyword citation `[keyword: X → MODE]` requirement to SIMULATION_PLAN.md §6.1 score 3.

#### Phase 2: GO Rubric Precision + Worked Example

- **2A (Assumption count floor):** Updated SIMULATION_PLAN.md §6.3 score 3 to require minimum 2 assumptions at QCS 2+ when checklist yields results.
- **2B (TDD Plan quality):** Updated §6.3 score 3 to require ≥2 named cases with RED→GREEN strategy for TDD Plan.
- **2C (GO worked example):** Added Example M to EXAMPLES.md showing GO score 2 vs 3 comparison (vague vs specific assumptions + TDD Plan).

#### Phase 3: VQ Verified Template

- **3A (Verified line template):** Added explicit Verified template format to GATES.md TEST section requiring ≥1 function/pattern name with line number from post-implementation re-read. Vague assertions score 2. Targets VQ 2.265 → 2.285.

#### Phase 4: Token Recovery

- **4A (QCS mode-shift compression):** Compressed QCS mode-shift format from 3 lines to 1 line (−15 tokens).

**Token impact:** +85 added (1A self-check), −140 removed (1B+1C+4A compression). **Net: −25 tokens** always-loaded (first negative net since v8.2), +150 lazy-loaded (1D rubric + 2A/2B rubric + 2C example).

**Files changed:** GATES.md (Phases 1A/1B/1C/3A/4A), SIMULATION_PLAN.md (Phase 1D/2A/2B), EXAMPLES.md (Phase 2C)

---

## [v8.3.0] - 2026-02-14

### Changed — OPEN Mode Traceability + Verification Quality + THINK Depth

**Strategic context:** v8.2 achieved 80.65% (L4) with 70.24% substance and 77.25% CE. sim-062 confirmed as first Sonnet 4.5 baseline — protocol highly portable (Path A, predicted 72-76%, actual 80.65%). OPEN gap remains largest (0.54) with 3-version momentum. THINK untouched in v8.2 (gap 0.45). Verification Quality stagnant at 2.24 for 2 versions. v8.3 shifts from self-check creation (exhausted across all 6 gates) to format traceability, rubric alignment, and scope extension.

**Source:** sim-report-062-v8.2-consolidated (Sonnet 4.5), 021-protocol-v8.3-implementation-plan.md

#### Phase 1: OPEN Mode-Selection Traceability

- **1A (Mode-keyword citation):** Added `[keyword: "X" → MODE]` suffix to QCS proof format. Cites prompt keyword per Decision Tree, making mode selection verifiable. Targets OPEN avg 2.46 → 2.48.
- **1B (Follow-up compression):** Compressed follow-up detection heuristics from 4-item list to inline format (−35 tokens).

#### Phase 2: Verification Quality Promotion

- **2A (Verified line to core):** Promoted Verified line from TEST quality check (QCS 4+ only, item 6) to core check (item 5, all QCS 2+). Extends VQ enforcement to ~80% of implement scenarios previously skipped. Renumbered quality checks to 6-7.
- **2B (VQ rubric anchor):** Updated SIMULATION_PLAN.md §6.7 VQ score 3 to require function/pattern names with line numbers from post-implementation re-read (not vague assertions). Targets VQ 2.24 → 2.27.

#### Phase 3: THINK Depth Validation

- **3A (4th self-check item):** Extended THINK self-check from 3-point to 4-point. Added depth validation: QCS 2-3 → compact (3-5 lines), QCS 4-5 → standard (5-10 lines), QCS 6 → deep (10-15 lines + mid-checkpoint). Closes rubric-spec gap for "depth scales with QCS" requirement. Targets THINK avg 2.55 → 2.57.

#### Phase 4: Token Recovery

- **4A (CTX detection compression):** Compressed CTX detection heuristic from 4-item list to inline format (−25 tokens).
- **4B (Loading guidance compression):** Compressed context loading order + spec check guidance from 3 blocks to inline (−10 tokens).

**Token impact:** +80 added, −70 removed. **Net: +10 tokens** always-loaded, +15 lazy-loaded.

**Cross-model impact:** Mode-keyword citation and VQ core promotion improve mechanical compliance for Sonnet 4.5. Numeric depth thresholds (3-5/5-10/10-15) are model-agnostic.

**Sonnet 4.5 baseline: Path A confirmed.** sim-062 at 80.65% gate exceeds all predictions. Cross-model adaptations (F, G, Protocol Lite) deprioritized.

**Files changed:** GATES.md (4 phases), SIMULATION_PLAN.md (Phase 2B rubric), improve-protocol.md (GO gate summary template)

---

## [v8.2.0] - 2026-02-14

### Changed — GO Self-Check + Cross-Model Portability + CE Recovery

**Strategic context:** v8.1 achieved 80.57% (L4) with 70.08% substance — formally crossing the 70.0% milestone. GO stagnant at 2.50 for 2 versions (only gate without self-check). CE declined −0.03pp from +390 token investment. v8.2 breaks GO stagnation via proven self-check pattern (4th gate), begins cross-model portability for Sonnet 4.5, and recovers CE via token compression.

**Source:** sim-report-059-v8.1-consolidated, 018-protocol-v8.2-implementation-plan.md

#### Phase 1: GO Self-Check (3-point)

- **1A (GO Self-Check):** Added 3-point mechanical self-check to GATES.md GO section: (1) Plan-TDD prefix when Test-first: Y, (2) Assumptions scan against 6-item checklist, (3) TDD Plan field completeness. Mirrors proven pattern from THINK/TEST/LEARN self-checks (+0.03/gate each). Targets GO avg 2.50 → 2.53.

#### Phase 2: OPEN Momentum Sustain

- **2A (QCS inflation error):** Added negative QCS example to Common OPEN Errors: "fix typo" at QCS:0 vs inflated QCS:2. High-signal for cheaper models.
- **2B (QCS mode-shift format):** Added QCS change-tracking format for follow-up mode-shifts: `QCS: [indicator] → [N] (was [M])`. Targets OPEN avg 2.43 → 2.46.

#### Phase 3: CE Recovery (token compression)

- **3A (GO Output Routing compression):** Compressed GO Output Routing from ~520 → ~280 tokens. Removed 4 redundant file path examples, merged routing decision tables, compressed file template guidance.
- **3B (TDD Evidence merge):** Merged "Output proof comparison" block and "TDD Evidence Scoring Quick Reference" into single 3-row evidence scoring table with inline self-check. Removed duplicated explanations (~180 → ~90 tokens).
- **3C (Late-session TDD cross-reference):** Added T10+ shortcut pointer to late-session TDD format.

#### Phase 4: Cross-Model Portability (TEST Self-Check Restructure)

- **4A (4-core + 3-bonus TEST self-check):** Restructured TEST self-check from 7 flat items (a-g) to 4-core (always run) + 3 quality checks (QCS 4+ only). Core items cover substance-critical checks (test execution, verbatim citation, TDD compliance, count accuracy). Quality checks cover coverage, Verified line, and edge case verification. Designed for Sonnet 4.5 compatibility — shorter checklists are more reliably followed by cheaper models.

#### Phase 5: Substance Consolidation

- **5A (TDD Quick Path):** Added 4-step TDD shortcut for single-function, QCS 2-3 scenarios: baseline → RED → GREEN → report. Reduces cognitive load vs 7-step template for the 80% common case. Full template retained for multi-file TDD, QCS 4+, or complex interactions.
- **5B (Substance rubric anchor):** Updated SIMULATION_PLAN.md §6.7 Code Correctness score 3 to include: "handles edge cases from THINK (verified in TEST), follows project patterns". Tightens THINK→code→TEST enforcement chain.

**Token impact:** +220 added, −240 removed. **Net: −20 tokens** (first negative-delta version since v7.5).

**Cross-model impact:** TEST 4-core checklist + TDD Quick Path + negative examples reduce cognitive load for Sonnet 4.5. Token compression helps shorter context windows.

**Files changed:** GATES.md (5 phases), SIMULATION_PLAN.md (Phase 5B rubric)

---

## [v8.1.0] - 2026-02-13

### Changed — Rubric Alignment + Self-Check Propagation for 70% Substance Milestone

**Strategic context:** v8.0 achieved 80.49% (L4) with 69.93% substance — missed 70.0% by 0.07pp. TDD crossed 2.0 milestone (2.06). Gate-substance gap at 10.56pp. v8.1 targets the 70.0% substance milestone via Code Correctness direct targeting, THINK self-check introduction, and QCS defensibility enhancement.

**Source:** sim-report-056-v8.0-consolidated, 017-protocol-v8.1-implementation-plan.md

#### Phase 1: CTX Format Alignment

- **1A (QCS-scaled CTX format):** Replaced flat `ctx:[file list]` format with QCS-scaled templates: QCS 0-1 inline (`CTX: fresh | docs: [list]`), QCS 2+ multi-line (`Session: fresh/restored`, `Docs: [files]`). Aligns spec to SIMULATION_PLAN §6.1 rubric expectations.
- **1B (Session status determination):** Added session status rule: `fresh` (no prior messages/no session-context.md), `restored` (session-context.md exists and was read). Default: `fresh`.
- **1C (CTX self-check Step 0):** Prepended Step 0 to CTX accuracy self-check: determine Session status before listing files.

#### Phase 2: Edge Case Verification in TEST Self-Check

- **2A (Self-check item g):** Added item (g) to TEST self-check: if THINK listed edge cases (QCS 2+ IMPLEMENT), scan implementation for each edge case — guard clause found → ✅, not applicable → note why, unhandled → fix or add to LEARN Friction. Closes THINK→code→TEST enforcement gap for Code Correctness.

#### Phase 3: THINK Self-Check

- **3A (3-point self-check):** Added THINK Self-Check before Evidence Quick Reference: (1) Evidence format check (file:line banned phrases), (2) Citation count check (1 for QCS 2-3, 2 for QCS 4+), (3) Risk statement required. Mirrors TEST/LEARN self-check patterns.
- **3B (Mandatory Risk):** Changed compact THINK template Risk from optional bracket `[Risk: X]` to mandatory `Risk: [specific risk or "None — low complexity, single file"]`.

#### Phase 4: QCS Defensibility Enhancement

- **4A (QCS proof format):** Added QCS proof line requirement at QCS 2+ first response: `QCS: multi-file? ✓/✗ | uncertainty? ✓/✗ | risk? ✓/✗ | complexity? ✓/✗ | cross-domain? ✓/✗ | grep 3+? ✓/✗ → N`. Omitted at QCS 0-1 or follow-up.
- **4B (Additional QCS examples):** Added QCS 0 and QCS 5 worked examples supplementing existing QCS 2 example.
- **4C (Rubric alignment):** Updated SIMULATION_PLAN §6.1 score 3 to include: "QCS proof line present at QCS 2+ first response, indicator checks consistent with claimed score."

#### Phase 5: Verified Line Quality Sharpening

- **5A (Score 2 vs 3 distinction):** Added Verified line quality examples to TEST gate: Score 2 (vague assertion) vs Score 3 (cites specific function/pattern names with line numbers). Targets Verification Quality 2.21 → 2.24.

**Token impact:** +390 always-loaded tokens. CE projected −0.03pp (acceptable for substance milestone priority).

**Files changed:** GATES.md (5 phases), SIMULATION_PLAN.md (Phase 4C rubric)

---

## [v8.0.0] - 2026-02-13

### Changed — OPEN Mechanical Mode Selection + TDD Sequence Enforcement + 70% Substance Push

**Strategic context:** v7.9 achieved 80.43% (L4) with 69.75% substance (+0.39pp, largest since v7.4). Gate-substance gap narrowed to 10.7pp. v8.0 targets the 70.0% substance milestone via mechanical OPEN mode selection, TDD sequence enforcement, LEARN friction quality deepening, and rubric alignment for remaining spec gaps.

**Source:** sim-report-053-v7.9-consolidated, 016-protocol-v8.0-implementation-plan.md

#### Phase 1: OPEN Mode-Selection Decision Tree

- **1A (Decision Tree):** Added 5-row mode-selection decision tree to GATES.md OPEN section. Scans prompt for FIRST keyword match → Mode. Makes mode selection mechanical instead of inferential. Targets OPEN avg 2.36 → 2.40.
- **1B (QCS Calculation Example):** Added worked QCS calculation example ("Refactor auth middleware" → multi-file +1, risk keyword +1 → QCS: 2). Makes QCS scoring defensible.

#### Phase 2: TDD First-Command Rule

- **2A (First-Command Rule):** Added hard-enforced rule to GATES.md TDD Workflow: agent's FIRST `run_in_terminal` after GO confirmation MUST be baseline test command. Any `edit_file`/`create_file` before baseline → TDD sequence violated. Targets TDD Adherence 1.99 → 2.03.

#### Phase 3: TDD Example L Enhancement

- **3A (Full TDD Flow Addendum):** Appended complete score 3 TDD terminal flow to Example L in EXAMPLES.md. Shows Step 0 baseline → Step 2 RED with terminal paste → Step 4 GREEN sequence. Includes compact TEST block citation format. Note: every Step 0/2/4 is a separate `run_in_terminal` call.

#### Phase 4: LEARN Friction Quality Enhancement

- **4A (Friction Self-Check):** Added 2-point mechanical self-check to GATES.md Friction section. Checks TEST self-check gaps and TDD deviation from GO Plan before writing Friction. Status triplet format `(tests: X, TDD: X, citations: X)` makes "None" require verification evidence.

#### Phase 5: Rubric Alignment (2 gaps)

- **5A (GO §6.3 Plan-TDD Prefix):** Amended SIMULATION_PLAN.md §6.3 score 3 to require Plan field beginning with TDD steps when Test-first: Y at QCS 2+. Aligns rubric to GATES.md Plan definition.
- **5B (OPEN §6.1 Mode-Selection Reference):** Amended SIMULATION_PLAN.md §6.1 score 2 to reference mode-selection decision tree for wrong Mode assessment. Aligns rubric to Phase 1 addition.

#### Phase 6: Token Recovery — W3-b Self-Test Removal

- **6A (Self-Test Removal):** Removed Self-Test 1-line from copilot-instructions.md Quick Start. All 5 check items fully covered by individual hard rules in GATES.md (OPEN placement, THINK QCS threshold, GO enforcement, CTX requirement, LEARN enforcement). Deferred in v7.8 and v7.9 — now 2 versions stable.

### Deferred to v8.1
- Dead zone redesign (SIM-32, 37, 43 — structural ceilings, requires sim plan changes)
- Protocol Lite Mode (P23 — requires multi-mode regression testing)
- QCS 0 Invisible Ceremony (P16 — requires coupled rubric change)
- Rubric v2 for dead zones (sim plan scope)

### Net Impact (Projected)
- Token Δ: +240 always-loaded (GATES +170, EXAMPLES +100), −30 removed (copilot-instructions), +50 lazy-loaded (SIMULATION_PLAN)
- Gate: 80.43% → 80.54% (+0.11pp)
- Substance: 69.75% → 69.99% (+0.24pp)
- CE: 77.19% → 77.32% (+0.13pp)
- Active rule files: 18 (unchanged)

---

## [v7.9.0] - 2026-02-13

### Changed — Substance Acceleration III: Rubric Alignment + TDD Evidence + LEARN Targeting

**Strategic context:** v7.8 achieved 80.39% (L4) with gate growth deeply plateaued (+0.02pp). The 11.0pp gate-substance gap is the primary growth vector. v7.9 pivots to rubric-first substance acceleration: aligning SIMULATION_PLAN rubrics to v7.5-v7.8 spec additions, adding TDD evidence scoring guidance, enriching LEARN friction quality, and compressing token overhead.

**Source:** sim-report-050-v7.8-consolidated, 015-protocol-v7.9-implementation-plan.md

#### Phase 1: Rubric Alignment (5 rubric-spec gaps)

- **1A (THINK Edge Case Scoring):** Added edge case listing requirement to §6.2 score 3 for QCS 2+ IMPLEMENT scenarios. Aligns rubric to v7.8 edge case accountability rule.
- **1B (GO TDD Plan Scoring):** Added TDD Plan requirement to §6.3 score 3 when Test-first: Y. Aligns rubric to v7.5 TDD Plan field.
- **1C (TEST RED CHECK + Coverage + Verified):** Restructured §6.4 score 3 to require RED CHECK evidence, coverage delta, and Verified line. Aligns rubric to v7.6-v7.8 TEST additions.
- **1D (LEARN Friction Quality):** Amended §6.6 score 3 to require specific substance observations in Friction field, not generic "None". Aligns rubric to v7.6 Pre-LEARN Substance Self-Check.
- **1E (OPEN CTX Accuracy):** Enhanced §6.1 score 3 to explicitly note CTX file list must match actual tool calls (no phantom files). Aligns rubric to v7.8 CTX accuracy self-check.

#### Phase 2: TDD Evidence Acceleration

- **2A (TDD Score Contrast Table):** Added 3-row scoring quick reference table to GATES.md TDD Workflow section: terminal paste (3), count-only RED CHECK (2), narrative (≤1).
- **2B (Example L — TDD Evidence):** New IMPLEMENT QCS 3 example in EXAMPLES.md showing score 3 vs score 2 TDD evidence side-by-side with explanatory note.

#### Phase 3: LEARN Direct Targeting

- **3A (Friction Field Quality):** Added Friction quality guidance section to GATES.md LEARN gate with good (score 3) vs bad (score 2) examples. Added rule for "None" with substance self-check proof.
- **3B (Example H Enhancement):** Updated Example H Friction field to demonstrate substance self-check evidence pattern.

#### Phase 4: OPEN Targeted Examples

- **4A (Common OPEN Errors):** Added 2 error-pattern examples to GATES.md OPEN section: VERIFY vs IMPLEMENT confusion, and missing mode-shift suffix.

#### Phase 5: Token Management

- **5B (Flexible Confirmation Compression):** Compressed 8-line confirmation list to 2-line inline format. Saves ~50 tokens.

### Deferred to v8.0
- P16: QCS 0 Invisible Ceremony (requires coupled rubric change)
- P23: Protocol Lite Mode (requires multi-mode regression testing)
- W3-b: Self-Test Removal (monitoring for 1 more version)
- Dead Zone Redesign (SIM-43, SIM-32, SIM-37 — structural ceilings)

### Net Impact (Projected)
- Token Δ: +815 tokens net (rubric +145, GATES +150, EXAMPLES +520)
- Gate: 80.39% → 80.44% (+0.05pp)
- Substance: 69.36% → 69.71% (+0.35pp)
- CE: 77.16% → 77.18% (+0.02pp)
- Active rule files: 18 (unchanged)

---

## [v7.8.0] - 2026-02-12

### Changed — Behavioral Pivot: OPEN/GO Format Hedges + Self-Test Compression + Edge Case Accountability

**Strategic context:** v7.7 achieved 80.37% (L4) with gate growth decelerating (+0.13→+0.08→+0.04pp over v7.5-v7.7). Template-oriented changes reaching diminishing returns. v7.8 pivots to format hedges on the two weakest gates (OPEN 2.31, GO 2.43), a de-risked behavioral experiment (Self-Test compression), and a substance bridge (THINK edge case → code accountability).

**Source:** sim-report-047-v7.7-consolidated, 014-protocol-v7.8-implementation-plan.md

#### Phase 1: OPEN Mechanical CTX Accuracy

- **1A (CTX Accuracy Self-Check):** Added 3-step mechanical self-check to GATES.md OPEN CTX section: list tool calls → write exactly those paths → zero calls = empty ctx. Targets OPEN avg 2.31 → 2.34.
- **1B (Follow-Up Default Rule):** Added default-to-tagging rule for `| follow-up` suffix. Over-tagging is cosmetic; under-tagging wastes tokens. Targets SIM-20 Follow-Up.

#### Phase 2: GO Assumptions Inline Prompt

- **2A (Inline Compressed Checklist):** Replaced generic `Assumptions: [list or "None"]` with scan-prompt format: `[scan: library? pattern? naming? scope? gaps?]`. Makes checklist discoverable at output time.
- **2B (Score 2 vs 3 Comparison):** Added quality distinction example showing phantom "None" (score 2) vs explicit choices listed (score 3). Targets GO avg 2.43 → 2.46.

#### Phase 3: Self-Test 1-Line Compression (W3-b Lite)

- **3A (Self-Test Compression):** Compressed 10-line Self-Test section to 1-line equivalent preserving all 5 check items. Saves ~130 tokens from always-loaded Quick Start. De-risked alternative to full W3-b removal.
- **3B (OPEN Placement Hard Rule):** Added `Placement (hard): OPEN must be character-position-0` to GATES.md OPEN section.

#### Phase 4: THINK Edge Case → Code Accountability Bridge

- **4A (Edge Case Accountability Rule):** Added rule to GATES.md THINK section requiring each listed edge case to be handled in code or noted as out-of-scope in GO Assumptions.
- **4B (Verify-Cite Extension):** Extended MODES.md Verify-Cite Rule step 2 to check edge case coverage from THINK. Bridges analysis → implementation.

### Deferred to v7.9
- P16: QCS 0 Invisible Ceremony (requires coupled rubric change)
- QCS 0 Micro-Task Table Simplification (no evidence of current confusion)

### Net Impact (Projected)
- Token Δ: +115 additions, −145 removals (net −30/session)
- Gate: 80.37% → 80.54% (+0.17pp)
- Substance: 69.2% → 69.32% (+0.12pp)
- CE: 77.1% → 77.18% (+0.08pp)
- Active rule files: 18 (unchanged)

---

## [v7.7.0] - 2026-02-12

### Changed — TEST Gate Mechanical Templates + Worked Examples

**Strategic context:** v7.6 achieved 80.33% (L4) with 68.9% substance (+1.2pp). TDD Adherence at 1.88/3 and Code Correctness at 2.29/3 are the primary growth vectors. v7.7 closes rubric-to-spec gaps via mechanical TEST templates (Verified line, no-framework fallback, TDD transcript scoring distinction) and adds worked examples for stagnant scenarios (Quick Mode, OPEN mode-shift, ELI5 diversity).

**Source:** sim-report-044-v7.6-consolidated, 013-protocol-v7.7-implementation-plan.md

#### Phase 1: TEST Gate Template Alignment

- **1A (Verify-Cite in TEST format):** Added `Verified: [changed-file] matches GO spec — [evidence]` line to both QCS 2+ TEST format templates (with-TDD and without-TDD). Added self-check item 6(f) for Verified line presence. Targets Code Correctness 2.29 → 2.32, Verification Quality 2.08 → 2.11.
- **1B (No-Framework Fallback TEST):** Added `Format — No Test Framework (verified fallback)` template to GATES.md. Shows tool-search-based SKIPPED format that scores 2.5 (vs 2 for unsupported SKIPPED). Targets SIM-44 77.44% → 78.3%.
- **1C (TDD Output Proof Distinction):** Added score 2 vs 3 comparison example to TDD Output Proof section. Shows terminal transcript pasting (score 3) vs narrative-only (score 2). Targets TDD Adherence 1.88 → 1.94.

#### Phase 2: Worked Examples for Stagnant Scenarios

- **2A (Example K — Quick Mode):** New IMPLEMENT QCS 1 quick-mode example in EXAMPLES.md. Shows OPEN+GO+TEST+LEARN only (THINK skipped, ELI5 skipped). Targets SIM-38 77.73% → 78.1%.
- **2B (OPEN Mode-Shift Mini-Example):** Added 2-turn VERIFY→IMPLEMENT shift example to GATES.md OPEN section. Targets Cat 5 Edge Cases +0.3pp, OPEN avg 2.30 → 2.34.
- **2C (ELI5 Diversity Tracking):** Added 3-turn diversity tracking snippet to ELI5 Rules in GATES.md. Shows domain cycling across turns. Targets SIM-49 ELI5 Quality 79.50% → 79.80%.

#### Phase 3: Context Efficiency

- **3A (EXPLAIN.md Lazy-Load):** Added lazy-load annotation to EXPLAIN.md in copilot-instructions.md Reference Index. Saves ~800 tokens/session when /explain not invoked. Targets CE 76.7% → 77.1%.

### Net Impact (Projected)
- Token Δ: +565 file additions, −800/session runtime (net −235/session)
- Gate: 80.33% → 80.62% (+0.29pp)
- Substance: 68.9% → 69.20% (+0.30pp)
- CE: 76.7% → 77.10% (+0.40pp)
- Active rule files: 18 (unchanged)

---

## [v7.6.0] - 2026-02-11

### Changed — Substance Acceleration II + Hygiene

**Strategic context:** v7.5 achieved 80.25% (L4) with 0.06pp R1-R2 spread. Substance growth decelerated to +0.1pp (vs +2.7pp at v7.4) — the gate-substance gap holds at 12.6pp. v7.6 pivots to substance acceleration: verify-cite rule for code correctness, TDD output proof for adherence quality, and worked examples for stagnant scenarios (/checkwork, follow-up). Hygiene pass removes dead LEARNINGS.md, fixes stale diagrams/headers, and deduplicates SESSION↔CONTEXT overlap.

**Source:** sim-report-041-v7.5-consolidated, v7.6-improvement-proposals.md

#### Batch 1: Hygiene

- **P-E:** Deleted LEARNINGS.md (dead file — empty log, stale v5 scenario refs). Superseded by LEARN-PERSIST in GATES.md + `tmp/learn-persist.md`. Updated all references (copilot-instructions.md Reference Index, GATES.md FM-6, ARCHITECTURE.md file tree).
- **P-F:** Fixed ARCHITECTURE.md — removed phantom "Roles: [Role1]→[Role2]→Reviewer" from THINK gate diagram; updated file tree (18 active rule files, v7.6 version); bumped version header 2.0.0 → 7.6.0.
- **P-G:** Deduplicated SESSION.md ↔ CONTEXT.md overlap — phase checkpoint details now canonical in CONTEXT.md §5 only, SESSION.md cross-references. Context-aware escalation triggers now canonical in CONTEXT.md §3 only, SESSION.md cross-references.
- **P-H:** Synced version headers across 6 files: MODES.md (6.7→7.6), SESSION.md (3.4→7.6), EXAMPLES.md (3.5→7.6), CONTEXT.md (1.2→7.6), ARCHITECTURE.md (2.0→7.6), GATES.md (7.5→7.6).
- **P-I:** Pruned CONTEXT.md subagent-heavy intro — replaced §1 with condensed delegation note scoped to current environment. Updated purpose/scope block.

#### Batch 2: Substance Rules

- **P-A (Verify-Cite Rule):** Added to MODES.md IMPLEMENT workflow (new Step 6b). At QCS 2+, after implementation and before TEST gate, re-read changed code and verify it matches GO spec. Cite evidence in TEST block. Targets Code Correctness 2.24 → 2.30.
- **P-B (TDD Output Proof):** Added to GATES.md TDD Workflow Template. RED CHECK and GREEN CHECK must include actual terminal output (failing test name + error, passing confirmation). Moves TDD from "pattern demonstrated" to "output proved." Targets TDD Adherence 1.81 → 1.90.

#### Batch 3: Worked Examples

- **P-C (Example J):** New /checkwork worked example in EXAMPLES.md — VERIFY mode, QCS 2. Shows 3-checklist + gap analysis workflow for Zustand store. Targets SIM-39 77.66% → 79.0%.
- **P-D (Follow-Up Detection):** Added follow-up detection heuristics to GATES.md OPEN gate section. Defines 4 heuristic conditions for `| follow-up` suffix + prior context reference instruction. Targets SIM-20 77.93% → 78.5%.

### Net Impact (Projected)
- Token Δ: ~−50 (hygiene saves offset substance additions)
- Substance: 67.7% → 68.5–69.4% (projected)
- Gate: 80.25% → 80.4–80.6% (projected)
- Rule files: 19 → 18 (LEARNINGS.md removed)

---

## [v7.5.0] - 2026-02-11

### Changed — Maintenance + Rubric Alignment Cycle

**Strategic context:** v7.4 achieved 80.12% (L4) with record 99.9% reproducibility. v7.5 is a maintenance cycle: fix stale references, remove irrelevant context, correct a rubric-spec misalignment (SIM-27), and improve TDD example quality. Gate gains are modest (+0.28pp projected) because the protocol is in the L4 plateau zone; the real value is operational health and CE improvement.

**Source:** sim-report-038-v7.4-consolidated

#### GATES.md — Safe Maintenance (Phase 1)
- W4-b: Removed `| micro` suffix from OPEN gate — QCS:0 already signals micro, suffix was redundant
- P18: Replaced TDD Sequencing Rule duplication in MODES.md with cross-reference to GATES.md §TDD Workflow Template
- P20: Added auto-write rule to LEARN-PERSIST section — LEARN entries now append to `tmp/learn-persist.md` with ISO timestamp

#### MODES.md — Dedup + Table Compression (Phase 1)
- Replaced TDD Sequencing Rule (7-line duplication) with cross-reference to GATES.md
- Removed redundant Test-First Enhancement table (superseded by GATES.md TDD Workflow)
- W1-d: Converted Common Transitions table to inline list format

#### SIMULATION_PLAN.md — Rubric Alignment (Phase 2)
- Updated Protocol Version header from 7.3.0 to 7.4.0
- SIM-27: Fixed rubric-spec misalignment — "5-Phase" → "4-Step" to match actual /debug command spec (GATHER → HYPOTHESIZE → TEST → CONFIRM)
- SIM-27: Removed phantom DOCUMENT phase from pass criteria; tmp/debug-plan.md marked as quality bonus
- SIM-27: Updated Phase Sequence behavioral score 3 criteria from "all 5 phases" to "all 4 steps per MODES.md spec"

#### copilot-instructions.md — Flutter Lazy-Load (Phase 3)
- Replaced Flutter/Dart Commands table (5 rows) with conditional lazy-load reference
- Added COMMANDS.flutter.md to Reference Index with `*(conditional: only loaded when pubspec.yaml present)*` annotation
- Saves ~342 lines (~1,370 tokens) for non-Flutter repos

#### EXAMPLES.md — RED CHECK + Example I (Phase 4)
- Updated RED CHECK lines in Examples B and H to include test names for TDD traceability
- Example B: `RED CHECK: 2 new → [renders logout when auth'd, calls signOut on click]`
- Example H: `RED CHECK: 4 new → [under-limit-allows, at-limit-blocks-429, ...]`
- NEW: Example I (QCS 1 boundary) — demonstrates GO micro-format for behavior change at QCS 1

---

## [v7.3.0] - 2026-02-10

### Changed — Substance Deepening + CE Recovery Phase

**Strategic context:** v7.2 achieved 80.0% (L4) and broke the 4-version substance freeze (+5.5pp → 63.7%). v7.3 deepens substance improvement via TDD RED CHECK mechanical enforcement and coverage comparison templates, resumes CE targeting (stalled at 72.2% since v7.2 allocated zero CE effort), and calibrates first-generation scenarios SIM-48/49 to compress reproducibility spreads.

**Source:** sim-report-034-v7.2-consolidated

#### GATES.md — TDD RED CHECK Step + Rule (P0)
- Added Step 2b `RED CHECK` to TDD Workflow Template — mechanical output format: `RED CHECK: [N] new test(s) failing → proceed`
- Added RED CHECK Rule (hard-enforced): 0 new failures triggers mandatory test rewrite; persistent failure noted in LEARN Friction
- Split TEST gate format into TDD variant (`RED:` / `GREEN:` lines) and non-TDD variant (`Run:` line)

#### GATES.md — Coverage Comparison Guidance (P1)
- Added coverage comparison guidance with per-file optional extension: `Coverage: 78% → 82% (+4%), changed: [auth.ts 85→94%]`
- Defined minimum for score 3: Baseline + Final + signed delta, all from terminal output
- Added self-check item 6(e): verify Coverage line has all three components

#### CONTEXT.md — Checkpoint Worked Examples (P1)
- Added Escalation Trigger worked example — demonstrates checkpoint with `escalation: Turn 8` in Status field
- Added Session Break worked example — shows in-progress checkpoint for Turn 12+/context-save scenarios
- Both examples follow 4-field format (Status, Key finding, Output file, Next step)

#### SIMULATION_PLAN.md — SIM-48 TDD Workflow Calibration (P2)
- Added half-point scores (1.5, 2.5) to TDD Workflow sub-rubric for finer-grained scoring
- Score 1.5: RED observed but RED CHECK not explicit, or no rewrite on 0 failures
- Score 2.5: RED CHECK + GREEN shown but missing baseline or Plan case mismatch
- Added calibration guidance with expected R1/R2 score ranges and ≤2.5pp target spread

#### SIMULATION_PLAN.md — SIM-49 ELI5 Consistency Rule (P2)
- Added scoring consistency rule for 2/3 boundary: requires ALL three turns unique, not 2/3
- Prevents R1/R2 spread from interpretation variance at domain uniqueness boundary

#### SIMULATION_PLAN.md — Checkpoint Discipline (P2)
- Tightened score 2/3 boundary: score 3 now requires escalation trigger annotation in Status field when trigger is visible
- Compliance target bumped: 79.2% → 80.0% (L4)

#### EXAMPLES.md — Example B Updates (P2)
- Added `RED CHECK: 2 new test(s) failing → proceed` after RED phase terminal output
- Updated TEST block to TDD format (RED:/GREEN: lines instead of single Run: line)
- Added ELI5 domain annotation `(domain: building)` to demonstrate tracking

---

## [v7.2.0] - 2026-02-10

### Changed — Substance Breakout Phase

**Strategic context:** Substance score frozen at 58.2% for 4 consecutive versions (v6.8-v7.1), creating a 21.5pp gap to gate compliance (79.7%). v7.2 is the first version to directly target substance improvement via TDD workflow templates, edge-case prompting, substance self-checks, and ELI5 quality enforcement. Same template-driven approach that delivered +12.4pp CE in v7.1.

**Source:** sim-report-031-v7.1-consolidated

#### GATES.md — GO TDD Plan Field (P0)
- Added `TDD Plan` field to GO gate for IMPLEMENT mode (QCS 2+, when Test-first: Y)
- Format: `Test file: [path], Cases: [case1, case2, ...], Strategy: RED→GREEN`
- Creates accountability: TEST gate must show TDD Plan cases executing

#### GATES.md — TDD Workflow Template (P0)
- Added new `TDD Workflow Template` section between GO Output Routing and TEST Gate
- 7-step mechanical workflow: Baseline → Write failing tests → RED → Implement → GREEN → Refactor → Confirm GREEN
- Hard rules: minimum 3 terminal calls for test commands, RED→GREEN progression required
- Self-check before TEST gate: verify terminal history shows RED→GREEN

#### GATES.md — THINK Edge Cases (P1)
- Added `Edge cases:` sub-field for IMPLEMENT mode at QCS 2+ after Approach
- Minimum 2 edge cases from evidence (null inputs, empty collections, async, errors, boundaries)

#### GATES.md — TEST Substance Check (P1)
- Added step 6 to TEST self-check: substance verification requiring verbatim quotes, RED→GREEN progression, coverage numbers

#### GATES.md — Pre-LEARN Substance Self-Check (P0)
- Added 3-point substance check before LEARN block (IMPLEMENT mode, QCS 2+)
- Checks: test execution, tool citation, TDD compliance
- Friction from check is REQUIRED in LEARN Friction field

#### GATES.md — ELI5 Enhancement (P2)
- Replaced 6 ELI5 rules with enhanced version:
  - Mandatory WHAT+WHY template
  - Analogy diversity rule (no domain reuse in last 3 responses)
  - QCS-scaled length (1 sentence at QCS 2-3, 2-3 at QCS 6)

#### MCR.md — Edge Cases Section (P1)
- Added `Edge Cases (IMPLEMENT Mode, QCS 2+)` section after What Does NOT Count
- Sources: function signatures, data structures, async code, API calls, numbers

#### EXAMPLES.md — Example B TDD Plan (P2)
- Added TDD Plan line to Example B GO block
- Added quality marker #4: TDD Plan cases match actual tests written

#### SIMULATION_PLAN.md — ELI5 Quality Sub-Rubric (P2)
- Added §6.6.1 ELI5 Quality Sub-Score (0-3 scale)
- Acts as tiebreaker for LEARN score 2→3 boundary at QCS 2+

#### SIMULATION_PLAN.md — SIM-48 Substance-Aware Implementation (P0)
- New Cat 3 scenario: end-to-end TDD workflow validation
- Tests GO TDD Plan, RED→GREEN progression, TEST citations, THINK edge cases, LEARN substance friction
- Includes TDD Workflow sub-rubric (0-3)

#### SIMULATION_PLAN.md — SIM-49 ELI5 Quality (P2)
- New Cat 3 scenario: 3-turn session testing ELI5 diversity and template compliance
- ELI5 Diversity sub-rubric (0-3)

#### SIMULATION_PLAN.md — Dead Zone Escalation §13.4 (P1)
- Added escalation protocol for scenarios below 78% for 3+ versions
- Tiered actions: Watch → Escalate → Accept/Redesign/Remove
- Documented v7.2 dead zone status for SIM-43, SIM-32, SIM-37, SIM-44

#### SIMULATION_PLAN.md — Substance Trajectory (P1)
- Added mandatory substance trajectory table to report output convention
- Shows last 3 versions + current with per-dimension scores

#### SIMULATION_PLAN.md — Category Rebalance (P1)
- Cat 1: 23% → 21%, Cat 3: 14% → 16% (absorbs 2 new scenarios)
- MVT set: SIM-42 replaced by SIM-48 (substance validation is now primary concern)
- Scenario count: 47 → 49

---

> **Archive:** For versions prior to v7.2.0, see [docs/changelog-archive.md](../../docs/changelog-archive.md)
> **Historical Archive:** For versions v1.0-v4.14, see changelog-archive.md (consolidated into single archive).

<!-- Last updated: 2026-02-10 -->
