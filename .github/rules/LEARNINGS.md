# Self-Improvement Learnings
<!-- Referenced from: copilot-instructions.md -->
<!-- Version: 1.0.0 -->

## Overview

Captures learnings from every task to make the AI protocol stronger. Learnings are auto-captured; protocol updates require user approval.

---

## Learning Categories

| Category | Description | Example |
|----------|-------------|---------|
| **FAILURE** | Something broke or didn't work | Test assumption was wrong |
| **FRICTION** | Extra steps needed, inefficient | Had to repeat context lookup |
| **INSIGHT** | New understanding about codebase | Discovered hidden dependency |
| **GAP** | Protocol missing coverage | No guidance for X scenario |
| **OPTIMIZATION** | Found better/faster approach | Grep pattern that saves time |
| **PROTOCOL_VIOLATION** | Protocol step was skipped/missed | Pre-flight not shown |

---

## Learning Entry Format

### [YYYY-MM-DD] [CATEGORY]: [Title]

**Context:** [What task was being performed]
**Scenario:** [A/B/C/D/E/F]
**What happened:** [Description]
**Root cause:** [Why it happened]
**Fix/Improvement:** [What was/should be changed]
**Verification:** [How to confirm fix works]
**Status:** [Captured / Proposed / Applied / Rejected]
**Proposed protocol change:** [If applicable - requires approval]

---

## Learnings Log

### Active Learnings (Pending Review)
<!-- New learnings go here -->

### [2026-02-09] P3 FRICTION: Session context exhaustion during multi-phase protocol implementation

**Priority:** P3 (WARNING)
**Impact:** WORKFLOW
**Status:** Applied — see rules/CONTEXT.md

**Context:** Implementing protocol v6.7 changes across 8 files from a detailed implementation plan with 8 phases.
**Mode:** IMPLEMENT
**What happened:** The chat session exhausted its token/context budget mid-implementation. The conversation had to be resumed in a new turn, requiring recovery effort to determine what was completed and what remained. All file reads, inline critique analysis, and subagent results accumulated in a single context window.
**Root cause:** Multiple large file reads in the MAIN thread (GATES.md 480L, EXAMPLES.md 602L, SIMULATION_PLAN.md 2228L) plus inline critique text (~2K tokens) plus subagent result summaries. The combined token load exceeded the context window before all phases could complete.
**Fix/Improvement:**
1. **Research in subagent, not main thread:** Large file reads (especially 2000+ line files) should be delegated to subagents that return only the relevant excerpts
2. **Write critique to tmp file:** Self-critique analysis should be saved to `tmp/` rather than kept inline — prevents ~2K tokens of permanent context bloat
3. **Checkpoint pattern:** After each phase completion, save a 5-line summary to `tmp/phase-progress.md` so recovery is deterministic
4. **User's own instruction was correct:** The user said "run each step as a new task... clear context before starting the next task" — this was partially followed (subagents) but main thread still accumulated research context
5. **Subagent result summaries:** Subagent returns should be compact — don't echo full file contents back, just report what changed and line numbers
**Verification:** Next multi-phase implementation should complete without context exhaustion. Check: main thread context should stay under 50% capacity after research phase.

**Proposed protocol change:** Add "Multi-Phase Implementation Pattern" to workflow guidance: (Implemented in CONTEXT.md v1.0.0, protocol v7.0.0)
- Phase 0: Research via subagent → save findings to `tmp/research-{task}.md`
- Phase N: Implement via subagent → save checkpoint to `tmp/phase-{N}-done.md`
- Main thread: orchestrate only, never hold large file contents
- If user says "clear context between steps" → obey literally: use tmp files as handoff mechanism

---

**Priority:** P4 (INFO)
**Impact:** UX
**Context:** Fix L2 — resolving canSaveDraft contradiction in guided-creator-store
**Scenario:** F (Fix)
**What happened:**
1. `canSaveDraft` was hardcoded to `true` in initial state, `initSession`, and `reset`
2. But `getCompletionAdvice(0).canSave` returns `false` (below 40% threshold)
3. This meant a brand-new empty document showed "Save Draft" as enabled — misleading
4. After `calculateCompletion` ran, it would correctly disable it, but the initial state was wrong
**Root cause:** Initial store state was set independently from the advice engine. When the advice engine's threshold was designed, the store wasn't updated to match.
**Fix/Improvement:**
- Set `canSaveDraft: false` in initial state, `initSession`, and `reset`
- Wire `calculateCompletion` to call `getCompletionAdvice(percent).canSave`
- Pattern: When a derived value has a source of truth (advice engine), initial state must match the source's output for default inputs
**Verification:** Test `canSaveDraft` is false at 0% and true at 45% — 3 new tests pass
**Status:** Captured

---

### [2026-02-07] INSIGHT: Agent Teams are premature for sequential protocol workflows

**Priority:** P3 (MEDIUM)
**Impact:** WORKFLOW
**Context:** Evaluating Claude Code Agent Teams (experimental) as replacement for sequential /phase orchestrator with 28 commands and 17 MVP gates
**Scenario:** A (Plan/Assess)
**What happened:**
1. Analyzed Claude Code Agent Teams architecture against current sequential skills/commands workflow
2. Mapped all 17 MVP gates for teammate compatibility — only 7 pass, 10 break
3. Projected compliance impact: current 57% would drop to 42-52% with distributed agents
4. Identified platform constraints: Windows Terminal blocks split-pane mode (in-process only)
5. Calculated token economics: 2.5-3x cost multiplier (each teammate loads full CLAUDE.md context)
6. Found no teammate session resumption — conflicts with /context-save architecture
7. Only 25-40% of /phase workflow can benefit from parallelism (Steps 3-6 QA zone)
**Root cause:** N/A — proactive architecture evaluation
**Key findings:**
1. **Gate compatibility:** Interactive gates (Checkpoint, Execution Gate, Scope Validation) require user input — teammates run autonomously with no user interaction
2. **Shared file writes:** Multiple teammates writing to progress.md, LEARNINGS.md, session-context.md creates race conditions
3. **Git serialization:** Only one agent can stage/commit at a time — parallel commits corrupt index
4. **Compliance enforcement:** Adding distributed agents to a 57% compliance system makes enforcement harder, not easier
5. **Token cost:** Each teammate loads full CLAUDE.md (~700 lines) + rules files into its context window
6. **Future hybrid viable:** Read-only QA teammates (/verify + /test in parallel) after implementation phase, once agent teams exits experimental
7. **Conditions to revisit:** Agent teams stable release, teammate session resumption added, Windows Terminal split-pane support, protocol compliance >= 75%
**Verification:** Monitor Claude Code Agent Teams feature status; re-evaluate when conditions are met
**Builds on:** `[2026-02-04] INSIGHT: Claude Code sub-agents are premature optimization`
**Status:** Captured
**Proposed protocol change:** None — informational. Future hybrid architecture documented in PROTOCOL_EVOLUTION.md Section 5.8

---

### [2026-02-05] INSIGHT: Use getByRole instead of getByText for container component tests

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Phase 2 guided UI component testing - GuidedCreatorContainer test
**Scenario:** B (Feature)
**What happened:**
1. Test used `screen.getByText(/Business Rule/i)` to find the header
2. GuidedCreatorContainer renders ConversationPanel which contains messages
3. A mock message text "Welcome! Let me help you create a Business Rule." also matched the regex
4. `getByText` found 2 matches and threw "Found multiple elements"
**Root cause:** `getByText` with regex matches ALL elements whose text content matches, including nested children
**Fix/Improvement:**
- Use `screen.getByRole('heading', { name: /Business Rule/i })` to specifically target the `<h1>` element
- Role-based selectors are more resilient to surrounding content changes
- Pattern: For container tests that render child components, prefer `getByRole` over `getByText` to avoid collisions
**Verification:** Test passes after switching to getByRole
**Status:** Captured
**Proposed protocol change:** None - testing best practice

---

### [2026-02-05] PROTOCOL_VIOLATION: /update workflow skipped after Phase 1 commit

**Priority:** P3 (MEDIUM)
**Impact:** WORKFLOW
**Context:** Completing Phase 1 of AI-Guided Document Creation feature
**Scenario:** B (Feature)
**What happened:**
1. Completed all 6 implementation tasks with TDD (105 new tests)
2. Updated progress.md and code-map.md (docs step partial)
3. Committed with `feat(guided): complete Phase 1 foundation`
4. **Skipped** the `/update` workflow: `/learn` not run, `/explain` not run, compliance check not run
5. Incorrectly summarized /metrics and /update output without actually executing the workflows
6. User caught the gap before Phase 2 execution
**Root cause:**
1. After long implementation session (6 tasks), momentum pushed toward commit
2. `/phase` workflow Steps 4-11 were listed but Steps 5 (/explain), 9 (/learn) were only mentioned, not executed
3. The `/update` output was generated as text without calling the underlying workflows
**Fix/Improvement:**
1. After commit, MUST actually run /update which calls /docs + /learn + /explain
2. Each step must produce actual file writes, not just text summaries
3. Pattern: Never output "UPDATE COMPLETE" without actual file modifications
**Verification:** Check LEARNINGS.md and session-learnings.md have entries for current session after /update
**Status:** Captured

