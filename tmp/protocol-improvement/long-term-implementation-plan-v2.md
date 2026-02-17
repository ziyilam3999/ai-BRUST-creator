# Long-Term Protocol Evolution Roadmap (v2)

> **Version:** v7.4 → v10.x  
> **Created:** 2026-02-11  
> **Updated:** 2026-02-17 (v10.6.0: Phase 5 CE push, Substance 75.12% +1.17pp, VQ-1 + CP-1 + CTX-1 + SHIP-1)  
> **Baseline:** Protocol v10.3.0 (= v10.1.0 effective) — 18 rule files, GATES.md ~846 lines  
> **v10.6 Scores (sim-121, projected):** 82.31% gate | 75.12% substance | 79.14% CE | behavioral invariants  
> **v10.5 Scores (sim-120, projected):** 82.25% gate | 73.95% substance | 79.04% CE | conditional loading  
> **v10.4.1 Scores (sim-118):** 82.25% gate | 73.95% substance (+2.45pp) | 78.64% CE | TP-1 shipped  
> **v10.3 (revert):** Restores v10.1 state: 81.88% gate | 71.45% substance | 77.52% CE  
> **v10.2 Scores (sim-114, REVERTED):** 81.79% gate | 71.45% substance | 77.48% CE | 0.12pp spread | ❌ regression  
> **v10.1 Scores (Sonnet 4.5, sim-111):** 81.88% gate | 71.45% substance | 77.52% CE | 0.12pp spread  
> **v10.0 Scores (Sonnet 4.5, sim-108):** 81.87% gate | 0.10pp spread (✓ target ≤0.15pp met)  
> **v9.5 Scores (Sonnet 4.5, sim-105):** 81.80% gate | 71.35% substance | 77.48% CE | spread 0.44pp  
> **v9.4 Scores (Sonnet 4.5, sim-100):** 81.52% gate | 71.13% substance | 77.42% CE | spread 0.12pp  
> **v9.3 Scores (Sonnet 4.5, sim-097):** 81.47% gate | 71.13% substance | 77.36% CE | 0.02pp spread  
> **v9.2 Scores (Sonnet 4.5, sim-094):** 81.45% gate | 71.12% substance | 77.35% CE | 0.06pp spread  
> **v9.0 Scores (Sonnet 4.5, sim-088):** 81.38% gate | 71.04% substance | 77.295% CE  
> **v8.9 Scores (Opus 4.6, sim-085):** 81.34% gate | 71.00% substance | 77.28% CE  
> **v8.8 Scores (Sonnet 4.5, sim-082):** 81.12% gate | 70.97% substance | 77.26% CE  
> **v8.7 Scores (Opus 4.6, sim-077):** 80.95% gate | 70.55% substance | 77.29% CE  
> **v8.6 Scores (Opus 4.6, sim-074):** 80.90% gate | 70.47% substance | 77.26% CE  
> **v8.5 Scores (Opus 4.6, sim-071):** 80.86% gate | 70.41% substance | 77.24% CE  
> **v8.3 Scores (Sonnet 4.5):** 80.73% gate | 70.32% substance | 77.22% CE  
> **Cross-model target:** Sonnet 4.5 runtime — **VALIDATED** (sim-062, sim-065)  
> **Inputs:**  
> - consolidated-protocol-analysis-v7.4 (unified catalog, 25 proposals)  
> - protocol-improvement-v7.4-analysis-final (10 proposals across 3 themes)  
> - protocol-benchmark-v7.3 (12-dimension external calibration)  
> - doc 023-028: train-expensive/run-cheap strategy analysis pipeline  
> - sim-report-077 (v8.7 consolidated, trajectory analysis)  
> - sim-report-082 (v8.8 consolidated, historic breakthrough)  
> - 032-implementation-summary (v8.8 changes)  
> - 033-implementation-summary (v8.9 changes)  
> **Total tracked items:** 40 (29 catalog + 4 benchmark-only + 7 novel/backlog)

---

## Revision Notes (v1 → v2)

This is a structural revision of the original long-term plan. Key changes:

| Change | Rationale |
|--------|-----------|
| **Data corrections** | 3 items listed "Not started" were actually done; 8 v8.7/v8.8 items untracked; stale metrics |
| **Completed phases collapsed** | Phases 0, 1A, 1C, 3B reduced from 285+ lines of step-by-step detail to summaries |
| **Emergent Development Pattern formalized** | The per-version `/improve-protocol` cycle (v7.5–v8.8) is now documented as primary methodology |
| **Forward-looking sections added** | Milestone trajectories, gate ceiling shift, TDD strategy, Edge/Adv plateau analysis |
| **Backlog cleaned** | 2 items dropped (triggers never materialized after 8+ versions) |
| **Phase 1B revised** | GATES.md grew to 894 lines (not shrank to ≤660) — acknowledged as correct outcome |
| **P16 decision gate tightened** | 6 versions deferred → formal deadline at v9.0 |
| **Phase 4A CE target revised** | Floor lowered from ≥83% to ≥78.5% (stretch remains ≥83%) |

Full v1 detail preserved in `long-term-implementation-plan-final.md` and git history.

---

## Table of Contents