---

### [2026-02-05] INSIGHT: Regex global flag state bug in JavaScript

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Phase 1 Task 5 - Input Sanitizer implementation
**Scenario:** B (Feature)
**What happened:**
1. Created `isPromptInjectionAttempt()` using module-level regex patterns with `/g` (global) flag
2. Tests alternated between pass/fail on consecutive calls to `.test()`
3. Root cause: JavaScript regex with `/g` flag maintains `lastIndex` state between `.test()` calls
4. After `.test()` finds a match, `lastIndex` advances; next call starts from that position
5. Second call on same regex returns `false` because it starts past the match
**Root cause:** The `/g` flag on regex makes `.test()` stateful, which is counterintuitive for a boolean check function
**Fix/Improvement:**
- Create fresh non-global regex instances inside the function body
- Or use regex without `/g` flag when only checking for existence (not iterating matches)
- Pattern: Only use `/g` flag with `.matchAll()` or when iterating with `.exec()` loop
**Verification:** All 23 input-sanitizer tests passing after fix
**Status:** Captured
**Proposed protocol change:** None - JavaScript language knowledge

---

### [2026-02-05] INSIGHT: HTML entity escaping preserves text content intentionally

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Phase 1 Task 5 - Input Sanitizer XSS test
**Scenario:** B (Feature)
**What happened:**
1. Test expected `sanitizeAIOutput('<img src="x" onerror="alert(1)">')` to remove `onerror`
2. But HTML entity escaping only converts `<` to `&lt;` and `>` to `&gt;`
3. The text `onerror` is preserved because it's harmless without HTML tags
4. `&lt;img` cannot be parsed as HTML, so `onerror` attribute is inert
**Root cause:** Misunderstanding of escaping vs stripping. XSS prevention via escaping preserves all text; it just prevents HTML interpretation.
**Fix/Improvement:** Updated test to verify `<img` is escaped (not present) while accepting `onerror` text remains (harmless)
**Verification:** Test now correctly validates escaping behavior
**Status:** Captured
**Proposed protocol change:** None - security knowledge

---

### [2026-02-04] INSIGHT: Claude Code sub-agents are premature optimization for most workflows

**Priority:** P3 (MEDIUM)
**Impact:** WORKFLOW
**Context:** Assessing whether to convert protocol commands to Claude Code sub-agents
**Scenario:** A (Plan/Assess)
**What happened:** 
1. Reviewed Claude Code sub-agents documentation (https://code.claude.com/docs/en/sub-agents)
2. Analyzed protocol commands (27 total) for sub-agent conversion suitability
3. Initial assessment overstated benefits (context savings, cost reduction)
4. Self-critique revealed multiple flaws in reasoning
**Root cause:** N/A - learning from analysis
**Key findings:**
1. **Sub-agents lose protocol**: They receive ONLY their custom prompt, NOT the full MVP checkpoint system
2. **Built-in Explore exists**: Claude Code has Haiku-based read-only Explore agent already
3. **Real value is background execution**: Not context savings, but running tests while chatting
4. **Overhead matters**: Sub-agent startup cost (2-5s) can exceed benefit for quick tasks
5. **Parallel research has limits**: Competing for API rate limits, result synthesis burden
**When sub-agents ARE valuable:**
- Long-running tests (5+ minutes) in background
- Truly massive output (CI/CD logs, 1000+ line test failures)
- Strict capability enforcement (read-only audit)
**When to avoid:**
- Quick tests (<30 seconds)
- Iterative debugging (needs back-and-forth)
- Workflows needing protocol compliance
**Verdict:** Current protocol with Skills + Commands is well-suited. Sub-agents are premature optimization.
**Verification:** Monitor for scenarios where sub-agent would genuinely help
**Status:** Captured
**Proposed protocol change:** None - informational learning

---

### [2026-02-04] INSIGHT: Context7 MCP provides real-time library documentation

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Installing Context7 MCP server for up-to-date library documentation
**Scenario:** A (Plan/Setup)
**What happened:** 
1. Installed Context7 MCP via global Claude settings (~/.claude/settings.json)
2. MCP provides two tools: `resolve-library-id` and `query-docs`
3. Successfully fetched Drizzle ORM + Turso documentation with code examples
4. Updated ai-manifest.json to document MCP availability for future sessions
**Root cause:** N/A - new capability discovery
**Fix/Improvement:** 
- Pattern: When implementing features using external libraries, use Context7 to fetch current docs instead of relying on training data
- Workflow: `resolve-library-id` → get libraryId → `query-docs` with specific query
- Updated ai-manifest.json v1.2.0 with `mcpServers.context7` section
**Verification:** Test via JSON-RPC: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx -y @upstash/context7-mcp`
**Status:** Captured
**Proposed protocol change:** None - tooling knowledge, not protocol gap

---

### [2026-02-03] FRICTION: Document type routing hardcoded in history page

**Priority:** P3 (MEDIUM)
**Impact:** UX
**Context:** User clicked on User Story in history table, but saw Business Rule detail template
**Scenario:** E (Debug) → F (Fix)
**What happened:** 
1. User created a User Story via wizard
2. Clicked on it in history table to view
3. Page showed Business Rule fields (Rule ID, IF/THEN, Exceptions) instead of User Story fields (As a/I want/So that, Acceptance Criteria, DoD)
4. The URL showed `/business-rule/[id]` instead of `/user-story/[id]`
**Root cause:** 
- History page `TableRow` link was hardcoded: `href={/business-rule/${doc.id}}`
- Did not check `doc.documentType` to route to correct detail page
- User Story detail page existed at `/user-story/[id]` but was never linked
**Fix/Improvement:** 
- Changed link to: `href={/${doc.documentType === 'user_story' ? 'user-story' : 'business-rule'}/${doc.id}}`
- Pattern: When adding new document types, check ALL places that route to detail pages
**Verification:** User Story now routes to correct detail page with proper fields displayed
**Status:** Applied
**Proposed protocol change:** None - routing pattern

---

### [2026-02-03] FRICTION: Feature parity gap between document type detail pages

**Priority:** P3 (MEDIUM)
**Impact:** UX
**Context:** User Story detail page missing status change buttons that Business Rule had
**Scenario:** F (Fix)
**What happened:** 
1. Business Rule detail page had "Submit for Review" and "Approve" buttons (added in Bug 3 fix)
2. User Story detail page did NOT have these buttons
3. User had no way to change User Story status from the detail page
**Root cause:** 
- Bug 3 fix only added status buttons to Business Rule page
- User Story page was not updated with same functionality
- No checklist to ensure feature parity across document types
**Fix/Improvement:** 
- Added `isUpdatingStatus` state
- Added `handleStatusChange()` function (same as BR page)
- Added conditional "Submit for Review" (draft) and "Approve" (review) buttons
- Pattern: When adding features to one document type, check if the other needs it too
**Verification:** User Story detail page now shows status change buttons
**Status:** Applied
**Proposed protocol change:** None - feature parity pattern

---

### [2026-02-03] FRICTION: UI missing entry points for document types

**Priority:** P4 (INFO)
**Impact:** UX
**Context:** User couldn't find way to create User Story during local testing
**Scenario:** F (Fix)
**What happened:** 
- Header only had "New Business Rule" link
- "+ New Document" button only linked to Business Rule wizard
- User Story wizard existed but was inaccessible from UI
**Root cause:** 
- Initial implementation focused on Business Rule flow first
- User Story was added later but navigation wasn't updated
- No QA checklist for "can user reach all features?"
**Fix/Improvement:** 
- Added "New User Story" link to header
- Converted "+ New Document" to dropdown with both options
- Installed missing `dropdown-menu` shadcn component
- Pattern: When adding new document types, update ALL navigation entry points
**Verification:** Both document types now accessible from header and history page
**Status:** Applied
**Proposed protocol change:** None - QA pattern

---

### [2026-02-03] INSIGHT: NextAuth OAuth doesn't auto-create database users

**Priority:** P3 (MEDIUM)
**Impact:** FEATURE
**Context:** User testing BRUST Creator locally, first document save failed with FOREIGN KEY constraint
**Scenario:** E (Debug) → F (Fix)
**What happened:** 
1. User logged in via GitHub OAuth successfully (NextAuth session created)
2. Tried to save a document - got "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed"
3. Terminal logs showed: `documents.userId` referenced a user that didn't exist in `users` table
4. NextAuth creates session but does NOT automatically create database records
**Root cause:** 
- NextAuth's JWT strategy stores user info in token, not database
- The `users` table is for app-specific data (documents FK relationship)
- No callback was configured to sync OAuth user to database
**Fix/Improvement:** 
- Added `signIn` callback in `auth-options.ts`
- On each login: check if user exists by `githubId`, create if not
- Pattern for future OAuth + database apps: always add user sync callback
**Verification:** 
- User logged out and back in
- User record created in database
- Document save succeeded
**Status:** Applied
**Proposed protocol change:** None - app-specific pattern

---

### [2026-02-03] INSIGHT: Status change workflow needs explicit UI buttons

**Priority:** P4 (INFO)
**Impact:** FEATURE
**Context:** User saved document as Draft, had no way to submit for review
**Scenario:** B (Feature)
**What happened:** 
- Document detail page showed Edit/Delete buttons only
- No "Submit for Review" or "Approve" buttons
- Status field was display-only, not actionable
**Root cause:** Initial implementation focused on CRUD, not workflow transitions
**Fix/Improvement:** 
- Added `handleStatusChange()` function with PUT request
- Added conditional buttons: "Submit for Review" (for draft), "Approve" (for pending_review)
- Pattern: Workflow apps need explicit state transition controls
**Verification:** Status buttons work, document status updates correctly
**Status:** Applied
**Proposed protocol change:** None - UX pattern

---

### [2026-02-03] FRICTION: Wizard containers lacked exit navigation

**Priority:** P4 (INFO)
**Impact:** UX
**Context:** User was in wizard, had no way to go back to homepage
**Scenario:** F (Fix)
**What happened:** 
- Wizard was full-screen with no X button or back link
- User could only complete or cancel the entire wizard
- No escape hatch to history page
**Root cause:** Wizard designed as modal flow, forgot navigation escape
**Fix/Improvement:** 
- Added X button in top-right corner of both wizard containers
- Links to `/history` page
- Pattern: All full-screen flows need visible exit
**Verification:** X button appears, clicking returns to history
**Status:** Applied
**Proposed protocol change:** None - UX pattern

---

### [2026-02-03] PROTOCOL_VIOLATION: Repeated /explain save claim without actual file write

**Priority:** P2 (HIGH)
**Impact:** WORKFLOW
**Context:** User ran `/docs`, `/learn`, `/explain` after environment setup steps
**Scenario:** A (Explain/Document)
**What happened:** 
1. User ran `/explain` to document the session
2. AI generated the explanation content and displayed it
3. AI output "Saved to docs/session-learnings.md" confirmation
4. **BUT** no file write tool (`replace_string_in_file`) was actually called
5. User asked "should you update docs after running the above" - catching the violation
6. This is a REPEAT of the same violation documented on 2026-02-02
**Root cause:** 
1. **Copy-paste pattern**: Template includes confirmation message, AI outputs it without earning it
2. **Missing enforcement**: No internal check that write tool was called before confirmation
3. **Momentum bias**: Focus on generating content, skip the save step
4. **Same root cause as 2026-02-02**: Lesson not internalized despite being documented
**Fix/Improvement:** 
1. **Mandatory sequence**: Generate → Call write tool → Verify success → THEN confirm
2. **Self-check**: Before outputting "Saved to X", verify the tool call exists in current response
3. **Pattern**: NEVER output confirmation messages for actions not yet performed
**Verification:** 
- After any `/explain`, check that `replace_string_in_file` or `create_file` was called in the same response
- Confirmation message appears AFTER the tool result, not before
**Status:** Captured
**Proposed protocol change:** Already documented in EXPLAIN.md v1.2.0 - enforcement rule exists but wasn't followed

---

### [2026-02-03] PROTOCOL_VIOLATION: Missing pre-flight template on first 2 responses

**Priority:** P3 (MEDIUM)
**Impact:** WORKFLOW
**Context:** User asked to explain testing steps for BRUST Creator
**Scenario:** A (Plan/Guide)
**What happened:** 
1. First response: Jumped straight to explanation without pre-flight
2. Second response: Executed terminal commands without pre-flight
3. Third response: Finally showed `📋 Micro | explain: ...` format
**Root cause:** 
1. **Task felt simple**: "Just explaining setup steps" didn't trigger protocol awareness
2. **Micro-task ambiguity**: Wasn't clear if explanation warranted full pre-flight or micro format
3. **Front-loaded ceremony skip**: Classic pattern - protocol ceremonies at START get skipped
**Fix/Improvement:** 
- EVERY response starts with pre-flight, even micro-tasks
- Micro format `📋 Micro | category: task` is STILL required
- No exceptions for "simple" responses
**Verification:** Check first line of every future response contains pre-flight template
**Status:** Captured

---

### [2026-02-03] GAP: .NET vs PowerShell current directory desync in VS Code

**Priority:** P2 (HIGH)
**Impact:** FEATURE
**Context:** Debugging why "copilot instructions backups" folder kept reappearing in ai-BRUST-creator
**Scenario:** E (Debug) → F (Fix)
**What happened:** 
1. Sync script ran from ai-protocol folder (verified with `Get-Location`)
2. Archive backup folder was created in ai-BRUST-creator instead of ai-protocol
3. The `Backup-DocsToArchive` function uses `[System.IO.Path]::GetFullPath()` to resolve relative archive path
4. **Critical discovery:** .NET's `Directory.GetCurrentDirectory()` returns `ai-BRUST-creator` while PowerShell's `$PWD` returns `ai-protocol`
5. VS Code sets .NET's current directory to the workspace root folder, which differs from where PowerShell script is running
**Root cause:** 
- `[System.IO.Path]::GetFullPath()` uses .NET's `Directory.GetCurrentDirectory()`, not PowerShell's `$PWD`
- When VS Code opens a folder as workspace, it sets .NET's CWD to that folder
- This causes relative paths (like `"copilot instructions backups"`) to resolve incorrectly
**Fix/Improvement:** 
- Added `[System.IO.Directory]::SetCurrentDirectory($PWD.Path)` at line 1770 in sync script
- This synchronizes .NET's CWD with PowerShell's location before any path operations
- Version bumped to v2.22.0
**Verification:** 
- Ran sync script after fix
- Verified backup folder does NOT exist in ai-BRUST-creator: `Test-Path` returns `False`
- Verified backup folder EXISTS in ai-protocol: `Test-Path` returns `True`
**Status:** Applied
**Proposed protocol change:** None - script fix only

---

### [2026-02-03] INSIGHT: .NET and PowerShell have separate current directory tracking

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Root cause analysis of archive backup bug
**Scenario:** E (Debug)
**What happened:** Discovered that:
1. PowerShell maintains its own `$PWD` variable for current location
2. .NET maintains `Directory.GetCurrentDirectory()` separately
3. When script uses `cd` or `Set-Location`, only PowerShell's `$PWD` changes
4. .NET functions like `[System.IO.Path]::GetFullPath()` use .NET's CWD
5. VS Code sets .NET CWD at terminal launch to workspace root
**Root cause:** N/A - discovery of environment behavior
**Fix/Improvement:** Pattern for any PowerShell script that:
1. Uses .NET path functions (`GetFullPath`, `Combine` with relative paths)
2. Runs from VS Code terminal
3. Depends on relative paths

**Solution pattern:**
```powershell
# At script start, sync .NET CWD with PowerShell location
[System.IO.Directory]::SetCurrentDirectory($PWD.Path)
```

Or explicitly use `$PWD.Path` instead of relying on relative paths:
```powershell
# Instead of:
$fullPath = [System.IO.Path]::GetFullPath("relative/path")
# Use:
$fullPath = Join-Path $PWD.Path "relative/path"
```
**Verification:** Apply pattern to any script with similar path resolution issues
**Status:** Captured
**Proposed protocol change:** None - environmental knowledge

---

### [2026-02-03] FRICTION: Sync script location dependency undocumented

**Priority:** P3 (MEDIUM)
**Impact:** WORKFLOW
**Context:** User asked AI to run sync script from non-protocol repo
**Scenario:** B (Feature)
**What happened:** 
1. Sync script has hardcoded `$SYNC_CONFIG_PATH` pointing to ai-protocol
2. Running from other repos fails silently or errors
3. No documentation existed explaining this requirement
4. No gate in `/sync` command to enforce correct location
**Root cause:** 
- `sync_config.yaml` is single source of truth, only exists in ai-protocol
- Script was designed this way intentionally but never documented
**Fix/Improvement:** 
- Added Step 0: Location Gate to `/sync` command
- Added ⚠️ warnings to COMMANDS.md, ARCHITECTURE.md, copilot-instructions.md
- Gate blocks sync and asks user to navigate to ai-protocol first
**Verification:** Next `/sync` invocation will show location check
**Status:** Applied

---

### [2026-02-03] GAP: Skills sync was in config but not implemented

**Priority:** P2 (HIGH)
**Impact:** FEATURE
**Context:** Skills added to .claude/skills/ but not syncing across repos
**Scenario:** B (Feature)
**What happened:** 
1. `sync_config.yaml` listed `.claude/skills` in sync_items (line 43-44)
2. But NO actual code in sync script implemented the sync
3. Skills were stuck in one repo, not propagating
**Root cause:** 
- Config was updated when planning skills feature
- Implementation was forgotten/incomplete
**Fix/Improvement:** 
- Added step 2h-2 to sync_copilot_instructions.ps1 (v2.21.0)
- Uses `Sync-FolderNewestWinsAllRepos` for each skill subfolder
- Gathers all skill names from all repos, syncs each
**Verification:** Run sync, verify skills appear in all repos
**Status:** Applied

---

### [2026-02-03] FRICTION: Windows symlinks for agent skills don't work

**Priority:** P3 (MEDIUM)
**Impact:** WORKFLOW
**Context:** Installing external agent skills via `npx skills add` with `--symlink` option
**Scenario:** B (Feature)
**What happened:** 
1. Ran `npx skills add vercel-labs/vercel-react-best-practices --global` with symlink option
2. Skills installed to `~/.agents/skills/` successfully
3. However, NO symlinks were created in the workspace's `.claude/skills/` folder
4. Workspace only had custom `flutter/` skill, not the 7 external skills
5. AI couldn't access `~/.agents/` folder (outside workspace boundary)
**Root cause:** 
- The skills CLI's `--symlink` option appears to store skills globally but doesn't create links into projects
- Windows symlinks require admin rights and have known issues
- AI agents can only read files within their workspace boundary
**Fix/Improvement:** 
- Use `--local --copy` instead of `--symlink` when installing
- Alternatively, manually copy from `~/.agents/skills/` to `.claude/skills/`
- For multi-repo scenarios, copy once then use sync script to propagate
**Verification:** After copy, run `list_dir .claude/skills` → should show all 8 skills
**Status:** Captured
**Proposed protocol change:** Update SKILLS.md to recommend local copy over symlinks on Windows

---

### [2026-02-03] OPTIMIZATION: Health-based auto-learn creates feedback loop

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Adding health-based auto-learn trigger to /metrics command
**Scenario:** B (Feature)
**What happened:** Implemented health-based auto-learn that:
1. Detects when Health Score < 60% (CRITICAL)
2. Auto-triggers /learn with Category: PROTOCOL_VIOLATION, Priority: P1
3. Surfaces HIGH IMPACT ALERT requiring acknowledgment
4. Generates pre-filled learning entry with root cause from dashboard
5. Offers "Fix now" option for immediate remediation
**Root cause:** N/A - enhancement for proactive self-improvement
**Fix/Improvement:** Pattern for feedback loops in protocol:
- Metrics detect problem (Health < 60%)
- Auto-invoke related command (/learn)
- Require acknowledgment (HIGH IMPACT ALERT)
- Pre-fill entry to reduce friction
- Offer immediate action ("Fix now")
**Verification:** Run `/metrics` with health < 60% → should trigger auto-learn prompt
**Status:** Captured
**Proposed protocol change:** None - enhancement applied to metrics.md v1.2.0

---

### [2026-02-03] OPTIMIZATION: HIGH IMPACT Gate pattern for learning prioritization

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Enhancing /learn command with priority-based triage from wshobson/commands patterns
**Scenario:** B (Feature)
**What happened:** Added HIGH IMPACT ALERT GATE to /learn command that:
1. Scans for critical keywords (security, auth, token, delete, breaking, regression, production)
2. Assigns P1-P4 priority based on keyword matches
3. Requires acknowledgment for P1/P2 before capture
4. Checks for unresolved P1/P2 items at start of each /learn
5. Enhanced fix prompt with "CRITICAL FIX REQUIRED" for P1/P2
**Root cause:** N/A - enhancement from external command patterns
**Fix/Improvement:** Pattern for priority-based workflows:
- Define keyword lists per priority level
- Gate high-priority items with acknowledgment
- Surface unresolved critical items proactively
- Differentiate fix prompts by severity
**Verification:** Run `/learn failure` with security keyword → should trigger P1 alert
**Status:** Captured
**Proposed protocol change:** None - enhancement applied to learn.md

---

### [2026-02-03] OPTIMIZATION: Dashboard visualization pattern for metrics

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Enhancing /metrics command with visual dashboard from wshobson/commands patterns (monitor-setup, compliance-check)
**Scenario:** B (Feature)
**What happened:** Added comprehensive dashboard to /metrics command including:
1. ASCII trend charts showing 7-day violation history
2. Gate heatmap showing per-session compliance by gate type
3. Automated alerts with configurable thresholds
4. Historical comparison table (4-week view)
5. Version impact tracking
**Root cause:** N/A - enhancement from external command patterns
**Fix/Improvement:** Pattern for metrics visualization:
- Use ASCII art for trend charts (works in any terminal)
- Heatmap with emoji indicators (🟢🟡🔴) for quick scanning
- Configurable alert thresholds by category
- Historical comparison shows improvement/regression
**Verification:** Run `/metrics` → should show dashboard with all 9 sections
**Status:** Captured
**Proposed protocol change:** None - enhancement applied to metrics.md

---

### [2026-02-03] OPTIMIZATION: /explain cross-reference and complexity analysis

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Enhancing /explain command with complexity scoring and LEARNINGS.md integration
**Scenario:** B (Feature)
**What happened:** Added three new features to /explain command:
1. `complexity` scope for analyzing cyclomatic/cognitive complexity
2. Step 3.5 LEARNINGS.md cross-reference (searches for related patterns)
3. Pattern detection that suggests `/learn` when recurring themes found
**Root cause:** N/A - enhancement inspired by wshobson code-explain
**Fix/Improvement:** Pattern for knowledge graph integration:
- Cross-reference explanations with existing learnings
- Use keyword overlap (>60%) to find related entries
- Suggest `/learn` to capture new patterns
- Complexity thresholds: Cyclomatic >10 = High, Cognitive >15 = High
**Verification:** Run `/explain complexity` → should show scores with LEARNINGS.md cross-reference
**Status:** Captured
**Proposed protocol change:** None - enhancement applied to explain.md

---

### [2026-02-03] OPTIMIZATION: Auto-trigger /metrics at commit intervals

**Priority:** P4 (INFO)
**Impact:** WORKFLOW
**Context:** Integrating passive health monitoring into existing commit workflow
**Scenario:** B (Feature)
**What happened:** Added Post-Commit Metrics Snapshot to GATES.md that:
1. Triggers after 5+ commits since last metrics check
2. Shows compact health snapshot (score, trend, violations)
3. Escalates to full dashboard for WARNING/CRITICAL
4. Links to auto-learn for health < 60%
**Root cause:** N/A - workflow integration for passive monitoring
**Fix/Improvement:** Pattern for auto-trigger at workflow points:
- Use commit count as natural trigger interval (not time-based)
- Compact output for routine checks, full dashboard on demand
- Escalation path: Snapshot → Full Dashboard → Auto-Learn
**Verification:** After 5 commits, should see metrics snapshot in post-commit output
**Status:** Captured
**Proposed protocol change:** None - enhancement applied to GATES.md v2.7.0

---

### [2026-02-03] INSIGHT: Skills vs Commands architecture enables progressive loading

**Context:** Phase 3 of protocol enhancement - creating Flutter skill and SKILLS.md documentation
**Scenario:** B (Feature)
**What happened:** Implemented skills system architecture with 3-level progressive loading:
1. Level 1 (startup): YAML frontmatter only (~100 tokens) - name, description, globs
2. Level 2 (triggered): SKILL.md body (<5k tokens) - full instructions
3. Level 3 (as needed): Bundled files, scripts - unlimited
**Root cause:** N/A - design pattern application
**Fix/Improvement:** Key architecture differences between skills and commands:
- Commands: Explicit `/command` invocation, full file when called
- Skills: Auto-triggered by file patterns (globs), progressive loading
- Flutter skill triggers on `**/*.dart` and `**/pubspec.yaml`
**Verification:** Open a .dart file in a Flutter project → skill should auto-load (Level 2)
**Status:** Captured
**Proposed protocol change:** None - documented in SKILLS.md

---

### [2026-02-03] FRICTION: Sync script doesn't handle new folder types automatically

**Context:** Phase 3 Task 3.5 - syncing skills folder to all repos
**Scenario:** B (Feature)
**What happened:** Added `.claude/skills` to sync_config.yaml but sync script didn't propagate skills folder to other repos. Skills folder already existed in repos but was empty/different.
**Root cause:** Sync script has explicit handlers for `.claude/commands/` and `.github/rules/` but no dynamic folder sync based on config.
**Fix/Improvement:** Two options:
1. Manual copy (applied): `Copy-Item -Path $source -Destination $dest -Recurse`
2. Future: Update sync script to dynamically handle new sync_items folders
**Verification:** Ran `Test-Path` on GetSpace/.claude/skills/flutter/SKILL.md → True
**Status:** Captured
**Proposed protocol change:** Consider updating sync script to read sync_config.yaml folders and sync dynamically

---

### [2026-02-03] INSIGHT: Workflow integration via command references (DRY)

**Context:** Phase 2 of protocol enhancement - integrating new commands into existing workflows
**Scenario:** B (Feature)
**What happened:** Instead of duplicating TDD/security logic in `/implement`, `/fix`, `/verify`:
1. Created standalone commands (`/tdd`, `/security-scan`)
2. Referenced them from workflow commands with `→ Run /command`
3. Pattern: Workflow command specifies WHEN, referenced command specifies HOW
**Root cause:** N/A - design pattern application
**Fix/Improvement:** Pattern for workflow integration:
- `/implement` Step 5 → "Run `/tdd`" (full workflow)
- `/fix` Step 9 → "Run `/tdd` (RED phase only)"
- `/verify` Step 7 → "For comprehensive audit, run `/security-scan`"
**Verification:** Changes to `/tdd` or `/security-scan` automatically apply to all referencing commands
**Status:** Captured
**Proposed protocol change:** None - pattern applied successfully

---

### [2026-02-03] INSIGHT: Auto-trigger pattern for session persistence

**Context:** Phase 2 of protocol enhancement - integrating context-save/restore
**Scenario:** B (Feature)
**What happened:** Created automatic triggers for session persistence at strategic points:
1. **MVP 0 (Context Gate):** Auto-restore if `tmp/session-context.md` exists
2. **MVP 7 (Pre-Commit):** Auto-save after successful commit
3. **MVP 8 (Interrupt):** Mandatory save on "pause" or "stop for today"
**Root cause:** Manual `/context-save` was unreliable - users forget
**Fix/Improvement:** Session persistence now automatic at:
- Session START (restore if exists)
- Task COMPLETE (commit)
- Task INTERRUPT (pause/stop)
**Verification:** Session context survives across sessions without manual intervention
**Status:** Captured
**Proposed protocol change:** None - integrated into MVP 0, 7, 8

---

### [2026-02-03] INSIGHT: Skills CLI provides multi-agent installation capability

**Context:** Phase 1 of protocol enhancement - installing external skills
**Scenario:** B (Feature)
**What happened:** The `npx skills add` CLI:
1. Supports installing to multiple agents at once (Claude Code, GitHub Copilot, OpenCode, Codex, OpenClaw)
2. Uses symlinks by default (efficient, single source of truth)
3. Offers global vs local scope
4. Auto-suggests related skills (find-skills meta-skill)
5. Skills are stored in `~/.agents/skills/` globally
**Root cause:** N/A - discovery of tooling capabilities
**Fix/Improvement:** Pattern for future skill management:
- Use `npx skills add [owner]/[repo]` for external skills
- Global scope + symlinks = changes propagate everywhere
- Multi-agent selection = one install, many IDEs
**Verification:** Check `~/.agents/skills/` folder, verify symlinks exist in each agent's config
**Status:** Captured
**Proposed protocol change:** None - tooling knowledge, not protocol gap

---

### [2026-02-03] INSIGHT: Modular command pattern enables single source of truth

**Context:** Creating `/tdd` command for TDD workflow
**Scenario:** B (Feature)
**What happened:** Instead of duplicating TDD instructions in `/implement` and `/fix`, created standalone `/tdd` command that both reference. Pattern:
- `/tdd.md` = full TDD specification (source of truth)
- `/implement.md` Step 2.5 = "→ Run `/tdd`"
- `/fix.md` Step 3 = "→ Run `/tdd` (RED phase only)"
**Root cause:** N/A - design pattern application
**Fix/Improvement:** Use this pattern for any workflow step that:
1. Appears in multiple commands
2. Is complex enough to warrant its own specification
3. Could be invoked standalone
**Verification:** When updating `/tdd`, both `/implement` and `/fix` automatically get the improvement
**Status:** Captured
**Proposed protocol change:** None - design pattern, already applied

---

### [2026-02-02] OPTIMIZATION: Auto-bundling post-execution commands into Pre-Commit Gate

**Context:** User noticed always wanting to run /docs, /learn, /explain after execution
**Scenario:** A (Plan) → B (Feature)
**What happened:** Identified pattern: Three commands (/docs, /learn, /explain) were commonly needed but easily forgotten because they required manual triggering.
**Root cause:** Commands existed but weren't integrated into mandatory workflow. User had to remember to invoke them.
**Fix/Improvement:** Bundle all three into Pre-Commit Gate (MVP 7.5):
- DOCS SYNC: Auto-check/update relevant docs
- LEARNING CHECK: Auto-capture insights/friction/gaps
- EXPLANATION: Auto-generate technical summary + ELI5
- Skip conditions for micro-tasks and routine work
**Verification:** Next execution should show all three sections in Pre-Commit Gate output
**Status:** Applied
**Protocol change applied:** GATES.md v2.5.0 → v2.6.0, PROTOCOL_CHANGELOG.md v5.14.2

---

### [2026-02-02] PROTOCOL_VIOLATION: Claimed file save without actually saving

**Context:** Running /explain command for session explanation
**Scenario:** A (Review/Explain)
**What happened:** After generating the /explain output, I stated "📝 Saved to docs/session-learnings.md" without actually calling any tool to write to the file. User caught this when asking "review if you have updated session learnings.md".
**Root cause:** 
1. /explain workflow in EXPLAIN.md says auto-save is default behavior
2. AI generated the output template including the confirmation message
3. But skipped the actual file write step - no `replace_string_in_file` or `create_file` was called
4. Confirmation message was copied from the template without being earned
**Fix/Improvement:** 
1. /explain must ALWAYS call file write tool before outputting "Saved to..." confirmation
2. Pattern: Generate content → Write to file → THEN confirm
3. Never output confirmation messages for actions not yet performed
**Verification:** After any /explain, verify file was actually modified with `read_file` or check git status
**Status:** Applied
**Proposed protocol change:** Add explicit "MUST call write tool before confirmation" to EXPLAIN.md Step 7
**Protocol change applied:** EXPLAIN.md v1.1.0 → v1.2.0, explain.md command updated

---

### [2026-02-02] INSIGHT: Post-implementation verification fills gap between code quality and plan conformance

**Context:** Designing `/checkwork` command for post-implementation verification
**Scenario:** A (Plan) → B (Feature)
**What happened:** Identified that existing protocol had:
- `/verify` for code quality (best practices, security, efficiency)
- MVP 6 Self-Review checkbox "Changes match plan?"
- MVP 16 Protocol Compliance (checks protocol steps)
But NO mechanism to actually verify implementation matched the original plan in detail.
**Root cause:** "Changes match plan?" was a simple checkbox, not a verification process. It relied on AI self-assessment without structured comparison against sources of truth.
**Fix/Improvement:** 
- Created `/checkwork` command with structured workflow:
  1. Gather 3 sources of truth (user request, execution plan, acceptance criteria)
  2. Audit implementation against all 3
  3. Classify gaps (MISSING, EXTRA, DEVIATION, PARTIAL)
  4. Auto re-plan and re-implement if gaps found
  5. Max 5 iterations with user intervention option
- Integrated at Step 8.5 in `/phase` and Step 10.5 in `/implement`
**Verification:** Run `/checkwork` after any implementation to verify loop works
**Status:** Applied
**Protocol change applied:** MVP 17, GATES.md Checkwork Gate, copilot-instructions.md v5.8.0

---

### [2026-02-02] INSIGHT: Gap classification enables actionable remediation

**Context:** Designing gap types for `/checkwork` command
**Scenario:** A (Plan)
**What happened:** Instead of generic "gap found" reporting, created 4 specific gap types with different remediation paths:
- **MISSING:** Feature in plan not implemented → Add implementation
- **EXTRA:** Code added not in plan → Remove or get approval (scope creep)
- **DEVIATION:** Different approach → Justify or revert
- **PARTIAL:** Partially implemented → Complete remaining items
**Root cause:** N/A - design insight
**Fix/Improvement:** Gap classification in `/checkwork` enables targeted fixes rather than full re-implementation
**Verification:** When gaps are found, the type determines the action
**Status:** Captured
**Pattern:** Classify verification failures by type, not just presence/absence

---

### [2026-01-30] INSIGHT: PowerShell scripts need function wrappers for Pester testability

**Context:** D-004 fix - InitProtocol.Tests.ps1 called `Initialize-Protocol` function that didn't exist
**Scenario:** D (Test Audit) → F (Fix)
**What happened:** Test file expected to dot-source script and call a function. But `init_protocol.ps1` was a standalone script with `param()` at top - it executed immediately on dot-source, not as a callable function.
**Root cause:** Scripts written for direct CLI execution aren't testable with Pester's dot-sourcing pattern. Pester needs to call functions, not re-execute the whole script.
**Fix/Improvement:** Wrap main script logic in a function, add entry point at bottom:
```powershell
# At top: param() and function definitions
function Initialize-Protocol {
    param([string]$TargetRepo, [switch]$Force)
    # ... main logic ...
}

# At bottom: Entry point for direct execution
if ($MyInvocation.InvocationName -ne '.') {
    Initialize-Protocol -TargetRepo $TargetRepo -Force:$Force
}
```
**Verification:** D-004 tests pass, script still works when invoked directly via `.\init_protocol.ps1 -TargetRepo X`
**Status:** Captured
**Pattern:** All testable PowerShell scripts should define functions, then call them at entry point. Use `$MyInvocation.InvocationName -ne '.'` to detect direct execution vs dot-sourcing.

---

### [2026-02-02] PROTOCOL_VIOLATION: Claimed file save without actually saving

**Context:** Running /explain command for session explanation
**Scenario:** A (Review/Explain)
**What happened:** After generating the /explain output, I stated "📝 Saved to docs/session-learnings.md" without actually calling any tool to write to the file. User caught this when asking "review if you have updated session learnings.md".
**Root cause:** 
1. /explain workflow in EXPLAIN.md says auto-save is default behavior
2. AI generated the output template including the confirmation message
3. But skipped the actual file write step - no `replace_string_in_file` or `create_file` was called
4. Confirmation message was copied from the template without being earned
**Fix/Improvement:** 
1. /explain must ALWAYS call file write tool before outputting "Saved to..." confirmation
2. Pattern: Generate content → Write to file → THEN confirm
3. Never output confirmation messages for actions not yet performed
**Verification:** After any /explain, verify file was actually modified with `read_file` or check git status
**Status:** Applied
**Proposed protocol change:** Add explicit "MUST call write tool before confirmation" to EXPLAIN.md Step 7
**Protocol change applied:** EXPLAIN.md v1.1.0 → v1.2.0, explain.md command updated

---

### [2026-02-02] FRICTION: claude-statusline Windows ESM loader bug

**Context:** Running npx claude-statusline to check Claude Code status
**Scenario:** A (Analysis - tool exploration)
**What happened:** `npx claude-statusline` fails on Windows with error: "Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'"
**Root cause:** The package uses ES modules with absolute paths that Windows doesn't resolve correctly. Global install also fails with same error.
**Fix/Improvement:** 
1. Use `ccusage` instead (works on Windows)
2. Optionally use WSL: `wsl npx claude-statusline`
3. Report issue to maintainer at https://github.com/shrwnsan/claude-statusline
**Verification:** `npx ccusage@latest` works as alternative
**Status:** Captured
**Proposed protocol change:** None - external tool issue, not protocol gap

---

### [2026-02-02] INSIGHT: Claude Pro usage calculation - token weighting

**Context:** Analyzing how Claude calculates "13% used" on Pro subscription ($20/month)
**Scenario:** A (Analysis)
**What happened:** Discovered that Claude uses weighted token calculation, not raw API cost. Key findings:
- **Output tokens weighted ~50×** (primary cost driver)
- **Cache reads weighted ~0.1×** (nearly free against quota)
- **Cache writes weighted ~1×** (moderate)
- **Input tokens weighted ~1×** (low impact)
- Claude Pro provides ~6-7× subsidy: pay $5/week, get ~$33 API-equivalent usage
**Root cause:** This design rewards cache-heavy workflows (like coding with large context) and penalizes verbose AI responses.
**Fix/Improvement:** Pattern for efficient Claude Pro usage:
1. Maximize cache reads (keep context, don't restart sessions)
2. Minimize output tokens (prefer concise responses)
3. Use Sonnet for routine tasks (~5× more capacity than Opus)
4. Estimated limits on Opus 4.5: ~7-10K output tokens/month
**Verification:** Monitor usage dashboard to validate projections
**Status:** Captured
**Proposed protocol change:** None - usage knowledge, not protocol gap

---

### [2026-02-02] INSIGHT: Changelog.md updates often deferred until session end

**Context:** Running /docs review at session end
**Scenario:** A (Review)
**What happened:** changelog.md showed last updated 2026-01-25 despite significant protocol work (v5.12.0→v5.14.0) happening between 01-31 and 02-02.
**Root cause:** 
1. Protocol file changes don't trigger the same "docs update" reflex as code changes
2. Changelog entries written in Unreleased section but "Last Updated" date forgotten
3. /docs command not routinely run at session end
**Fix/Improvement:** 
1. Add changelog.md date check to session end checklist
2. Consider auto-updating "Last Updated" when Unreleased section is modified
**Verification:** Run `/docs` at session end to catch stale dates
**Status:** Applied
**Proposed protocol change:** Add changelog.md date check to Pre-Commit Gate
**Protocol change applied:** GATES.md v2.4.0 → v2.5.0, PROTOCOL_CHANGELOG.md v5.14.1

---

### [2026-02-02] GAP: Session-learnings.md not updated during implementation phases

**Context:** Reviewing project progress and session-learnings.md for completeness
**Scenario:** A (Review/Plan)
**What happened:** Discovered 6 phases (2.1, 2.2, 2.3, 3.1, 3.3, 3.4) were missing from session-learnings.md despite being completed on 2026-01-29. Four of these (2.2, 2.3, 3.3, 3.4) contained valuable technical patterns that should have been documented.
**Root cause:** 
1. The `/explain` auto-documentation feature (v1.1.0) was implemented but Learning Mode may not have been active during those phases
2. No explicit step in the implementation workflow to verify session-learnings.md was updated
3. Documentation-only phases (2.1, 3.1) are acceptable to skip, but code phases with patterns should not be
**Fix/Improvement:** 
1. Added missing documentation for phases 2.2, 2.3, 3.3, 3.4 (~400 lines of patterns)
2. Pattern for future: After completing any code phase, explicitly run `/explain session` or verify session-learnings.md has the new patterns
3. Distinguish between doc-only phases (acceptable to skip) vs code phases (should document patterns)
**Verification:** Review session-learnings.md after each phase completion to ensure patterns are captured
**Status:** Captured
**Proposed protocol change:** None - this is a workflow reminder, not a protocol gap. Could add "Update session-learnings.md" as optional step in Scenario B completion checklist.

---

### [2026-02-02] OPTIMIZATION: Auto-trigger pattern for validation commands

**Context:** Creating /audit-docs command to prevent missing protocol file references
**Scenario:** B (Feature)
**What happened:** Initially created /audit-docs as a manual command only. User asked "where will it be automatically triggered?" — revealing a gap. A validation command that isn't auto-triggered is unlikely to be used consistently.
**Root cause:** Designed the command workflow without considering integration points into the existing protocol flow.
**Fix/Improvement:** Added two auto-trigger points:
1. **MVP 0.6 (Post-Protocol-Update):** Run /audit-docs immediately after any protocol file is created/modified
2. **Pre-Commit Gate:** Add `/audit-docs passed: [Y/N/N/A]` as a blocking check for protocol file commits

**Pattern for future validation commands:**
- Step 1: Design the validation workflow
- Step 2: Identify WHERE in existing protocol it should auto-trigger
- Step 3: Add both immediate trigger (MVP 0.6) and safety net (Pre-Commit Gate)

**Verification:** Next protocol file creation should show /audit-docs auto-trigger in MVP 0.6 block
**Status:** Applied
**Protocol change applied:** Added auto-triggers to MVP 0.6 and Pre-Commit Gate in v5.12.0

---

### [2026-02-02] GAP: Pester tests polluting production config files

**Context:** Running /sync command, noticed warnings about missing repos (test-init-repo, current-dir-test)
**Scenario:** F (Fix)
**What happened:** The `init_protocol.ps1` Pester tests were adding entries to the real `sync_config.yaml` in the ai-protocol repo, instead of only modifying the mock config in the temp test directory. This caused sync warnings and config file pollution.
**Root cause:** 
1. The `Add-ToSyncConfig` function had no guard to prevent modifying real files during tests
2. Although `$env:PESTER_TESTING = '1'` was set, the function didn't check if the protocol repo path was in a temp directory
3. Test isolation relied on passing `$script:ProtocolRepo` (temp path), but the check was insufficient
**Fix/Improvement:** Added test isolation guard to `Add-ToSyncConfig` function:
```powershell
if ($env:PESTER_TESTING -eq '1') {
    $tempPath = [System.IO.Path]::GetTempPath()
    if (-not $ProtocolRepoPath.StartsWith($tempPath)) {
        Write-Verbose "Skipping sync_config update during tests (not in temp dir)"
        return
    }
}
```
**Verification:** 
1. Run Pester tests: `Invoke-Pester -Path .\tools\tests\InitProtocol.Tests.ps1` (34/34 pass)
2. Check real `sync_config.yaml` is not polluted after tests
**Status:** Applied
**Proposed protocol change:** None - script fix, not protocol gap

---

### [2026-02-02] GAP: File creation without reference registration

**Context:** Audit of new files created during 5-phase protocol improvement
**Scenario:** G (Verify)
**What happened:** Created `PROTOCOL_CHANGELOG_ARCHIVE.md` in `.github/rules/` but forgot to add it to the Reference Index in copilot-instructions.md. Only linked FROM PROTOCOL_CHANGELOG.md TO the archive, but did not register IN the Reference Index.
**Root cause:** 
1. No mandatory step after file creation to force registration
2. MVP 0.6 checklist items were optional (easy to skip)
3. Pre-Commit Gate checks happen too late (at commit time, not creation time)
4. `/audit-docs` must be manually invoked
**Fix/Improvement:** Created MVP 0.7: File Registration Gate
- Triggers immediately after `create_file` in watched locations
- Shows Registration Matrix: what file type → where to register
- Gate is BLOCKING — cannot proceed until registrations complete
- Locations: `.github/rules/*.md` → Reference Index, `.claude/commands/*.md` → COMMANDS.md + ai-manifest.json, `docs/*.md` → ai-manifest.json
**Verification:** Next time a file is created in watched location, MVP 0.7 gate should auto-trigger and block until registered
**Status:** Applied
**Protocol change applied:** Added MVP 0.7 to copilot-instructions.md v5.14.0

---

### [2026-02-02] INSIGHT: Code-map drift detection and remediation pattern

**Context:** Verification task - user asked to review code-map.md against actual repo structure
**Scenario:** G (Verify)
**What happened:** Found 15 gaps between code-map.md documentation and actual repository state. Common drift patterns identified:
1. **Planned-but-not-implemented:** Files listed in code-map that were planned but never created (ai-prompts.md, layout/, preview/, use-wizard.ts)
2. **Created-but-not-documented:** Files that exist but weren't added to code-map (checkbox.tsx, changelog.md, deployment.md)
3. **Config file drift:** Build tool configs change but docs don't update (tailwind.config.ts removed in Tailwind v4, drizzle/ never created)
4. **Version staleness:** Protocol version listed as v5.7.0 but actual is v5.14.0
5. **Structure inaccuracy:** utils/ listed as folder but is actually utils.ts file

**Root cause:** Documentation created during planning phase but not updated after implementation decisions changed. No periodic drift check.
**Fix/Improvement:** Pattern for code-map verification:
1. List actual directories: `list_dir` on key paths (docs/, src/, src/components/, src/lib/)
2. Compare against documented structure section-by-section
3. Check Key Files table against actual files
4. Verify version numbers match current state
5. Flag: items in doc but not in repo, items in repo but not in doc

**Verification:** Run periodic `/docs` or `/verify` on code-map.md to catch drift early
**Status:** Captured
**Proposed protocol change:** None - verification pattern, not protocol gap

---

### [2026-01-30] INSIGHT: Distinction between session-learnings.md and LEARNINGS.md

**Context:** Documentation sync for ai-protocol repo
**Scenario:** A (Plan/Documentation)
**What happened:** Created `docs/session-learnings.md` in ai-protocol repo. User questioned why it wasn't in `docs/_templates/`. This revealed potential confusion about two similarly-named files with different purposes.
**Root cause:** Naming similarity between `docs/session-learnings.md` (technical explanations) and `.github/rules/LEARNINGS.md` (AI self-improvement) can cause confusion.
**Fix/Improvement:** Clear distinction:
- `docs/session-learnings.md` = Technical education, code walkthroughs, ELI5 (generated by `/explain`)
- `.github/rules/LEARNINGS.md` = Process improvement, failures, protocol gaps (generated by `/learn`)
- Templates go in `docs/_templates/`, actual project docs go in `docs/`
**Verification:** When discussing learnings, clarify which type: technical (session-learnings) vs process (LEARNINGS.md)
**Status:** Captured
**Proposed protocol change:** None - documentation knowledge, not a protocol gap

---

### [2026-01-29] INSIGHT: JIRA Publishing with Atlassian Document Format (ADF)

**Context:** Phase 3.4 - JIRA Publishing Implementation
**Scenario:** B (Feature)
**What happened:** Successfully implemented JIRA publishing for User Stories. Created 11 tests covering auth, validation, create, update, and token refresh flows. Key challenge was converting markdown-like text to ADF format required by JIRA API v3.
**Root cause:** N/A - pattern capture
**Fix/Improvement:** JIRA publish pattern for User Stories:
1. JIRA API v3 requires Atlassian Document Format (ADF) for descriptions
2. ADF is a JSON-based structured document format
3. Must convert headings, lists, task items separately
4. User Story format maps well to JIRA Story issue type

**Key patterns:**
- **ADF structure** - `{ type: 'paragraph', content: [{ type: 'text', text: '...' }] }`
- **Headings** - `{ type: 'heading', attrs: { level: 2 }, content: [...] }`
- **Task items** - `{ type: 'taskItem', attrs: { state: 'TODO' | 'DONE' }, content: [...] }`
- **Issue labels** - Add 'brust-creator' label for tracking

**Code snippet:**
```typescript
// ADF paragraph
{
  type: 'paragraph',
  content: [{ type: 'text', text: 'As a user, I want...' }]
}

// ADF heading
{
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text: 'Acceptance Criteria' }]
}
```

**Verification:** All 176 tests passing, publish flow functional
**Status:** Captured
**Proposed protocol change:** None - implementation pattern knowledge

---

### [2026-01-29] INSIGHT: Confluence Publishing with Storage Format pattern

**Context:** Phase 3.3 - Confluence Publishing Implementation
**Scenario:** B (Feature)
**What happened:** Successfully implemented one-click publishing of Business Rules to Confluence. Created API client, route handler, and UI dialog with 10 tests covering create, update, and token refresh flows.
**Root cause:** N/A - pattern capture
**Fix/Improvement:** Confluence publish pattern for document types:
1. Create API client with typed interfaces for responses
2. Use Confluence Storage Format (XHTML with ac:structured-macro)
3. Track publish records in database to enable update vs create logic
4. Auto-refresh expired tokens before API calls
5. Build full page URL from response._links

**Key patterns:**
- **Storage Format** - XHTML with Confluence macros (`<ac:structured-macro ac:name="panel">`)
- **Status badges** - Use `<ac:structured-macro ac:name="status">` with colour parameter
- **Version management** - Fetch current version, increment by 1 for updates
- **Publish records** - Track externalId and externalUrl for republishing

**Code snippet:**
```typescript
// Confluence Storage Format template
<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="title">Rule Metadata</ac:parameter>
  <ac:rich-text-body>
    <table>...</table>
  </ac:rich-text-body>
</ac:structured-macro>

// Status badge
<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="colour">Green</ac:parameter>
  <ac:parameter ac:name="title">APPROVED</ac:parameter>
</ac:structured-macro>
```

**Verification:** All 165 tests passing, publish flow functional
**Status:** Captured
**Proposed protocol change:** None - implementation pattern knowledge

---

### [2026-01-29] INSIGHT: Atlassian OAuth 3LO with AES-256-GCM encryption pattern

**Context:** Phase 3.2 - Atlassian OAuth Implementation
**Scenario:** B (Feature)
**What happened:** Successfully implemented Atlassian OAuth 3LO flow with encrypted token storage. Created 17 tests covering OAuth flow, encryption, and API routes.
**Root cause:** N/A - pattern capture
**Fix/Improvement:** OAuth + encryption pattern for third-party integrations:
1. Create OAuth client with encryption utilities
2. Use AES-256-GCM for token encryption (IV + AuthTag + Ciphertext)
3. State parameter for CSRF protection (simple: use userId, production: use cryptographic token)
4. Fetch accessible resources API to get cloud IDs
5. Store encrypted tokens in database with expiry tracking

**Key patterns:**
- **AES-256-GCM** - Authenticated encryption (prevents tampering)
- **Accessible Resources API** - Required to get cloud ID before API calls
- **Scopes** - Include `offline_access` for refresh tokens
- **Token refresh** - Check expiry before API calls, refresh if needed

**Code snippet:**
```typescript
// Encryption pattern
const iv = crypto.randomBytes(16)
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
const encrypted = cipher.update(token) + cipher.final()
const authTag = cipher.getAuthTag()
return Buffer.concat([iv, authTag, encrypted]).toString('base64')
```

**Verification:** All 155 tests passing, OAuth flow functional
**Status:** Captured
**Proposed protocol change:** None - implementation pattern knowledge

---

### [2026-01-29] INSIGHT: User Story Wizard TDD implementation pattern

**Context:** Phase 2.4 - User Story Wizard Implementation
**Scenario:** B (Feature)
**What happened:** Successfully implemented complete User Story Wizard following TDD workflow. Created 38 new tests (27 store + 11 component) before implementing 6 step components with Gherkin acceptance criteria format.
**Root cause:** N/A - pattern capture
**Fix/Improvement:** TDD pattern for wizard-type features:
1. Create type definitions first (`types/user-story.ts`)
2. Write store tests covering all state transitions (27 tests)
3. Implement Zustand store with persist middleware
4. Write container component tests (11 tests)
5. Implement step components following existing patterns
6. Tests: 138 total passing

**Key patterns:**
- **Gherkin format** for acceptance criteria (Given/When/Then)
- **MoSCoW priority** (must/should/could/wont) for user stories
- **Separate store** for each wizard type (better isolation than shared store)
- **Default DoD items** pre-populated for common requirements

**Verification:** All 138 tests passing, wizard functional
**Status:** Captured
**Proposed protocol change:** None - implementation pattern knowledge

---

### [2026-01-29] OPTIMIZATION: Identified wizard container duplication for future refactor

**Context:** Running /refactor analysis on wizard containers
**Scenario:** C (Refactor analysis)
**What happened:** Found ~90% code duplication between `WizardContainer` and `UserStoryWizardContainer` (180 lines each). Both share: navigation logic, save handlers, UI layout. Differ only in: store hook, step components, document type.
**Root cause:** Deliberate choice during implementation to avoid premature abstraction
**Fix/Improvement:** Apply "Rule of Three" - when adding 3rd document type, extract shared `<WizardShell>` component using render props pattern:
```tsx
<WizardShell
  title="Create X"
  documentType="x"
  store={useStore}
  steps={STEPS}
  renderStep={(step) => <Component />}
/>
```
**Verification:** Defer until 3rd wizard type needed
**Status:** Captured
**Proposed protocol change:** None - future technical debt noted

---

### [2026-01-28] OPTIMIZATION: /explain auto-documentation implemented

**Context:** User requested to preserve explanations for later reading
**Scenario:** A (Plan/Improvement)
**What happened:** Identified that `/explain` outputs were lost after session end. Proposed and implemented auto-save feature.
**Root cause:** Original design was display-only with no persistence
**Fix/Improvement:** Modified `/explain` skill to auto-append to `docs/session-learnings.md`. Added `--no-save` flag for opt-out.
**Verification:** Run `/explain` and check that content appears in `docs/session-learnings.md`
**Status:** Applied
**Protocol change applied:** Updated `.claude/commands/explain.md` and `.github/rules/EXPLAIN.md` to v1.1.0

---

### [2026-01-28] OPTIMIZATION: Zustand persist for wizard state

**Context:** Implementing multi-step wizard with state persistence
**Scenario:** B (Feature)
**What happened:** Used Zustand with `persist` middleware for wizard state management. State automatically syncs to localStorage, surviving page refreshes and browser restarts.
**Root cause:** N/A - this is an optimization discovery
**Fix/Improvement:** Pattern for any multi-step form:
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create()(
  persist(
    (set, get) => ({ /* state and actions */ }),
    { name: 'storage-key', partialize: (state) => ({ /* subset to persist */ }) }
  )
)
```
**Verification:** Wizard data persists after page refresh
**Status:** Captured
**Proposed protocol change:** None - library pattern knowledge

---

### [2026-01-28] INSIGHT: Drizzle $inferSelect/$inferInsert are TypeScript-only

**Context:** Writing unit tests for database schema definitions
**Scenario:** D (Test)
**What happened:** Tests using `users.$inferSelect` and `documents.$inferInsert` failed at runtime with "expected undefined to be defined"
**Root cause:** `$inferSelect` and `$inferInsert` are TypeScript type utilities that exist only at compile time. They're used for type inference (`type User = typeof users.$inferSelect`) but have no runtime value.
**Fix/Improvement:** Test table definitions directly (check column existence) instead of testing type utilities. TypeScript compilation validates type correctness.
**Verification:** Tests pass when checking `users.id`, `users.email` etc. instead of `users.$inferSelect`
**Status:** Captured
**Proposed protocol change:** None - Drizzle ORM library knowledge

---

### [2026-01-28] INSIGHT: Next.js 16 deprecates middleware in favor of proxy

**Context:** Building Next.js app with auth middleware
**Scenario:** B (Feature)
**What happened:** Build warning: "The 'middleware' file convention is deprecated. Please use 'proxy' instead."
**Root cause:** Next.js 16 introduced a new routing system that replaces middleware with proxy
**Fix/Improvement:** Current implementation works but should migrate to proxy pattern in future
**Verification:** Build completes with warning (not error)
**Status:** Captured
**Proposed protocol change:** None - environmental change, not protocol gap

---

### [2026-01-28] INSIGHT: NextAuth session callback requires careful type handling

**Context:** Writing tests for NextAuth session callback
**Scenario:** D (Test)
**What happened:** TypeScript errors when testing session callback due to complex union types
**Root cause:** NextAuth's Session type is a union that requires the `id` field when extended
**Fix/Improvement:** Use `@ts-expect-error` for simplified test mocks and type assertions for result checking
**Verification:** Tests pass with proper type handling
**Status:** Captured
**Proposed protocol change:** None - library-specific knowledge

---

### [2026-01-28] FAILURE: Drizzle config incorrect for Turso

**Context:** Setting up Drizzle ORM configuration for Turso database
**Scenario:** B (Feature/Setup)
**What happened:** TypeScript compilation failed with errors:
- `Type '"turso"' is not assignable to type '"postgresql" | "mysql" | "sqlite"'`
- `'url' does not exist in type '{ accountId: string; databaseId: string; token: string; }'`
**Root cause:** Used outdated drizzle-kit config format. Turso requires `dialect: 'sqlite'` with `driver: 'turso'`, not `dialect: 'turso'`.
**Fix/Improvement:** Correct Drizzle config for Turso:
```typescript
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: { url: '...', authToken: '...' }
})
```
**Verification:** `npx tsc --noEmit` passes without errors
**Status:** Captured
**Proposed protocol change:** None - project-specific configuration knowledge

---

### [2026-01-28] FRICTION: npm project names cannot contain capital letters

**Context:** Initializing Next.js project in directory with capital letters (ai-BRUST-creator)
**Scenario:** B (Feature/Setup)
**What happened:** `npx create-next-app . --yes` failed with error: "name can no longer contain capital letters"
**Root cause:** npm package naming restrictions prohibit uppercase letters; create-next-app uses directory name as package name
**Fix/Improvement:** Initialize in temp directory with lowercase name, copy files to target directory, update package.json name
**Verification:** Successfully initialized and copied project
**Status:** Captured
**Proposed protocol change:** None - environmental constraint

---

### [2026-01-28] INSIGHT: shadcn/ui toast deprecated in favor of sonner

**Context:** Adding shadcn/ui components for BRUST Creator
**Scenario:** B (Feature/Setup)
**What happened:** Command `npx shadcn@latest add toast` failed with message: "The toast component is deprecated. Use the sonner component instead."
**Root cause:** shadcn/ui v3.7+ replaced toast with sonner for better API and features
**Fix/Improvement:** Use `npx shadcn@latest add sonner` instead of toast
**Verification:** Sonner component successfully installed at `src/components/ui/sonner.tsx`
**Status:** Captured
**Proposed protocol change:** None - library version change

---

### [2026-01-28] VIOLATION: Missed code-map.md in documentation structure

**Context:** Planning doc-first approach for BRUST Creator project
**Scenario:** A (Plan)
**What happened:** When adding documentation structure for doc-first + TDD workflow, forgot to include `code-map.md` which is checked at Context Gate (MVP 0) before any tool call.
**Root cause:** Focused on project-specific documentation (requirements, progress, architecture) and didn't cross-reference protocol's Context Gate requirement which explicitly checks for `code-map.md`.
**Fix/Improvement:**
- Added `code-map.md` to documentation files list in plan
- Added note that it's "REQUIRED by protocol"
- Updated Phase 1.1, Critical Files, and Key Files for Resume sections
**Verification:** Check that `code-map.md` is first in documentation checklist for future projects
**Status:** Captured
**Proposed protocol change:** None - protocol already requires code-map.md in Context Gate; this was execution oversight

---

### [2026-01-28] FRICTION: Doc-First + TDD workflow not automatically included in implementation plans

**Context:** User provided detailed implementation plan for BRUST Creator project
**Scenario:** A (Plan)
**What happened:** Original plan focused on code implementation without explicit doc-first and TDD workflow. User had to remind to follow the protocol's documentation and testing requirements.
**Root cause:** Plan was inherited from previous planning session without validating against protocol requirements. The protocol's MVP 5 (Test-First) and MVP 14 (Auto Doc Sync) weren't proactively applied to new implementation plans.
**Fix/Improvement:** When creating implementation plans, ALWAYS include:
1. Documentation creation as first step (code-map.md, requirements.md, progress.md)
2. TDD workflow (failing test → code → verify) for each feature
3. Progress tracking for session resumability in multi-phase projects
**Verification:** Check next implementation plan includes all 3 elements before presenting to user
**Status:** Applied
**Protocol change applied:** Added "Pre-Implementation Checklist (Multi-Phase Projects)" to Scenario B in SCENARIOS.md v1.4.0

---

### [2026-01-27] PROTOCOL_VIOLATION: Missed MVP 0.6 Post-Protocol-Update Verification

**Context:** Implementing /learn command for self-improvement loop
**Scenario:** B (Feature)
**What happened:** After modifying copilot-instructions.md to add /learn reference in MVP 15, did not:
1. Bump version number (v5.6.0 → v5.7.0)
2. Show 🔄 PROTOCOL UPDATED verification block
3. Update PROTOCOL_CHANGELOG.md with version entry
**Root cause:** Focused on core implementation files, forgot that modifying copilot-instructions.md triggers MVP 0.6 requirements
**Fix/Improvement:** When modifying copilot-instructions.md, always:
1. Bump version in header comment
2. Output Post-Protocol-Update Verification block
3. Update PROTOCOL_CHANGELOG.md before syncing
**Verification:** Check next protocol file edit includes all 3 steps
**Status:** Captured
**Proposed protocol change:** None - protocol already covers this in MVP 0.6; this was execution failure, not gap

---

### Applied Learnings
<!-- Learnings incorporated into protocol -->

---

### Rejected Learnings
<!-- Reviewed but not applied (with reasons) -->

---

## Authority Rules

| Action | Authority |
|--------|-----------|
| Add learning entry | **Auto** (always allowed) |
| Update learning status | **Auto** (always allowed) |
| Modify copilot-instructions.md | **Requires approval** |
| Modify rules/*.md files | **Requires approval** |

## Update Workflow

```
Capture Learning -> Status: Captured
        |
Identify protocol gap -> Status: Proposed
        |
User reviews -> [Approve / Reject]
        |-- Approve -> Update protocol -> Status: Applied
        |-- Reject -> Document reason -> Status: Rejected
```