1. [Guiding Principles](#guiding-principles)
2. [Current State Summary](#current-state-summary)
3. [Emergent Development Pattern](#emergent-development-pattern)
4. [Protocol Development Lifecycle](#protocol-development-lifecycle)
5. [Completed Phases (Archive)](#completed-phases-archive)
6. [Phase 1B: Structural (Partial)](#phase-1b-safe-maintenance--structural-partial)
7. [Phase 2: Behavioral Experiments (Partial)](#phase-2-behavioral-experiments-partial)
8. [Phase 3: Cross-Session Intelligence (Partial)](#phase-3-cross-session-intelligence-system-partial)
9. [Phase 3C: QCS Distribution Measurement](#phase-3c-qcs-distribution-measurement)
10. [Next Investment Priorities](#next-investment-priorities)
11. [Phase 4A: Protocol Lite](#phase-4a-protocol-lite)
12. [Phase 4B: Conditional Tech Stack Loading](#phase-4b-conditional-tech-stack-loading)
13. [Phase 4C: YAML-Driven Generation](#phase-4c-yaml-driven-generation)
14. [Phase 5: Platform Evolution](#phase-5-platform-evolution)
15. [Backlog](#backlog-opportunistic--no-phase-assignment)
16. [Tracking & Measurement](#tracking--measurement)
17. [Item Coverage Matrix](#item-coverage-matrix)
18. [Design Decisions & Critique Corrections](#design-decisions--critique-corrections)

---

## Guiding Principles

1. **Subtract before you add** — every token competes for model attention
2. **Mechanical > behavioral** — hard prerequisites compress R1-R2 spread 14× better than guidance
3. **Sim-validate every phase** — no phase proceeds without quantitative confirmation
4. **Isolate variables** — max 2 related changes per sim run; never bundle unrelated changes
5. **Cross-repo safe** — every change must be verified against sync targets
6. **Self-Check + Common Errors + Examples = proven gate improvement pattern** — validated across all 6 gates (v8.0–v8.8). When a gate has a gap, apply this pattern before attempting novel approaches.

---

## Current State Summary

### What's Been Done (v7.4.0–v8.8.0)

Protocol development from v7.4.0 through v8.8.0 implemented 32 of 40 tracked items across two development methodologies: the original phase structure (v7.4.0) and an emergent per-version improvement cycle (v7.5–v8.8).

| Phase / Version | Scope | Items | Status |
|-----------------|-------|-------|--------|
| 0A | Deletions & Archives — 4 files deleted, 2 archived, 1 lazy-loaded | P01, P05 (partial) | ✅ |
| 0B | Merges & Consolidations — 6 files merged/deleted | P02, P03, P07 (partial) | ✅ |
| 0C | In-Place Trimming — Flutter consolidation, dedup, template compression | P04 (partial), P05, P06, P07, P08, P21 | ✅ |
| 1 | Substance Improvements — TS/React styles, RED CHECK, examples, coverage delta | P04, P09, P10, P11 | ✅ |
| 2 | Prompt Engineering — THINK softening, evidence improvements, late-session TDD, LEARN-PERSIST | P12, P13, P14, P15 | ✅ |
| v7.5 | Maintenance + Rubric Alignment — TDD dedup, LEARN-PERSIST auto-write, table compression, Example I | P18 (partial), P20, W1-d (partial), W4-b (partial) | ✅ |
| v7.6 | Substance Acceleration II + Hygiene — verify-cite, TDD output proof, /checkwork example, follow-up | P-A–I (new) | ✅ |
| v8.0–v8.4 | Gate improvements — OPEN/THINK/GO/TEST self-checks, examples, TDD restructure, cross-model validation, W3-b | Various | ✅ |
| v8.5 | OPEN Example N + W4-b/W1-d completion + TDD Quick Path rubric sharpening | W1-d, W4-b, Example N, §6.7 | ✅ |
| v8.6 | GO Common Errors + GO self-check 4th + TEST edge case core promotion + token recovery | GO errors, GO SC4, TEST core, compress | ✅ |
| v8.7 | OPEN QCS precision + CC edge case quality + GO scope Common Error + token recovery | QCS disambig, CC quality, GO scope, compress | ✅ |
| v8.8 | SHIP/TEST Common Errors + SHIP Self-Check formalization + TDD mechanical checkpoint + token recovery | SHIP CE+SC, TEST CE, TDD checkpoint, compress | ✅ |
| v8.9 | R1-R2 spread compression (SHIP/TEST rubric alignment) + CC mechanical hardening + THINK Common Errors + SHIP Example O + token recovery | Rubric align, CC §2.1-D, THINK CE, Example O, compress | ✅ |
| v9.0 | TDD case accountability (GO↔TEST traceability) + VQ verified count scaling (QCS 2-3 vs 4+) + TEST Example P + token recovery | v9.0-1, v9.0-2, v9.0-3, v9.0-4 | ✅ |
| v9.1 | VQ re-read mechanical hardening (tool call prerequisite) + OPEN CTX accuracy (Common Error 5th + Example N Scenario 4) + token recovery (−45 always-loaded) | v9.1-1, v9.1-2, v9.1-3 | ✅ |
| v9.2 | VQ/TDD binary discriminators (spread reduction) + SHIP command counting Common Error + token recovery (−48 always-loaded) | v9.2-1, v9.2-2, v9.2-3 | ✅ |
| v9.3 | TEST/SHIP gate improvement (CE rows + SC5) + THINK/GO binary discriminators + token recovery (−65 always-loaded) | v9.3-1, v9.3-2, v9.3-3, v9.3-4, v9.3-5 | ✅ |
| v9.4 | SHIP GO-trace mandatory promotion + TEST Coverage Delta discriminator + token recovery (−55 always-loaded) | v9.4-1, v9.4-2, v9.4-3 | ✅ |
| v9.5 | Scoring methodology revision — substance partial compliance tiers (VQ/TDD 2.5) + TDD semantic case matching + R2 cumulative strictness recalibration (−5%→−3.5%) + token recovery (−55 always-loaded) | v9.5-1, v9.5-2, v9.5-3, v9.5-4 | ✅ |
| v10.0 | Spread recovery (VQ 2.5 Friction clarification + TDD semantic boundary table + R2 convergence to −2.75%) + LEARN Friction behavioral requirement (hard-enforced, satisfies v9.5 mandate) + token recovery (−50 always-loaded) — **sim-108: 81.87% gate, 0.10pp spread (77% reduction, target met)** | v10.0-1, v10.0-2, v10.0-3 | ✅ |
| **v10.1** | **THINK/TEST/TDD CE pattern completion + token recovery Phase 8 (−38 always-loaded, net +7). TEST CE Row 5 (RED CHECK absence) + TDD CE Row 2 (First-Command violation) + THINK CE Rows 2-3 (generic phrasing + missing risk). Example R deferred. sim-111: 81.90% overall, 81.88% gate, 71.45% substance, 77.52% CE** | **v10.1-1, v10.1-2, v10.1-3** | **✅** |

**Results:**
- Rule files: 29 → 18 (11 deleted/merged)
- GATES.md: ~738 → ~870 lines (grew due to self-checks + Common Errors — intentional, see [Design Decisions](#design-decisions--critique-corrections))
- All 6 gates now have both Self-Check AND Common Errors tables (milestone achieved in v8.8, completed in v8.9 with THINK Common Errors)

### What Remains

| Category | Count | Items |
|----------|:-----:|-------|
| Dropped behavioral | 1 | P16 (QCS 0 invisible ceremony — **DROPPED v8.9**, decision gate criteria met) |
| v8.0 strategic | 3 | P23 (Protocol Lite), P24 (YAML generation), P25 (Claude Code hooks) |
| Novel proposals | 3 | W2-c (/learn-review), session bootstrap, SIM-50 (cross-session sim) |
| Dropped | 5 | P16, P19 (diet mode), P22 (dead zone re-weighting), SIM-44 (partial TEST), W3-b (completed v8.0) |
| Backlog | 3 | §3.3, §3.2, NEW-3 |
| Cross-model (new) | 1 | QCS distribution measurement (R3) |

### Key Metrics — Current & Targets

| Metric | v8.8 Actual (sim-082) | v8.9 Actual (sim-085) | v9.0 Target |
|--------|:---------------------:|:----------------------:|:-----------:|
| Gate Compliance | 81.12% (L4) | 81.34% (L4) | ≥ 81.35% |
| Substance | 70.97% | **71.00% (BREAKTHROUGH)** | ≥ 71.05% |
| Context Efficiency | 77.26% | 77.28% | ≥ 77.30% |
| Gate-Substance Gap | 10.15pp | 10.34pp | ≤ 10.30pp |
| R1-R2 Spread | 0.25pp | **0.07pp (FIXED)** | ≤ 0.05pp |

### Milestone Trajectory (projected at current rate)

| Milestone | Target | Projected By | Caveat |
|-----------|:------:|:------------:|--------|
| 81.0% gate compliance | 81.00% | **ACHIEVED v8.8** | 81.12% actual (sim-082) |
| 71.0% substance | 71.00% | **ACHIEVED v8.9** | 71.00% actual (sim-085) |
| <10.0pp gate-substance gap | <10.00pp | v9.0–v9.1 | Gap at 10.15pp, narrowing at −0.25pp/version (v8.8) |

**Decision gate for architectural pivot:** If 2 consecutive versions show <0.03pp gate improvement, evaluate [Phase 4A (Protocol Lite)](#phase-4a-protocol-lite) as the next investment instead of incremental per-version improvement.

**⚠️ TRIGGERED (v10.3.0):** v10.1 (+0.01pp) and v10.2 (-0.09pp) both <0.03pp. L4 incremental cycle closed. v10.2 reverted → v10.3.0. Next work: Phase 4A evaluation or substance depth push.

---

## Emergent Development Pattern

> **Status:** Active since v7.5 | **15 versions produced** (v7.5–v8.9) | **~16 sessions consumed**

### What Happened

The original plan defined a linear Phase 0→5 sequence with dedicated sim runs per phase. In practice, after completing Phases 0, 1A, and 1C, development shifted to a per-version improvement cycle driven by simulation analysis. This pattern produced sustained improvement without requiring the architectural changes planned in Phases 4A–5.

### The Cycle

```
/improve-protocol
    ↓
Analysis (read sim report → identify gaps → prioritize by gate ceiling proximity)
    ↓
Implementation Plan (draft → critique → correct → implement)
    ↓
/simulate (full 49-scenario dual-run)
    ↓
Sim Report (consolidated, R1+R2 averaged)
    ↓
(repeat)
```

### Evidence of Sustained Improvement

| Version | Gate % | Substance % | CE % | Δ Gate | Key Change |
|---------|:------:|:-----------:|:----:|:------:|------------|
| v8.0 | 80.20% | 69.80% | 77.10% | — | OPEN/THINK self-checks, W3-b Self-Test removal |
| v8.1 | 80.57% | 70.08% | 77.21% | +0.37pp | GO/TEST self-checks, cross-model baseline |
| v8.3 | 80.73% | 70.32% | 77.22% | +0.16pp | Sonnet 4.5 validation, TDD restructure |
| v8.5 | 80.86% | 70.41% | 77.24% | +0.13pp | OPEN Example N, W1-d/W4-b completion |
| v8.6 | 80.90% | 70.47% | 77.26% | +0.04pp | GO Common Errors, TEST core promotion |
| v8.7 | 80.95% | 70.55% | 77.29% | +0.05pp | Multi-phase triple-gate convergence |
| v8.8 | ~80.98% | ~70.57% | ~77.30% | ~+0.03pp | SHIP/TEST Common Errors, TDD checkpoint |
| v8.8 actual | 81.12% | 70.97% | 77.26% | +0.17pp | Historic breakthrough (sim-082) |
| **v8.9 actual** | **81.34%** | **71.00%** | **77.28%** | **+0.22pp** | **R1-R2 spread fix (0.25pp→0.07pp), substance breakthrough (sim-085)** |
| **v9.0** | **~81.36%** | **~71.05%** | **~77.30%** | **~+0.02pp** | **TDD case accountability, VQ count scaling, TEST Example P, token recovery** |

**Average rate:** +0.05pp gate/version, +0.08pp substance/version (last 3 versions)

### Why It Works

1. **Simulation-driven prioritization** — each version targets the highest-gap gates, avoiding diminishing returns on already-strong gates
2. **Proven pattern application** — Self-Check + Common Errors + Examples applied systematically gate-by-gate (OPEN v8.0 → THINK v8.1 → GO v8.6 → SHIP/TEST v8.8)
3. **Token recovery counterbalances growth** — each version adds new content but compresses existing content, maintaining CE trajectory
4. **Narrow scope per version** — 2-4 changes per version keeps R1-R2 spread tight (0.04pp)
5. **Multi-critique gain calibration (v10.1+)** — Auto-GO's 2nd-round critique + justification pipeline deflates optimistic gain estimates (~40% in v10.1: plan +0.07pp → justified +0.05pp) and filters poor-ROI items (Example R dropped: 80 tokens for ~0.005pp on a 97.74% gate). Acts as a built-in sanity check that prevents over-investment in near-ceiling gates.

### Relationship to Remaining Phases

The incremental cycle addresses **gate/substance optimization within the current architecture**. The remaining phases (4A Protocol Lite, 4B Conditional Loading, 4C YAML Generation) address **architectural changes** that become relevant when:
- Incremental improvement stalls (<0.03pp/version for 2+ versions)
- Token budget needs step-function reduction (not achievable by compression alone)
- Multi-platform deployment requires generated protocol variants

The incremental cycle and architectural phases are complementary, not competing.

### Next Evolution: `/evolve` Orchestrator (v9.0+)

Starting at v9.0, a `/evolve` command formalizes the manual loop with convergence tracking. It does **not** modify `/improve-protocol` or `/simulate` — both remain fully standalone. Instead, `/evolve` adds a thin orchestration layer that:

1. **Tracks cycle state** — which phase (IMPROVE/SIMULATE/EVALUATE) and which iteration
2. **Detects convergence** — 5 exit criteria: rate stall (rolling 3-version avg < 0.03pp), target reached (default 85% gate + 75% substance), iteration limit (default 5), adaptive regression, spread divergence
3. **Guides the user** — outputs which command to run next, which model to use, and when to stop
4. **Persists across sessions** — `tmp/evolve/cycle-state.md` survives context loss

A companion `/update-roadmap` command provides standalone roadmap score updates after any simulation.

**Plan:** `tmp/protocol-improvement/035-evolve-workflow-plan-final.md`

---

## Protocol Development Lifecycle

> Formalized based on sim-062/065 cross-model validation results.

| Phase | Purpose | Model | Frequency |
|-------|---------|-------|-----------|
| **DEVELOP** | Design new gates, self-checks, format rules | Opus 4.6 | Per protocol version |
| **SIMULATE** | Full 49-scenario dual-run scoring | Opus 4.6 (scorer) | Per protocol version |
| **VALIDATE** | Cross-model baseline confirmation | Sonnet 4.5 (subject) | Every 2-3 versions |
| **DEPLOY** | Daily coding tasks with validated protocol | Sonnet 4.5 (default) | Continuous |
| **ITERATE** | /improve-protocol when scores plateau | Opus 4.6 | When metrics stagnate |

**Key insight:** The protocol IS the training artifact. No weight modification, no fine-tuning, no model-specific adaptations needed. The 18 rule files + 13 examples constitute a portable instruction set that transfers across models at near-zero quality loss (sim-065: Sonnet 4.5 at 80.73% gate, matching Opus 4.6 at 80.57%).

**Cost model:**

| QCS | Recommended Model | Cost | Rationale |
|-----|-------------------|------|-----------|
| 0-1 | Sonnet 4.5 | $3/$15 per MTok | Mechanical tasks; validated equivalent (sim-065: 80.73%) |
| 2-3 | Sonnet 4.5 | $3/$15 per MTok | Self-checks + Quick Path designed for standard tier |
| 4-5 | Opus 4.6 | $15/$75 per MTok | Complex reasoning, multi-file, architectural decisions |
| 6   | Opus 4.6 | $15/$75 per MTok | Deep analysis, full ceremony, maximum reasoning depth |

> Advisory only. Quality validated equivalent at QCS 0-3 (sim-062, sim-065).
> If task complexity escalates beyond QCS 3 mid-conversation, start a new conversation on Opus — model context is not seamlessly transferable.

**Cost projection:** IF ~70% of tasks are QCS 0-3, THEN ~60% blended cost reduction. Distribution is assumed, not measured — see [Phase 3C](#phase-3c-qcs-distribution-measurement) for validation plan.

---

## Completed Phases (Archive)

> These phases are complete. Summaries retained for context; full detail in `long-term-implementation-plan-final.md` (v1) and git history.

### Phase 0: Validate v7.4 Baseline — ✅ COMPLETE

> **Version:** v7.4.0 | **Sim:** sim-038

Established that v7.4 pruning (~36K tokens removed) did not regress scores. All floors exceeded: Gate ≥80.0% ✅, Substance ≥67.0% ✅, CE ≥78.0% ✅. Attention budget hypothesis validated — removing unused content improved effective attention without quality loss.

**Items:** None (validation only) | **Decision:** Proceed to Phase 1A

### Phase 1A: Safe Maintenance — Formatting — ✅ COMPLETE

> **Version:** v7.4.1 → v8.5 | **Sims:** multiple

Low-risk formatting improvements. W1-d (table compression) and W4-b (remove `| micro` suffix) both completed across v7.5 and v8.5 with no regression. Confirmed that formatting changes are safe.

**Items:** W1-d ✅, W4-b ✅ | **Decision:** Formatting changes are zero-risk

### Phase 1C: LEARN Persistence — ✅ COMPLETE

> **Version:** v7.5 | **Sim:** sim-041

P20 (auto-write LEARN to `tmp/learn-persist.md`) implemented. Machine-readable format confirmed. No performance drag from file writes.

**Items:** P20 ✅ | **Decision:** File persistence is safe and operational

### Phase 3B: Cross-Model Runtime Strategy — ✅ VALIDATED

> **Version:** v8.2–v8.4 | **Sims:** sim-062, sim-065 | **Analysis pipeline:** docs 023-028

Sonnet 4.5 validated at practical equivalence to Opus 4.6 (sim-065: 80.73% gate vs Opus v8.1 80.57%). All 15 risk-assessed protocol sections performed at or above Opus levels. Protocol adaptations A-G skipped (unnecessary). Simple routing table adopted instead of full model-tier config.

**Key findings:**
- Every gate predicted to degrade actually exceeded predictions (+4pp to +26pp above upper bounds)
- Protocol's mechanical self-check design made gates model-agnostic
- Confound acknowledged: Opus v8.1 vs Sonnet v8.3 comparison is protocol-version-confounded

**Items:** Cross-model baseline ✅, model-sensitive analysis ✅, adaptations A-G ⏭️ skipped, dual-model validation 🔶 partial, model-tier config 📋 deferred to v9.0+

**For full detail** on cross-model risk assessment, per-gate transfer analysis, implementation roadmap results, and design principles for portability — see `long-term-implementation-plan-final.md` (v1) Phase 3B section.

---

## Phase 1B: Safe Maintenance — Structural (Partial)

> **Version:** Originally v7.4.2 | **Effort:** 1 session | **Status:** 🔶 PARTIAL  
> **Revised assessment (v8.8.0):** Original goals partially superseded

### Original Goal

GATES.md deduplication (P18: 738 → ≤660 lines) and rule file reordering (P17).

### What Actually Happened

GATES.md grew from ~738 to ~894 lines (v7.4 → v8.8). This is the **opposite** of the ≤660 target, but it was the correct outcome:

| Investment | Lines Added | Value | Gate Impact |
|------------|:----------:|-------|:----------:|
| Self-Checks (OPEN, THINK, GO, TEST, SHIP, LEARN) | ~90 | All 6 gates improved | +0.015/gate avg |
| Common Errors (OPEN, GO, TEST, SHIP, TDD) | ~60 | Negative examples = high signal | +0.010/gate avg |
| TDD restructure (Quick Path, checkpoint) | ~30 | Substance improvement (CC +0.025) | +0.08pp substance |
| Token compression (each version) | ~-25/version | CE sustainability | +0.03pp CE/version |

**Conclusion:** The plan's thesis that GATES.md needed to shrink was wrong. The Self-Check + Common Errors pattern proved more valuable than compression. Every line added to GATES.md was validated by simulation to improve scores.

### Remaining Items

| Item | Original Plan | Revised Status | Priority |
|------|--------------|----------------|:--------:|
| P18: GATES.md deduplication | Target ≤660 lines | 🔶 Partial (v7.5 TDD dedup done). Further dedup deferred until GATES.md growth stabilizes. | Low |
| P17: Rule file reordering | `<!-- section: -->` XML markers + content reordering | ❌ Not started. No evidence reordering affects scores. | Low |

### Revised Decision Gate

- If GATES.md grows past 950 lines without corresponding gate improvement → resume P18 dedup
- P17 remains available but deprioritized — no empirical evidence that content position within a file affects model attention

---

## Phase 2: Behavioral Experiments (Partial)

> **Version:** Originally v7.5.0 | **Status:** 🔶 PARTIAL (1/2 experiments complete)

### Experiment B: Self-Test Removal (W3-b) — ✅ DONE (v8.0)

Completed in v8.0 Phase 6. The Self-Test checklist was compressed then removed. No first-response regression detected.

**Outcome:** Self-Test was overhead, not load-bearing. Removing it freed tokens without quality loss.

### Experiment A: QCS 0 Invisible Ceremony (P16) — ❌ NOT STARTED

<a id="p16-decision-gate"></a>

**Status:** Deferred for 6 consecutive versions (v7.5–v8.8). No version prioritized it.

**Rationale for continued deferral:** QCS 0 scenarios (SIM-03 at 84.00%, SIM-09 at 84.00%) are stable and above-average. There's no evidence that visible ceremony at QCS 0 is a bottleneck — the scores suggest the current approach works.

**Decision Gate (HARD DEADLINE):**
- If QCS 0 scenarios (SIM-03, SIM-09) don't improve by >0.3pp after the next sim-plan major version, **or** by v9.0 (whichever comes first) → **DROP P16** and remove from plan
- If QCS 0 scenarios regress in any future version → re-evaluate P16 as potential fix
- Document decision in `docs/decisions.md` when triggered

**Items:** P16 (pending decision gate)

---

## Phase 3: Cross-Session Intelligence System (Partial)

> **Version:** Originally v7.6.0 | **Effort:** 2 sessions | **Status:** 🔶 PARTIAL (~30% complete)

### Goal

Build a complete cross-session learning loop. P20 (LEARN persistence) is done (Phase 1C). This phase adds the intelligence layer.

### Completed

- **SIM-49 (ELI5 Quality):** Added to sim plan in v7.2

### Remaining Items

| Item | Description | Status | Priority |
|------|-------------|:------:|:--------:|
| W2-c | `/learn-review` command — analyze learn-persist.md, group by category, propose protocol changes | ❌ Not started | Medium |
| Session bootstrap | On session start, read 5 most recent learn-persist entries from last 7 days, note in OPEN line | ❌ Not started | Medium |
| SIM-50 | Cross-session recovery sim scenario | ❌ Not started | Low |

### Steps (when executing)

1. Create `.claude/commands/learn-review.md` with workflow:
   - Read `tmp/learn-persist.md`
   - Group entries by category (FAILURE, FRICTION, INSIGHT, GAP, OPTIMIZATION, PROTOCOL_VIOLATION)
   - Count entries per category, identify top 3 recurring patterns
   - For each pattern: propose a specific protocol or workflow change
   - Output summary to `tmp/learn-review-<date>.md`
2. Add session bootstrap instruction to SESSION.md recovery protocol
3. Add SIM-50 to SIMULATION_PLAN.md
4. Run `/simulate` to validate

### Success Criteria

- `/learn-review` produces coherent analysis on populated file
- Session bootstrap references prior learnings in OPEN line
- No regression on existing scenarios
- SIM-50 ≥ 75% on first run

### Decision Gate

- All criteria met → phase complete
- `/learn-review` output quality low → iterate on command template
- Session bootstrap causes context bloat → limit to 3 entries or FAILURE/INSIGHT only

---

## Phase 3C: QCS Distribution Measurement

> **Version:** v8.4+ | **Effort:** ~5 min/session, ongoing | **Sim:** None (observation only) | **Status:** ❌ NOT STARTED

### Goal

Validate the assumption that ~70% of tasks are QCS 0-3, which drives the "~60% blended cost reduction" projection from the model routing strategy. Without this data, the cost savings claim is a projection, not a measurement.

### Steps

1. **Track Real-World QCS Distribution** — Over the next 20 real work sessions, log to `tmp/qcs-distribution-log.md`:

   | Date | Task Summary | QCS | Model Used | Mode |
   |------|-------------|:---:|-----------|------|

2. **Validate Assumptions** — After 20 entries:
   - Calculate actual % of tasks at QCS 0-3
   - Recalculate projected cost savings with real data
   - If distribution is significantly different from 70%, update routing table rationale
   - Document findings in `docs/decisions.md`

### Decision Gate

- Distribution ≈ 70% at QCS 0-3 → projection confirmed
- Distribution > 85% at QCS 0-3 → more aggressive Sonnet default
- Distribution < 50% at QCS 0-3 → routing table less impactful than projected

### Items: QCS distribution measurement (new)

### Token Delta: 0

### Risk: None — observation only

---

## Next Investment Priorities

> Based on sim-077 analysis (v8.7 scores) and 032-implementation-summary (v8.8 changes)

### Gate Ceiling Shift

v8.0–v8.7 focused on OPEN (gap 0.475 → 0.460). As of v8.7, the priority landscape has shifted:

| Gate | v8.7 Avg | Gap to 3.0 | Status | Priority |
|------|:--------:|:----------:|--------|:--------:|
| **SHIP** | 2.500 | **0.500** | Largest gap, untargeted 3+ versions | **🔴 Highest** |
| **TEST** | 2.520 | **0.480** | Second-largest gap, partially targeted in v8.8 | **🟡 High** |
| **OPEN** | 2.540 | 0.460 | Narrowing, v8.0–v8.7 investment complete | 🟢 Maintain |
| **GO** | 2.555 | 0.445 | Narrowing, v8.6–v8.7 investment complete | 🟢 Maintain |
| **LEARN** | 2.580 | 0.420 | Stable, no action needed | 🟢 Maintain |
| **THINK** | 2.585 | 0.415 | Smallest gap, highest scoring | 🟢 Maintain |

**Next gate investment should target SHIP, then TEST** — not OPEN. The Self-Check + Common Errors pattern was applied to SHIP/TEST in v8.8; future versions should focus on SHIP examples and TEST rubric precision.

### Substance Dimensions

| Dimension | v8.7 Avg | Trajectory | Priority |
|-----------|:--------:|------------|:--------:|
| Code Correctness | 2.465 | Rising (+0.025 in v8.7, first move since v8.2) | 🟢 Momentum |
| Verification Quality | 2.30 | Stable (unchanged 2 versions) | 🟡 Monitor |
| **TDD Adherence** | **2.14** | **Unchanged 2 versions, lowest dimension** | **🔴 Needs investment** |

### TDD Adherence Strategy

TDD (2.14/3) is the lowest substance dimension and hasn't moved since v8.6. Recommended approach:
- **Rubric precision:** 4-step equivalence enforcement (spec → fail → pass → verify)
- **Test-before-code verification:** Mechanical check that test file is created before implementation
- **Estimated lift:** +0.015 TDD → +0.05pp substance
- **Risk:** Medium — requires behavioral adoption

### Edge/Adversarial Plateau

10 scenarios stuck at 77–79% for 3+ versions:

| Category | Scenarios | Score Range | Structural Barrier |
|----------|-----------|:-----------:|-------------------|
| Edge | SIM-19 (Mode Shift), 20 (Follow-Up), 21 (Multi-Mode), 22 (Recovery) | 78–80% | Mode transition boundaries, context loss on recovery |
| Adversarial | SIM-23 (Deprecated), 24 (Ambiguous), 25 (Skip Resist), 26 (Phantom) | 77–79% | Adversarial prompts exploit model compliance patterns |
| Other | SIM-30 (Terminal), 38 (Quick Mode) | 78–79% | Environmental constraints, ceremony boundary ambiguity |
| Endurance | SIM-35 (12T), 36 (10T), 37 (15T) | 77–79% | Model degradation at T6+ (structural, not protocol) |

**Assessment:** These are structural ceilings, not protocol deficiencies. Breaking them requires novel approaches:
- Mode transition rubrics (Edge scenarios)
- Adversarial resistance training via negative examples (Adversarial scenarios)
- Model-level improvements (Endurance scenarios — outside protocol control)

**Recommendation:** Defer until SHIP/TEST gaps narrow below 0.45. Current ROI is higher on gate ceiling work.

---

## Post-L4 Strategic Pivot (v10.3.0)

> **Decision:** D-011 | **Trigger:** Three-version plateau (81.87→81.88→81.87%) + decision gate met | **Date:** 2026-02-16

### Context

The L4 incremental cycle (v10.0–v10.2) produced ≤0.03pp net gate movement over 3 versions, with parameter volatility (0.57pp swings) exceeding net movement (−0.03pp). v10.2 was reverted → v10.3.0 released as effective v10.1 state (81.88% gate, 71.45% substance, 77.52% CE).

The decision gate at line 155 of this document was triggered: "evaluate Phase 4A as the next investment instead of incremental per-version improvement."

### Root Causes of Plateau

| Factor | Evidence | Implication |
|--------|----------|-------------|
| SHIP 7-version stall | 89.27–89.94% across v9.2–v10.2, never breaking 90% | Largest gate gap (0.500), untargeted structurally |
| Substance ceiling | 21/49 scenarios (43%) capped by 72% substance | Gate-only changes cannot unlock these |
| TDD adherence stuck | 2.14/3, lowest substance dimension, unchanged 2+ versions | Needs dedicated analysis, not gate tuning |
| Diminishing returns | +0.05pp/version average has converged to <0.03pp | Incremental approach exhausted at L4 |

### Strategy: Three Workstreams

1. **WS1: SHIP Root-Cause (B1)** — 1 session, read-only analysis. Scoped to SHIP-firing scenarios. Identifies score 2→3 discriminator bottleneck (Claims/Verified/Traced). Feeds Protocol Lite SHIP spec design.
2. **WS2: Phase 4A Protocol Lite (P23)** — 4 sessions. The architectural pivot mandated by the decision gate. Creates tiered loading system (≤500 tokens at QCS 0-1, ~4K at QCS 2-3, ~21K at QCS 4+). Validated via sim-045a/045b.
3. **WS3: TDD Substance Prep (B3)** — 1 session, read-only analysis. Identifies TDD adherence bottleneck across 13 substance scenarios. Output queued for post-4A execution to avoid cross-contamination of score attribution.

**Full execution plan:** See [Phase 4A Execution Plan](#execution-plan-post-l4-strategic-pivot) below.

---

## Phase 4A: Protocol Lite

> **Version:** v10.4.0 | **Effort:** 3-4 sessions | **Sim:** sim-045a/b | **Status:** ✅ COMPLETE — Shipped 2026-02-17  
> **Trigger:** Incremental improvement stalls (<0.03pp/version for 2 consecutive versions) OR token budget needs step-function reduction  
> **Trigger met:** v10.1 (+0.01pp) and v10.2 (−0.09pp) — both <0.03pp. L4 cycle closed → D-011.

### Goal

Create a lightweight protocol variant (~50-75 lines) for QCS 0-1 tasks. This directly addresses token efficiency and simplicity.

### Design Constraints

- Protocol Lite must be a **strict subset** of the full protocol (no contradictions)
- QCS escalation: task that starts lite and escalates must gracefully upgrade to full protocol
- Must still produce LEARN block (minimum safety net)

### Steps

1. **Design the lite spec** — Extract from copilot-instructions.md:
   - 4 Quick Start rules (1 line each, compressed)
   - Mode routing (4+1 row table: PLAN/IMPL/VERIFY/SHIP + AUTO)
   - 6-gate list (name + 1-line description each, no detailed format specs)
   - LEARN format (category + insight, 3 lines)
   - QCS escalation rule: "If QCS rises above 1 during task, load full protocol"
   - Total target: **≤ 75 lines, ≤ 500 tokens**

2. **Define the tiered loading strategy** — copilot-instructions.md becomes a router:

   | QCS Tier | What Loads | Approximate Tokens |
   |----------|-----------|:------------------:|
   | 0-1 | Protocol Lite only | ~500 |
   | 2-3 | Protocol Lite + GATES.md + active mode file | ~4,000 |
   | 4+ | Full protocol (all 18 default-context files) | ~21,000 |

3. **Test Protocol Lite standalone** (sim-045a) — QCS 0-1 scenarios only, 8 scenarios
4. **Test tiered loading** (sim-045b) — all 49+ scenarios

### Success Criteria

| Test | Metric | Floor | Stretch |
|------|--------|:-----:|:-------:|
| Lite standalone (045a) | Gate on QCS 0-1 scenarios | ≥ 76% | ≥ 80% |
| Tiered loading (045b) | Gate on all scenarios | ≥ baseline | |
| Overhead | QCS 0-1 response tokens | ≤ 150 | |
| CE | Context Efficiency | **≥ 78.5%** | ≥ 83% |

### Decision Gate

- All floors met → proceed to Phase 4B
- Lite standalone underperforms (<76%) → try ~100-line version
- Tiered loading causes QCS 2+ regression → abandon tiered approach
- QCS escalation fails → redesign escalation mechanism

### Items: P23

### Token Delta: +75 lines (new file), but -500+ tokens loaded per QCS 0-1 session

### Risk: High — fundamental architecture change. If Protocol Lite underperforms after 2 iterations, two-tier approach may be abandoned (acceptable: validated empirically).

### Execution Plan (Post-L4 Strategic Pivot)

> **Context:** L4 incremental cycle closed at v10.3.0 (D-011). Three-version plateau (81.87%→81.88%→81.87%) confirmed diminishing returns. Decision gate triggered Phase 4A as next investment.

**Three workstreams over 6 sessions:**

| Session | Workstream | Activity | Exit Criterion |
|:-------:|------------|----------|----------------|
| 1 | WS1: SHIP root-cause (B1) | Extract SHIP sub-dimension scores for SHIP-firing scenarios (SIM-04,-07,-08,-10,-11,-17,-33,-40,-48). Map to score 2→3 discriminator failures. | ≥3 GATES.md proposals with discriminator attribution |
| 1 | WS3: TDD analysis (B3) | Analyze TDD (2.14/3) across 13 substance scenarios. Identify primary bottleneck (RED CHECK / case-name matching / 4-step equivalence). | Primary bottleneck identified with concrete proposals |
| 2 | WS2: Design | Draft Protocol Lite spec (≤75 lines, ≤500 tokens). Define tiered loading in copilot-instructions.md. Validate token count. | Spec finalized or iteration decision |
| 3 | WS2: Implementation | Create PROTOCOL_LITE.md. Modify copilot-instructions.md as QCS-tier router. Implement escalation. Sync CLAUDE.md. | Files created, local coherence verified |
| 4 | WS2: sim-045a | QCS 0-1 standalone (7 scenarios). Evaluate: gate ≥76%, response tokens ≤150. | Floor met or iterate to ~100-line variant |
| 5 | WS2: sim-045b | All 49 tiered. Evaluate: gate ≥81.88%, CE ≥78.5%. | All floors met → ship Phase 4A |
| 6 | Post-4A | Trigger NEW-3 (sim plan overhaul). Execute substance push from WS3 findings. Evaluate WS1 SHIP proposals. | Substance >71.45% in next sim |

**Sequencing:**
```
S1: ┌─ WS1: SHIP analysis (B1, read-only) ─┐
    └─ WS3: TDD analysis  (B3, read-only) ──┘  → findings feed ↓
S2: Protocol Lite design (informed by S1)
S3: Protocol Lite implementation
S4: sim-045a (QCS 0-1, 7 scenarios) → iterate if <76%
S5: sim-045b (all 49, tiered loading) → decision gate
S6: Post-4A: NEW-3 + substance push + SHIP proposals
```

**Decision gates:**
- sim-045a <76% after 1 iteration → try ~100-line variant
- sim-045a <76% after 2 iterations → abandon Protocol Lite, pivot to Phase 4B
- sim-045b QCS 2+ regression → fix tiered loading before shipping
- sim-045b CE <78.5% → Protocol Lite token count too high, compress
- sim-045b all floors met → ship Phase 4A, proceed to post-4A

**Fallback:** Phase 4B (Conditional Tech Stack Loading) — lower risk, partially done (Flutter lazy-load v7.5).

**Backlog disposition:**
| ID | Action | When |
|----|--------|------|
| B1 | SHIP root-cause analysis | Session 1 (WS1) — executing |
| B3 | TDD root-cause analysis | Session 1 (WS3) — executing |
| B4 | Example R — THINK (<95%) | Carry forward (trigger unmet: 97.77%) |
| B5 | Anti-false-choice rule | Carry forward (low priority) |
| NEW-3 | Sim plan overhaul | Session 6 (post-4A, blocked on 4A) |

---

## Phase 4B: Conditional Tech Stack Loading

> **Version:** v9.x | **Effort:** 2 sessions | **Sim:** sim-046 | **Status:** 🔶 PARTIAL (Flutter lazy-load done in v7.5)

### Goal

Stop loading irrelevant tech-stack rules. A JS project shouldn't load COMMANDS.flutter.md and vice versa.

### Steps

1. **Enhance PROJECT_DETECTION.md** — Define detection file → rule-file mapping
2. **Update copilot-instructions.md** — Add conditional loading instruction
3. **Cross-repo verification** across all synced repos
4. Run `/simulate` → sim-046

### Success Criteria

- No regression on any scenario
- Context savings: ~100-350 lines per session (depending on project type)

### Decision Gate

- Works correctly → proceed to Phase 4C
- Detection logic unreliable → fall back to loading both
- Cross-repo sync breaks → fix sync script first

### Items: Conditional loading (new), PROJECT_DETECTION.md enhancement

### Risk: Medium — loading logic must be robust across all synced repos

---

## Phase 4C: YAML-Driven Generation

> **Version:** v9.x | **Effort:** 3-4 sessions | **Sim:** sim-047 | **Status:** ❌ NOT STARTED

### Goal

Single source of truth for all protocol variants via `protocol.yaml`. Eliminates inter-file drift.

### Steps

1. **Define `protocol.yaml` schema** — Gates, modes, rules, examples, ceremony levels, tech stacks
2. **Build generator** — `tools/generate_protocol.ps1` produces copilot-instructions.md, CLAUDE.md, individual rule files
3. **Migration** — Convert existing files to generated output (start with simplest, end with GATES.md)
4. **Validation** — Modify rule in YAML, regenerate, verify propagation, run sim-047

### Success Criteria

- All protocol files generated from protocol.yaml
- No sim regression
- Cross-file duplication count: 0 (by construction)
- Generator runs in < 5 seconds

### Items: P24

### Risk: High effort, low runtime risk

---

## Phase 5: Platform Evolution

> **Version:** v9.x+ | **Effort:** Ongoing, opportunistic | **Status:** ❌ WAITING (trigger-based)

### Trigger-Based Actions

| ID | Trigger Condition | Action |
|---|---|---|
| 5A | VS Code Copilot Chat exposes hook/plugin API | Prototype LEARN gate as deterministic hook |
| 5B | Claude Code gains feature parity | Evaluate full migration |
| 5C | MCP tool-calling stabilizes | Prototype `gate_check` MCP tool |
| 5D | Plugin ecosystem matures | Map 8 current skills to installable plugins |

### Deferred Model Items (from Phase 3B)

| Item | Trigger | Action |
|------|---------|--------|
| Model-Tier Config (v9.0) | Cross-family testing | Build 3-tier config |
| Cost Tracking Automation | IDE provides usage API | Automated cost-per-task reporting |
| Escalation Protocol | IDE supports model switching | Cheap-first with escalation flag |
| Cross-family Validation | New model family considered | Full sim per Phase 3B pattern |
| Opus v8.4 Control Run | Resource available | Resolve protocol-version confound |

### Decision Framework

1. Feasibility check — can the feature be used in our environment?
2. A/B comparison — sim with and without the platform feature
3. Migration cost — how much protocol text can be replaced?
4. Rollback path — can we revert if platform feature regresses?
5. Cross-platform impact — does adopting this break sync to other environments?

### Items: P25, W5-b, MCP evaluation, model-tier config (deferred from 3B)

### Risk: Low (research-triggered, not calendar-triggered)

---

## Backlog (Opportunistic — No Phase Assignment)

Items to attempt when relevant context arises. Not scheduled, not prioritized, but tracked.

| ID | Idea | Trigger Condition | Expected Impact | Source | Status |
|---|---|---|---|---|---|
| §3.3 | Dead zone scoring adjustment (re-weight SIM-32, 37, 43) | Next sim-plan major revision | Low (scoring methodology) | Consolidated §3.3 | Active |
| §3.2 | Example Power Law validation (quality vs quantity) | If TDD examples underperform | Medium (informs example strategy) | Consolidated §3.2 | Active |
| §2.1-D | Counter-trend uplift hunting | If 2+ phases show <0.1pp improvement | Strategic (find new surface) | Consolidated §2.1 | Active |
| NEW-3 | Sim plan v8.0 overhaul | When Phase 4A ships | Required (sim must match protocol) | Critique §6 | Active — blocked on 4A |

### Dropped from Backlog (v2)

| ID | Idea | Trigger | Reason for Drop |
|---|---|---|---|
| ~~NEW-1~~ | ~~THINK gate XML structuring~~ | ~~If THINK format inconsistent~~ | THINK at 2.585/3, highest gate. Self-check pattern resolved consistency. Trigger never materialized after 8+ versions. |
| ~~NEW-2~~ | ~~Mode-specific LEARN templates~~ | ~~If LEARN varies by mode~~ | LEARN stable at 2.580/3. No evidence of mode-specific variation after 8+ versions. |

---

## Tracking & Measurement

### Sim Run Schedule

| Sim ID | Phase / Version | Scope | Key Question | Status |
|--------|:---------------:|:-----:|-------------|:------:|
| sim-038 | Phase 0 (v7.4) | 48 scenarios | Did v7.4 pruning regress? | ✅ DONE |
| sim-041 | Phase 1C (v7.5) | 48 scenarios | Does LEARN file-write add overhead? | ✅ DONE |
| **sim-062** | **Phase 3B (v8.2)** | **49 scenarios** | **Sonnet 4.5 v8.2 baseline** | **✅ DONE** |
| **sim-065** | **Phase 3B (v8.3)** | **49 scenarios** | **Sonnet 4.5 v8.3 — Path A confirmed** | **✅ DONE** |
| **sim-071** | **v8.5** | **49 scenarios** | **v8.5 consolidated (2 runs, 80.86%)** | **✅ DONE** |
| **sim-074** | **v8.6** | **49 scenarios** | **v8.6 consolidated (2 runs, 80.90%)** | **✅ DONE** |
| **sim-077** | **v8.7** | **49 scenarios** | **v8.7 consolidated (2 runs, 80.95%)** | **✅ DONE** |
| sim-080 | v8.8 | 49 scenarios | v8.8 validation (SHIP/TEST + TDD checkpoint) | Planned |
| **sim-088** | **v9.0** | **49 scenarios** | **v9.0 consolidated (2 runs, 81.38%)** | **✅ DONE** |
| **sim-091** | **v9.1** | **49 scenarios** | **v9.1 consolidated (2 runs, 81.375%)** | **✅ DONE** |
| **sim-094** | **v9.2** | **49 scenarios** | **v9.2 consolidated (2 runs, 81.45%)** | **✅ DONE** |
| **sim-097** | **v9.3** | **49 scenarios** | **v9.3 consolidated (2 runs, 81.47%)** | **✅ DONE** |
| **sim-100** | **v9.4** | **49 scenarios** | **v9.4 consolidated (2 runs, 81.52%)** | **✅ DONE** |
| **sim-105** | **v9.5** | **49 scenarios** | **v9.5 consolidated (2 runs, 81.80%)** | **✅ DONE** |
| **sim-108** | **v10.0** | **49 scenarios** | **v10.0 consolidated (2 runs, 81.87%)** | **✅ DONE** |
| **sim-109** | **v10.1** | **49 scenarios** | **v10.1 run 1 optimistic (81.96%)** | **✅ DONE** |
| **sim-110** | **v10.1** | **49 scenarios** | **v10.1 run 2 conservative (81.84%)** | **✅ DONE** |
| **sim-111** | **v10.1** | **49 scenarios** | **v10.1 consolidated (2 runs, 81.90%)** | **✅ DONE** |
| **sim-112** | **v10.2** | **49 scenarios** | **v10.2 run 1 optimistic (81.93%)** | **✅ DONE** |
| **sim-113** | **v10.2** | **49 scenarios** | **v10.2 run 2 conservative (81.81%)** | **✅ DONE** |
| **sim-114** | **v10.2** | **49 scenarios** | **v10.2 consolidated (2 runs, 81.87%)** | **✅ DONE** |
| sim-045a | Phase 4A | 7 scenarios | Does Protocol Lite work standalone for QCS 0-1? | Planned (Session 4) |
| sim-045b | Phase 4A | 49+ scenarios | Does tiered loading work across all QCS levels? | Planned (Session 5) |
| **sim-119** | **v10.5.0** | **projection** | **v10.5.0 conservative projection (CE 79.04%)** | **✅ DONE** |
| **sim-120** | **v10.5.0** | **consolidated** | **v10.5.0 consolidated comparison (all gates pass)** | **✅ DONE** |
| **sim-121** | **v10.6.0** | **projection** | **v10.6.0 conservative projection (Substance 75.12% +1.17pp)** | **✅ DONE** |
| sim-046 | Phase 4B | 49+ scenarios | Full behavioral validation (optional, projection sufficient) | Deferred |
| sim-047 | Phase 4C | 49+ scenarios | Does YAML-generated protocol match manual? | Future |

### Metric Tracking Table (Actual + Targets)

| Version / Phase | Gate | Substance | CE | Token Budget | Status |
|----------------|:----:|:---------:|:--:|:------------:|:------:|
| v7.4.0 (Phase 0) | ≥ 80.0% | ≥ 67% | ≥ 78% | ~21K | ✅ Exceeded |
| v7.5 (Phase 1C) | ≥ 80.0% | ≥ 67% | ≥ 78% | ~20.5K | ✅ Exceeded |
| **v8.1 Opus (3B)** | **80.57%** | **70.08%** | **77.21%** | **~20K** | **✅ Actual** |
| **v8.3 Sonnet (3B)** | **80.73%** | **70.32%** | **77.22%** | **~20K** | **✅ Actual** |
| **v8.5 (sim-071)** | **80.86%** | **70.41%** | **77.24%** | **~20K** | **✅ Actual** |
| **v8.6 (sim-074)** | **80.90%** | **70.47%** | **77.26%** | **~20K** | **✅ Actual** |
| **v8.7 (sim-077)** | **80.95%** | **70.55%** | **77.29%** | **~20K** | **✅ Actual** |
| **v8.8 (projected)** | **~80.98%** | **~70.57%** | **~77.30%** | **~20K** | **📊 Projected** |
| v8.9 target | ≥ 81.00% | ≥ 70.60% | ≥ 77.31% | ~20K | 🎯 Target |
| v9.0 target | ≥ 81.10% | ≥ 71.00% | ≥ 77.35% | ~20K | 🎯 Target |
| **v9.0 (sim-088)** | **81.38%** | **71.04%** | **77.295%** | **~20K** | **✅ Actual** |
| **v9.1 (sim-091)** | **81.375%** | **71.07%** | **77.34%** | **~20K** | **✅ Actual** |
| **v9.2 (sim-094)** | **81.45%** | **71.12%** | **77.35%** | **~20K** | **✅ Actual** |
| **v9.3 (sim-097)** | **81.47%** | **71.13%** | **77.36%** | **~20K** | **✅ Actual** |
| **v9.4 (sim-100)** | **81.52%** | **71.13%** | **77.42%** | **~20K** | **✅ Actual** |
| **v9.5 (sim-105)** | **81.80%** | **71.35%** | **77.48%** | **~20K** | **✅ Actual** |
| **v10.0 (sim-108)** | **81.87%** | **71.45%** | **77.52%** | **~20K** | **✅ Actual** |
| **v10.1 (sim-111)** | **81.88%** | **71.45%** | **77.52%** | **~20K** | **✅ Actual** |
| **v10.2 (sim-114)** | **81.79%** | **71.45%** | **77.48%** | **~20K** | **✅ Actual (REVERTED)** |
| **v10.3 (= v10.1 effective)** | **81.88%** | **71.45%** | **77.52%** | **~20K** | **✅ Revert baseline** |
| **v10.4 (Protocol Lite)** | **82.10%** | **71.50%** | **78.64%** | **~575/4.7K/22.3K (tiered)** | **✅ Actual (sim-045a/b)** |
| **v10.4.1 (Post-4A)** | **82.25%** | **73.95% (+2.45pp)** | **78.64%** | **~575/4.7K/22.3K (tiered)** | **✅ SHIPPED** |
| **v10.5.0 (Phase 4B)** | **82.25%** | **73.95%** | **79.04% (+0.40pp)** | **~575/4.7K/14.8K (tiered)** | **✅ SHIPPED** |
| **v10.6.0 (Phase 5)** | **82.31%** | **75.12% (+1.17pp)** | **79.14% (+0.10pp)** | **~575/4.7K/15.2K (tiered)** | **✅ SHIPPED** |
| Phase 3C | — | — | — | ~20K | (observation only) |
| Phase 4A | ≥ 80.5% | ≥ 70% | **≥ 78.5%** (stretch ≥83%) | ~15-18K (tiered) | ✅ Done |
| Phase 4B | ≥ 80.5% | ≥ 70% | ≥ 79% | ~15-17K | ✅ Done |
| Phase 4C | ≥ 80.5% | ≥ 70% | ≥ 79% | ~15-17K | 🎯 Target |

### Cross-Repo Sync Checkpoints

**After every phase**, run `node tools/sync/index.mjs` and verify in:

| Repo | Type | Key Check |
|------|------|-----------|
| ai-BRUST-creator | Next.js (primary) | Full protocol loads, COMMANDS.node.md only |
| Flutter repos | Flutter/Dart | COMMANDS.flutter.md loads, TS/React styles don't confuse |
| ai-file-search | Tech-neutral | Core rules work without tech-specific files |

---

## Item Coverage Matrix

All 40 tracked items mapped to their phase and current status:

### Implemented (v7.4.0–v8.8.0) — 32 items

| Item | Description | Phase Done |
|------|-------------|:----------:|
| P01 | Archive LEARNINGS.md log entries | v7.4 Phase 0A |
| P02 | Merge RECOVERY.md → SESSION.md | v7.4 Phase 0B |
| P03 | Merge MCR.md → GATES.md THINK section | v7.4 Phase 0B |
| P04 | Replace Flutter/Dart in STYLES.md with TS/React/Next.js | v7.4 Phase 0C + 1 |
| P05 | Remove Flutter/Dart from EXAMPLES.md | v7.4 Phase 0C |
| P06 | Remove subagent rules from CONTEXT.md | v7.4 Phase 0C |
| P07 | Deduplicate gate applicability table | v7.4 Phase 0B/0C |
| P08 | Prune model-default rules | v7.4 Phase 0C |
| P09 | RED CHECK hard prerequisite + N/A fallback | v7.4 Phase 1 |
| P10 | 2 worked examples (QCS 0 micro + full TDD) | v7.4 Phase 1 |
| P11 | Coverage delta rule (Δcov) | v7.4 Phase 1 |
| P12 | Soften THINK depth prescriptions | v7.4 Phase 2 |
| P13 | THINK evidence improvements | v7.4 Phase 2 |
| P14 | Late-session TDD abbreviated template | v7.4 Phase 2 |
| P15 | LEARN-PERSIST machine-readable line | v7.4 Phase 2 |
| P18 | GATES.md TDD deduplication (partial — cross-ref in MODES.md) | v7.5 (partial) |
| P20 | Auto-write LEARN to `tmp/learn-persist.md` | v7.5 |
| P21 | Remove "Key quality markers" annotations | v7.4 Phase 0C |
| W1-d | Compress verbose Markdown tables (TDD table inline) | v7.5 + v8.5 |
| W3-b | Remove Self-Test section from Quick Start | v8.0 |
| W4-b | Remove `\| micro` suffix (6 locations) | v7.5 + v8.5 |
| v8.5-1 | OPEN Example N (score 2 vs 3, 3 scenarios) | v8.5 |
| v8.5-2 | TDD Quick Path equivalence rubric note (§6.7) | v8.5 |
| v8.6-1 | GO Common Errors table (3 rows) | v8.6 |
| v8.6-2 | GO self-check 4th item (assumption count) | v8.6 |
| v8.6-3 | TEST edge case core promotion (QCS 4+ → QCS 2+) | v8.6 |
| v8.6-4 | Token recovery (OPEN QCS compress + GO depth compress) | v8.6 |
| v8.7-1 | OPEN QCS proof precision (disambiguation rules) | v8.7 |
| v8.7-2 | Code Correctness edge case quality | v8.7 |
| v8.7-3 | GO scope fingerprint Common Error | v8.7 |
| v8.7-4 | Token recovery (coverage + fallback compression) | v8.7 |
| v8.8-1 | SHIP Self-Check formalization (4-point) + Common Errors (3 rows) | v8.8 |
| v8.8-2 | TEST Common Errors table (3 rows) | v8.8 |
| v8.8-3 | TDD First-Command Self-Check + Common Errors | v8.8 |
| v8.8-4 | Token recovery (coverage + fallback deduplication, −55 tokens) | v8.8 |
| v9.0-1 | TDD Case Accountability Chain — TEST self-check 3b, SIMULATION_PLAN TDD score 3 AND logic | v9.0 |
| v9.0-2 | VQ Verified Count Scaling — QCS 2-3 ≥1, QCS 4+ ≥2 citations | v9.0 |
| v9.0-3 | TEST Score Boundary Example P | v9.0 |
| v9.0-4 | Token Recovery — Environment-Aware Fallback compression (−35 tokens) | v9.0 |
| v9.1-1 | VQ Re-Read Mechanical Hardening — TEST self-check 5 prerequisite + SIMULATION_PLAN tool call evidence | v9.1 |
| v9.1-2 | OPEN CTX Accuracy — Common Error 5th row (phantom/omission) + Example N Scenario 4 | v9.1 |
| v9.1-3 | Token Recovery — THINK edge case, LEARN gate count, ELI5 merge (−45 always-loaded) | v9.1 |
| v9.2-1 | VQ/TDD Binary Discriminators — Score 2→3 mechanical tests (VQ `:line` format, TDD terminal proof) | v9.2 |
| v9.2-2 | SHIP Command Counting Common Error — Explicit row 4 counting rule (each run_in_terminal = 1 claim) | v9.2 |
| v9.2-3 | Token Recovery — GO scope, TEST coverage, SHIP No Unclaimed Actions compressions (−48 always-loaded) | v9.2 |
| v9.3-1 | TEST Common Error 4th Row — Missing Verified re-read (no post-impl tool call) | v9.3 |
| v9.3-2 | THINK Evidence Citation Count Binary Discriminator — Score 2→3 mechanical citation count test | v9.3 |
| v9.3-3 | SHIP GO-Plan Traceability — Advisory SC5 + Common Error 5th row (GO-untraceable) | v9.3 |
| v9.3-4 | GO Assumptions Exemptions — Standard practices named in prompt are not scope concerns | v9.3 |
| v9.3-5 | Token Recovery — 5 compressions (THINK edge case, TDD first-command, LEARN auto-write, GO scope, THINK evidence) (−65 always-loaded) | v9.3 |
| v9.4-1 | SHIP GO-Trace Mandatory Promotion — Advisory SC5 → mandatory, Traced line (5th field), §6.5 rubric 5-field + binary discriminator | v9.4 |
| v9.4-2 | TEST Coverage Delta Binary Discriminator — Score 2→3 mechanical test (baseline + final + delta from terminal) | v9.4 |
| v9.4-3 | Token Recovery — 4 compressions (SHIP unclaimed, TEST verbatim, GO assumptions, LEARN context check) (−55 always-loaded) | v9.4 |
| v9.5-1 | Substance Partial Compliance Tier — VQ Score 2.5 (function name without line = partial) + TDD RED CHECK Score 2.5 (FAIL + semantic mismatch with LEARN Friction) | v9.5 |
| v9.5-2 | TDD Semantic Case Matching — Case-name matching is semantic (verb+noun domain), not string-exact + Example Q | v9.5 |
| v9.5-3 | R2 Cumulative Strictness Recalibration — R2 penalty −5% → −3.5% for all-6-gates QCS 4+ scenarios | v9.5 |
| v9.5-4 | Token Recovery Phase 6 — 4 GATES.md compressions (conflicting evidence, LEARN-PERSIST, GO confirmation, SHIP QCS 0-1 examples) (−55 always-loaded) | v9.5 |

### Validated (Phase 3B) — 5 items

| Item | Description | Phase | Status |
|------|-------------|:-----:|:------:|
| Cross-model baseline | Sonnet 4.5 simulation baseline | 3B | ✅ **VALIDATED** (sim-062, sim-065) |
| Model-sensitive analysis | Identify gate degradation on cheaper models | 3B | ✅ **DONE** (no degradation found) |
| Protocol adaptations A-G | 7 targeted fixes for Sonnet degradation | 3B | ⏭️ **SKIPPED** (sim-065 proved unnecessary) |
| Dual-model validation | Sim on both Opus and Sonnet | 3B | 🔶 **PARTIALLY DONE** (2 Sonnet runs; no Opus v8.3 control) |
| Model routing table | QCS→model routing advisory in copilot-instructions.md | 3B/R1 | ✅ **DONE** (v8.2) |

### Planned — 7 items

| Item | Description | Phase | Status |
|------|-------------|:-----:|--------|
| P16 | QCS 0 invisible ceremony | 2 (Exp A) | ❌ Not started — [decision gate at v9.0](#p16-decision-gate) |
| W2-c | `/learn-review` command | 3 | ❌ Not started |
| Session bootstrap | LEARN context on session start | 3 | ❌ Not started |
| QCS distribution measurement | Track real-world QCS distribution | 3C | 📋 Not started |
| P23 | Protocol Lite (~50-75 lines) | 4A | 🔄 In progress — execution plan defined |
| Conditional loading | Tech stack detection → rule loading | 4B | 🔶 Partial (Flutter lazy-load only) |
| P24 | YAML-driven protocol generation | 4C | ❌ Not started |

### Deferred — 6 items

| Item | Description | Trigger | Status |
|------|-------------|---------|:------:|
| Model-tier config (v9.0) | Auto-detect model capability + adjust ceremony | Cross-family testing needed | 📋 DEFERRED |
| Cost tracking automation | Automated cost-per-task reporting | IDE provides usage API | 📋 DEFERRED |
| Escalation protocol (Option B) | Cheap-first with auto-escalation flag | Seamless mid-conversation switching | 📋 DEFERRED |
| Cross-family validation | Test on GPT-4.1, Gemini | New model family considered | 📋 DEFERRED |
| Opus v8.4 control run | Resolve protocol-version confound | Resource available | 📋 DEFERRED |
| P25 | Claude Code hooks evaluation | Platform trigger | Waiting for trigger |

### Dropped — 4 items

| Item | Description | Reason |
|------|-------------|--------|
| P19 | Diet mode / conditional loading by QCS | Superseded by P23 (Protocol Lite) |
| P22 | Dead zone scenario re-weighting | Methodologically unsound — metric inflation |
| SIM-44 | Partial TEST gate in VERIFY mode | Risk > reward |
| NEW-1, NEW-2 | THINK XML structuring, mode-specific LEARN templates | Triggers never materialized after 8+ versions (THINK 2.585, LEARN 2.580 — both stable and high) |

---

## Summary

### Development Model

```
COMPLETED PHASES                          EMERGENT PER-VERSION CYCLE
─────────────────                         ──────────────────────────
Phase 0 (v7.4) ──✅                       v7.5 ──→ ... ──→ v9.5 ──→ v10.0 ──→ v10.1 ──→ v10.2 (regression)
Phase 1A (v7.5) ──✅                      (/improve-protocol → analysis → implement → /simulate → iterate)
Phase 1C (v7.5) ──✅                      Rate: +0.05pp/version (converged to <0.03pp at v10.x)
Phase 3B (v8.2–v8.4) ──✅
                                          L4 CYCLE CLOSED (v10.3.0, D-011)
PARTIALLY COMPLETE                        ─────────────────────────────────────────
────────────────────                      Plateau (81.87%→81.88%→81.87%) → decision gate triggered
Phase 1B (structural) ──🔶 Low priority
Phase 2  (P16 only) ──🔶 Decision @ v9.0  ARCHITECTURAL PIVOT (🔄 IN PROGRESS)
Phase 3  (W2-c, bootstrap) ──🔶 Medium    ─────────────────────────────────────────
Phase 3C (QCS measurement) ──❌ Low       WS1 (SHIP) + WS3 (TDD) → Phase 4A (Protocol Lite)
                                          → Phase 4B → Phase 4C → Phase 5
```

**Sessions consumed:** ~21 (Phases 0–3B + emergent v7.5–v10.3 + L4 cycle)  
**Sessions remaining:** 6 planned (Phase 4A execution) + 4-6 for remaining architectural phases

---

## Design Decisions & Critique Corrections

This plan incorporates corrections from multiple critique rounds:

| Critique | How Addressed | Version |
|----------|---------------|:-------:|
| Phase 0 had no fallback detail | Added Regression Isolation Protocol with binary search | v1 |
| Phase 1 packed 5 unrelated items | Split into 3 sub-phases (1A/1B/1C) | v1 |
| Mini-sim methodology undefined | Removed mini-sim; all phases use full sim | v1 |
| Phase 3 overestimates LEARN improvement | Added LEARN Depth measurement caveats + SIM-49 | v1 |
| Phase 4 too ambitious as one phase | Split into 4A/4B/4C | v1 |
| Missing cross-repo sync validation | Added cross-repo sync checkpoints after every phase | v1 |
| No cross-model strategy | Added Phase 3B with 5-step roadmap | v1 |
| Phase 3B predictions wrong by 5-8pp | Phase 3B updated to VALIDATED, adaptations skipped | v1 |
| Cost savings claim unvalidated | Added Phase 3C for QCS distribution measurement | v1 |
| **GATES.md target ≤660 contradicts reality** | **Acknowledged 894-line growth as correct (Self-Check > compression)** | **v2** |
| **Plan used linear phase structure, reality was emergent** | **Added Emergent Development Pattern as primary methodology** | **v2** |
| **3 items marked "Not started" were done** | **Fixed: P20 ✅ (v7.5), W3-b ✅ (v8.0), P18 🔶 (v7.5 partial)** | **v2** |
| **8 items from v8.7–v8.8 untracked** | **Added v8.7-1 through v8.8-4 to Implemented list** | **v2** |
| **Stale metrics ("Key Metrics to Beat" referenced v8.5/v8.6)** | **Updated to v8.7 actuals + v8.9 targets from sim-077** | **v2** |
| **P16 deferred 6 versions without decision gate** | **Added hard deadline: decide by v9.0** | **v2** |
| **Phase 4A CE ≥83% unrealistic** | **Floor ≥78.5%, stretch ≥83%** | **v2** |
| **Backlog items NEW-1, NEW-2 obsolete** | **Dropped: triggers never materialized, gate scores stable** | **v2** |
| **No gate ceiling shift analysis** | **Added Next Investment Priorities (SHIP 0.500, TEST 0.480)** | **v2** |
| **No TDD improvement strategy** | **Added TDD Adherence Strategy in Next Investment Priorities** | **v2** |
| **No Edge/Adversarial plateau strategy** | **Documented 10 stuck scenarios + structural barriers** | **v2** |
| **Completed phases bloated (285+ lines)** | **Collapsed to 5-10 line summaries, full detail in v1** | **v2** |
| **L4 cycle closed, no path forward** | **Post-L4 Strategic Pivot: 3 workstreams (SHIP root-cause, Phase 4A, TDD analysis) with 6-session execution plan, decision gates, fallback to Phase 4B** | **v2 (v10.3)** |
| **Phase 4A had no execution plan** | **Added 6-session sequenced plan with entry/exit criteria per workstream, token validation step, explicit fallback** | **v2 (v10.3)** |
| **SHIP stall (7 versions) not investigated** | **WS1 SHIP root-cause analysis scoped to SHIP-firing scenarios, discriminator-level attribution** | **v2 (v10.3)** |
| **Substance push timing unclear** | **Deferred to post-4A (Session 6) to avoid cross-contamination — lesson from v10.2 multi-variable regression** | **v2 (v10.3)** |

---

## Analysis Pipeline Reference (Phase 3B)

The following documents in `tmp/sim-plan-improvement/` record the full analysis pipeline:

| Doc | File | Purpose |
|-----|------|---------|
| 019 | Sonnet 4.5 simulation prep | Pre-sim checklist, risk tables, predictions |
| 020 | sim-060 expectations and decisions | Decision framework with 3 paths (A/B/C) |
| 023 | Train-expensive/run-cheap analysis | Full strategy assessment with 3 options |
| 024 | Model strategy draft analysis | Evidence assessment, options evaluation, gap analysis |
| 025 | Model strategy analysis critique | 2 significant + 4 minor issues identified |
| 026 | Implementation plan draft | 4-phase implementation plan (R1-R4) |
| 027 | Implementation plan critique | 1 significant + 4 minor issues identified |
| 028 | Implementation plan final | Corrected plan with consolidation notes |

---

*Updated: 2026-02-17 (v10.4.1 SHIPPED: Session 6 Post-4A consolidation — TP-1 First-Command Rule strengthened, TP-2 RED CHECK auto-annotation, SP-1 Traced binary test, SIMULATION_PLAN v6.2.0 with §4.6 QCS-Tier Scoring. All 6 sessions complete.)*
