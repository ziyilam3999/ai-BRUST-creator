# Session Learnings & Explanations

> **Purpose:** Capture technical explanations, patterns, and insights from development sessions for future reference.

---

## Session: 2026-02-05 (AI-Guided Creation - Phase 1 Foundation)

### [2026-02-05] Explanation: Phase 1 Foundation Modules

**Scope:** feature
**Type:** AI-Guided Document Creation - Foundation Layer
**Complexity:** Medium (6 modules, 105 tests)

**What was built:**
Phase 1 establishes the foundation for AI-guided document creation - a conversational interface where an AI assistant helps users build Business Rules and User Stories section by section through dialogue.

**6 Modules Created:**

1. **Guided Creator Store** (`src/stores/guided-creator-store.ts`)
   - Zustand store with `persist` middleware for session survival across page refreshes
   - Tracks: document type, section states, conversation messages, completion progress
   - Key pattern: `partialize` to exclude functions and transient state from localStorage
   - `setAiThinking(true)` sets BOTH `isAiThinking` AND `isManualEditBlocked` (prevents user edits during AI generation)

2. **Completion Calculator** (`src/lib/guided/completion-calculator.ts`)
   - Section-weighted scoring: Business Rules have 6 sections (weights sum to 100), User Stories have 5
   - Per-field scoring with partial credit: strings get partial credit based on length vs `minLength`
   - `ruleStatement` weighted highest (30%) because it's the core business logic

3. **Advice Engine** (`src/lib/guided/advice-engine.ts`)
   - 4 threshold levels: minimal (<40%), draft (40-59%), good (60-79%), comprehensive (80%+)
   - Each level returns: message, canSave boolean, and suggestedAction
   - Used to drive UI hints and enable/disable save/submit buttons

4. **Guided Prompts** (`src/lib/ai/guided-prompts.ts`)
   - System prompt with SBVR (Business Rules) and INVEST (User Stories) domain knowledge
   - Per-section `initial` prompt with multiple-choice suggestions (A/B/C/D pattern)
   - Per-section `followUp(input)` function for contextual response
   - Output format: JSON with `type: "draft_proposal" | "question" | "advice"`

5. **Input Sanitizer** (`src/lib/ai/input-sanitizer.ts`)
   - Prompt injection prevention: 6 patterns (`ignore previous`, `system:`, `[INST]`, `<|...|>`)
   - XSS prevention: HTML entity escaping (`<>&"'`)
   - `isPromptInjectionAttempt()` for logging/monitoring without modifying input
   - `sanitizeContent()` for recursive object/array sanitization

6. **Guided API Route** (`src/app/api/ai/guided/route.ts`)
   - Auth check → Rate limit → Validate → Sanitize → Build prompt → Stream response
   - In-memory rate limiter (20 req/min per user) with headers
   - Context-aware system prompt: base + section guidance + action context (regenerate/edit)

**Key Bug Fixes:**

```typescript
// BUG: Regex global flag maintains state between .test() calls
// BEFORE (broken):
const patterns = [/ignore previous/gi]  // /g flag!
patterns.some(p => p.test(input))       // Works first time
patterns.some(p => p.test(input))       // FAILS! lastIndex advanced

// AFTER (fixed):
const patterns = [/ignore previous/i]   // No /g flag
patterns.some(p => p.test(input))       // Always works
```

```typescript
// BUG: HTML escaping preserves text (by design)
// '<img onerror="alert(1)">' → '&lt;img onerror=&quot;alert(1)&quot;&gt;'
// 'onerror' text is still there, but &lt;img can't execute as HTML
```

**Architecture Decision:**
- Store uses weighted completion (not binary done/not-done) because partial progress matters for long documents
- Rate limiting is in-memory for dev; comment documents Redis migration path for production
- Sanitizer creates fresh regex instances per call to avoid global flag state bugs

**ELI5:** Imagine you're building a document with a helpful assistant. Phase 1 built the assistant's brain (how to track what you've done), its knowledge (what to ask about Business Rules vs User Stories), its safety glasses (blocking bad inputs), and its walkie-talkie (streaming conversation back and forth). The actual conversation UI comes in Phase 2.

---

## Session: 2026-02-05 (AI-Guided Creation - Phase 2 UI Components)

### [2026-02-05] Explanation: Phase 2 Guided Creation UI

**Scope:** feature
**Type:** AI-Guided Document Creation - UI Layer
**Complexity:** Medium (9 components, 2 routes, 35 tests)

**What was built:**
Phase 2 creates the conversational UI for AI-guided document creation - a split-panel layout where users chat with an AI assistant on the left while the document builds itself on the right.

**9 Components Created:**

1. **GuidedCreatorContainer** (`guided-creator-container.tsx`)
   - Top-level split-panel layout: ConversationPanel (left 50%) + DocumentPanel (right 50%)
   - Header: document type label, completion %, Save Draft button, Close button
   - Calls `initSession(documentType)` on mount via `useEffect`

2. **ConversationPanel** (`conversation-panel.tsx`)
   - Scrollable message list with auto-scroll on new messages
   - Textarea input with Enter-to-send (Shift+Enter for newline)
   - Send button disabled when input is empty
   - "AI is thinking..." indicator with spinner when `isAiThinking` is true

3. **DocumentPanel** (`document-panel.tsx`)
   - Renders SectionCard for each section based on `documentType`
   - BR: 6 sections (basicInfo, description, ruleStatement, exceptions, examples, metadata)
   - US: 5 sections (basicInfo, storyStatement, acceptanceCriteria, definitionOfDone, relatedItems)
   - CompletionSummary pinned at bottom

4. **SectionCard** (`section-card.tsx`) — Largest component
   - **View mode (SectionDisplay):** Formatted content per section type
     - ruleStatement: IF (blue) / THEN (green) / ELSE (orange) color-coded
     - storyStatement: "As a" / "I want" / "So that" format
     - basicInfo: 2-column grid
     - Lists: bulleted ul
   - **Edit mode (FieldEditor):** Inline form matching field schema
     - 5 field types: text, textarea, select, date, list
     - Separate field configs for BR (`BR_SECTION_FIELDS`) and US (`US_SECTION_FIELDS`)
   - Edit button hidden when `isManualEditBlocked` (AI is thinking)
   - Active ring (`ring-2 ring-primary`) when section is current
   - Opacity reduced for `not_started` sections

5. **SectionNavigation** (`section-navigation.tsx`)
   - Horizontal scrollable nav bar with section buttons
   - Status icons: Circle (not started), Pencil (in progress), CheckCircle yellow (draft), CheckCircle green (complete)

6. **CompletionSummary** (`completion-summary.tsx`)
   - Progress bar + percentage from store's `overallCompletion`
   - Advice message + suggested action from `getCompletionAdvice()`
   - Color-coded by level: red (minimal), yellow (draft), blue (good), green (comprehensive)

7. **MessageBubble** (`message-bubble.tsx`)
   - AI messages: left-aligned, "Assistant" label, muted background
   - User messages: right-aligned, "You" label, primary background
   - System messages: centered, muted text

8. **ActionBar** (`action-bar.tsx`)
   - 4 buttons for AI draft review: Accept, Edit, Regenerate, Skip
   - Accept calls `acceptDraft(section)`, Edit calls `editSection(section)`

9. **Barrel exports** (`index.ts`)

**Key Pattern: BR vs US Field Configs**

```typescript
// SectionCard uses separate field configs per document type
const fieldMap = documentType === 'business_rule' ? BR_SECTION_FIELDS : US_SECTION_FIELDS
const fields = fieldMap[section] || []
```

This allows the same SectionCard component to render different forms for Business Rules (6 sections) and User Stories (5 sections) without branching logic.

**Test Fix: getByText vs getByRole**

```typescript
// BEFORE (fails - "Business Rule" matches header AND message bubble)
expect(screen.getByText(/Business Rule/i)).toBeInTheDocument()

// AFTER (passes - specifically targets the h1 heading)
expect(screen.getByRole('heading', { name: /Business Rule/i })).toBeInTheDocument()
```

When testing containers that render child components with overlapping text, use role-based selectors instead of text-based selectors to avoid ambiguity.

**ELI5:** Phase 1 gave the assistant its brain and voice. Phase 2 gave it a face. Now there's a screen split in two: the left side is like a text conversation with the assistant, and the right side is the document being built piece by piece. Each piece shows up as a card that turns from gray (not started) to green (done), and you can click a pencil to edit any card yourself.

**Key Concept:** Zustand's `persist` middleware with `partialize` lets you selectively store state in localStorage - critical for SSR compatibility with Next.js where the full store might contain non-serializable items.

---

## Session: 2026-02-04 (Context7 MCP Installation)

### [2026-02-04 HH:MM] Explanation: Context7 MCP Setup

**Scope:** setup
**Type:** MCP Installation

**What is Context7?**
Context7 is an MCP (Model Context Protocol) server by Upstash that fetches up-to-date documentation for any library or framework directly in your AI coding assistant.

**Why use it?**
AI training data can be outdated. Context7 queries live documentation so you get current APIs, patterns, and examples.

**Installation (3 environments):**

1. **Claude Code CLI + VS Code Extension** - Edit `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

2. **VS Code (Copilot Chat)** - Add to `.vscode/mcp.json` or user settings.

**Usage Pattern:**
```
Step 1: resolve-library-id → "drizzle-orm" → /drizzle-team/drizzle-orm-docs
Step 2: query-docs → libraryId + "SQLite migrations" → Code examples returned
```

**Example queries:**
- "Use context7 to get Next.js App Router middleware docs"
- "Use context7 to find Playwright testing examples"

🧒 **ELI5:** Instead of using an old textbook, you now have a magic librarian who can instantly grab the newest version of any programming manual and read you the exact page you need.

**Documentation updated:**
- `docs/ai-manifest.json` v1.2.0 - Added `mcpServers.context7` section
- `.github/rules/LEARNINGS.md` - Added insight entry

---

## Session: 2026-02-03 (Evening - Local Testing & Bug Fixes)

### [2026-02-03 20:30] Explanation: BRUST Creator Local Testing Bug Fixes

**Scope:** session summary
**Type:** Bug Fixes (8 issues found and resolved)

**Context:**

User completed local environment setup (Turso DB, GitHub OAuth, env vars) and began testing the BRUST Creator app. Encountered 6 bugs during the testing workflow.

---

#### Bug 1: 404 After OAuth Login

**Symptom:** After successful GitHub OAuth login, redirected to `/dashboard` which showed 404.

**Root Cause:** Login page had wrong `callbackUrl`:

```typescript
// Before (wrong)
signIn("github", { callbackUrl: "/dashboard" });

// After (correct)
signIn("github", { callbackUrl: "/history" });
```

**Why:** The `/dashboard` route doesn't exist - the app uses `/(dashboard)/history` as the main page.

🧒 **ELI5:** It's like getting directions to a restaurant that closed down. We updated the directions to send you to the restaurant that's actually open.

---

#### Bug 2: FOREIGN KEY Constraint Failed

**Symptom:** Creating a document failed with "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed".

**Root Cause:** NextAuth creates session tokens but doesn't create database records. The `documents` table has a foreign key to `users`, but no user existed.

**Fix:** Added `signIn` callback in `auth-options.ts`:

```typescript
callbacks: {
  signIn: async ({ user, account }) => {
    if (account?.provider === "github") {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.githubId, user.id),
      });
      
      if (!existingUser) {
        await db.insert(users).values({
          id: crypto.randomUUID(),
          githubId: user.id,
          email: user.email ?? "",
          name: user.name ?? "",
        });
      }
    }
    return true;
  },
  // ... other callbacks
}
```

🧒 **ELI5:** Imagine a library that lets you borrow books (documents), but you need a library card (user record) first. GitHub OAuth gave you a valid ID, but we forgot to issue the library card. Now we automatically create the card on first login.

---

#### Bug 3: No Way to Change Document Status

**Symptom:** After saving a document as "Draft", there was no button to submit it for review.

**Root Cause:** Initial implementation focused on CRUD (Create/Read/Update/Delete), but not workflow transitions.

**Fix:** Added status change buttons to document detail page:

```tsx
{document.status === "draft" && (
  <Button onClick={() => handleStatusChange("pending_review")}>
    Submit for Review
  </Button>
)}
{document.status === "pending_review" && (
  <Button onClick={() => handleStatusChange("approved")}>
    Approve
  </Button>
)}
```

🧒 **ELI5:** It's like filling out a form but there's no "Submit" button. We added the button so you can actually send your form for approval.

---

#### Bug 4: No Way to Exit Wizard

**Symptom:** Once inside the wizard, there was no X button or back link to return to the history page.

**Root Cause:** Wizard designed as a focused modal flow, but forgot to add an escape hatch.

**Fix:** Added X close button to both wizard containers:

```tsx
<Link href="/history" className="absolute top-4 right-4">
  <Button variant="ghost" size="icon">
    <X className="h-5 w-5" />
  </Button>
</Link>
```

🧒 **ELI5:** You walked into a room that had no door handle on the inside. We added a door handle so you can leave whenever you want.

---

#### Bug 5: No Way to Create User Story

**Symptom:** Header only showed "New Business Rule" link. "+ New Document" button only created Business Rules.

**Root Cause:** User Story feature was implemented but UI navigation wasn't updated to expose it.

**Fix:** 
1. Added "New User Story" link to header navigation
2. Converted "+ New Document" button to dropdown with both options

```tsx
// Header - added second link
<Link href="/user-story/new">New User Story</Link>

// History page - dropdown instead of single link
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>
      <Plus /> New Document <ChevronDown />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem asChild>
      <Link href="/business-rule/new">Business Rule</Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link href="/user-story/new">User Story</Link>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

🧒 **ELI5:** The menu only listed "hamburgers" but we also make "hot dogs". We added hot dogs to the menu so customers can order them.

---

#### Bug 6: Missing Dropdown Menu Component

**Symptom:** After adding dropdown code, app crashed with "Module not found: @/components/ui/dropdown-menu"

**Root Cause:** shadcn component not installed.

**Fix:** 
```bash
npx shadcn@latest add dropdown-menu
```

🧒 **ELI5:** We tried to use a tool that wasn't in the toolbox. We went to the hardware store and bought it.

---

#### Bug 7: User Story Detail Shows Business Rule Template

**Symptom:** Clicking on a User Story in history showed Business Rule fields (Rule ID, IF/THEN, Exceptions) instead of User Story fields (As a/I want/So that, Acceptance Criteria).

**Root Cause:** The history page had a hardcoded link for ALL documents:

```tsx
// Before (wrong - all docs go to business-rule)
<Link href={`/business-rule/${doc.id}`}>

// After (correct - route by document type)
<Link href={`/${doc.documentType === 'user_story' ? 'user-story' : 'business-rule'}/${doc.id}`}>
```

**Why:** When User Story was added, the detail page was created at `/user-story/[id]` but the history table wasn't updated to route to it.

🧒 **ELI5:** All letters were being delivered to the same house, even if they had different addresses. Now we check the address and deliver to the correct house.

---

#### Bug 8: No Way to Submit User Story for Review

**Symptom:** User Story detail page showed document content but no "Submit for Review" or "Approve" buttons.

**Root Cause:** Bug 3 fix added status buttons to Business Rule page only. User Story page was forgotten.

**Fix:** Added the same status handling to User Story detail page:

```tsx
// Added state
const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

// Added handler
const handleStatusChange = async (newStatus: string) => {
  setIsUpdatingStatus(true)
  const response = await fetch(`/api/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus }),
  })
  // ... update local state
}

// Added buttons
{document.status === 'draft' && (
  <Button onClick={() => handleStatusChange('review')}>Submit for Review</Button>
)}
{document.status === 'review' && (
  <Button onClick={() => handleStatusChange('approved')}>Approve</Button>
)}
```

🧒 **ELI5:** We fixed the "Submit" button on one form but forgot the other form was missing the same button. Now both forms have all the buttons they need.

---

### Technical Summary

| Bug | File Modified | Type |
|-----|---------------|------|
| 404 after login | `src/app/(auth)/login/page.tsx` | Wrong redirect |
| FK constraint | `src/lib/auth/auth-options.ts` | Missing user creation |
| No status change | `src/app/(dashboard)/business-rule/[id]/page.tsx` | Missing UI |
| No wizard exit | `src/components/wizard/*.tsx` (both) | Missing navigation |
| No User Story link | `src/app/(dashboard)/layout.tsx`, `history/page.tsx` | Missing UI |
| Missing component | `src/components/ui/dropdown-menu.tsx` | Not installed |
| US shows BR template | `src/app/(dashboard)/history/page.tsx` | Wrong route |
| No Submit on US | `src/app/(dashboard)/user-story/[id]/page.tsx` | Missing UI |

---

### Pending Decisions (Saved for Later)

1. **Examples Step UX:** Remove, fix placeholders, or redesign?
2. **BR → US Conversion:** No auto-conversion, "Generate Stories" button, or auto-generate?
3. **Edit Functionality:** Single-page edit form vs wizard reuse? (Recommended: Option B - single edit page)

---

## Session: 2026-02-03 (Afternoon - Sync Script CWD Fix)

### [2026-02-03 14:15] Explanation: .NET vs PowerShell Current Directory Desync

**Scope:** debug → fix
**Type:** Infrastructure Bug Fix

**Problem:**

The "copilot instructions backups" folder kept resurrecting in `ai-BRUST-creator` instead of staying in `ai-protocol`, despite running the sync script from the correct location.

**Root Cause:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VS CODE TERMINAL: TWO SEPARATE CURRENT DIRECTORIES                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PowerShell's $PWD:              .NET's GetCurrentDirectory():              │
│  ─────────────────               ────────────────────────────               │
│  ai-protocol                     ai-BRUST-creator                           │
│  (where you cd'd to)             (VS Code workspace root)                   │
│                                                                              │
│  Commands that use $PWD:         Commands that use .NET CWD:                │
│  • Get-Location                  • [System.IO.Path]::GetFullPath()          │
│  • Resolve-Path                  • [System.IO.Directory]::GetFiles()        │
│  • PowerShell relative paths     • .NET relative path resolution            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Critical Code Path (Line 1389-1390):**

```powershell
# This uses .NET's CWD (wrong location)
$TargetPath = [System.IO.Path]::GetFullPath($targetPath)

# $targetPath = "copilot instructions backups\GetSpace" (relative)
# Expected: C:\...\ai-protocol\copilot instructions backups\GetSpace
# Actual:   C:\...\ai-BRUST-creator\copilot instructions backups\GetSpace
```

**Fix Applied (Line 1770):**

```powershell
# Sync .NET CWD with PowerShell's $PWD before any path operations
[System.IO.Directory]::SetCurrentDirectory($PWD.Path)
```

**Verification:**

| Test | Before Fix | After Fix |
|------|------------|-----------|
| Backup in ai-BRUST-creator | ✅ True (WRONG) | ❌ False (CORRECT) |
| Backup in ai-protocol | ✅ True | ✅ True |
| Sync script passes | ✅ 79 tests | ✅ 79 tests |

🧒 **ELI5:** 

Imagine you're in your bedroom (PowerShell), but when you ask a friend (.NET) to put your toys away, they think you're in the living room (VS Code workspace). So they put your toys in the wrong room! 

The fix tells your friend "Hey, I'm actually in the bedroom" before asking them to do anything with your stuff.

**Key Takeaway:**

When writing PowerShell scripts that:
1. Run in VS Code terminal
2. Use .NET path functions
3. Depend on relative paths

Always add at script start:
```powershell
[System.IO.Directory]::SetCurrentDirectory($PWD.Path)
```

---

## Session: 2026-02-03 (Skills Installation)

### [2026-02-03 13:20] Explanation: External Agent Skills Installation

**Scope:** session
**Type:** Configuration / Infrastructure

**What happened:**

| # | Action | Result |
|---|--------|--------|
| 1 | Verified `~/.agents/skills/` folder exists | ✅ Contains 8 skills |
| 2 | Checked if symlinks exist in workspace | ❌ No symlinks found |
| 3 | Attempted `npx skills add` with --local | ❌ Auth failed (private repo?) |
| 4 | Copied skills from global to local | ✅ 7 skills copied |
| 5 | Updated SKILLS.md v1.0.0 → v1.1.0 | ✅ Accurate info |
| 6 | Ran sync from ai-protocol | ✅ All repos synced |

**Key insight:**

The `npx skills add --symlink` option doesn't create symlinks into workspaces. It stores skills globally at `~/.agents/skills/` but relies on the AI agent having access to that folder — which GitHub Copilot/VS Code **cannot** read (outside workspace boundary).

**Solution pattern:**

```
┌─────────────────────────────────────────────────────────────┐
│  SKILLS INSTALLATION ON WINDOWS                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Global Install (discovery):                                 │
│    npx skills add owner/repo --global                       │
│    → Stores at: ~/.agents/skills/                           │
│    → Useful for: find-skills meta-tool                      │
│                                                              │
│  Local Install (usage):                                      │
│    Copy-Item "~/.agents/skills/[name]" ".claude/skills/"    │
│    → Stores at: .claude/skills/[name]/                      │
│    → AI can read: ✅ Yes (inside workspace)                 │
│    → Sync to repos: ✅ Via sync script                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Files changed:**

| File | Change |
|------|--------|
| `.claude/skills/vercel-react-best-practices/` | Added (57 React rules) |
| `.claude/skills/web-design-guidelines/` | Added |
| `.claude/skills/vercel-composition-patterns/` | Added |
| `.claude/skills/webapp-testing/` | Added (Playwright toolkit) |
| `.claude/skills/frontend-design/` | Added |
| `.claude/skills/mcp-builder/` | Added |
| `.claude/skills/skill-creator/` | Added |
| `.github/rules/SKILLS.md` | Updated v1.0.0 → v1.1.0 |
| `docs/progress.md` | Updated with task completion |
| `.github/rules/LEARNINGS.md` | Added friction learning |

🧒 **ELI5:** Imagine you have a box of special LEGO instructions at home (global skills), but your robot helper can only see things in your room (workspace). We had to photocopy those instructions and put them in your room so the robot could use them too!

**Key Concept:** AI workspace boundaries prevent access to user home directories. Skills must be copied into the project for the AI to use them.

---

## Session: 2026-02-03 (Command Enhancement - HIGH IMPACT Gate)

### [2026-02-03 15:30] Explanation: /learn HIGH IMPACT Gate Enhancement

**Scope:** file
**Type:** Command enhancement (Scenario B)

**Context:** Enhancing `/learn` command with priority-based triage inspired by wshobson/commands patterns (monitor-setup, standup-notes)

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `.claude/commands/learn.md` | modify | Added HIGH IMPACT ALERT GATE, Priority Assignment |
| 2 | `.github/rules/COMMANDS.md` | modify | Updated /learn description with P1-P4 priority |
| 3 | `.github/rules/LEARNINGS.md` | modify | Added learning entry for pattern |

**How it works:**

### Priority Assignment System

```
Keywords → Priority → Action
─────────────────────────────
security, auth, token, delete, breaking → P1 (CRITICAL) → Require ack
user-facing, blocked, deployment       → P2 (URGENT)   → Alert + suggest fix
slow, timeout, memory, deprecated      → P3 (WARNING)  → Normal fix prompt
[everything else]                      → P4 (INFO)     → Normal capture
```

### Gate Flow

```
User: /learn failure

AI: 
┌────────────────────────────────────────┐
│ 🚨 HIGH IMPACT DETECTED               │
│ Priority: P1 (CRITICAL)               │
│ Keywords: [security]                  │
│                                       │
│ Reply "Acknowledge" to proceed        │
└────────────────────────────────────────┘

User: Acknowledge

AI: [Proceeds with capture including Priority/Impact fields]
```

### Entry Format Enhancement

**Before:**
```markdown
**Context:** [task]
**Status:** Captured
```

**After:**
```markdown
**Priority:** P1 (CRITICAL)
**Impact:** SECURITY
**Context:** [task]
**Status:** Captured
**Immediate Actions:** [for P1/P2 only]
```

🧒 **ELI5:** Like a hospital triage system. Serious issues (security breaches = heart attacks) get red wristbands and immediate attention. Minor issues (slow performance = paper cuts) wait their turn. Nothing gets lost, but emergencies come first.

---

### [2026-02-03 15:45] Explanation: /metrics Dashboard Enhancement

**Scope:** file
**Type:** Command enhancement (Scenario B)

**Context:** Enhancing `/metrics` command with visual dashboard inspired by wshobson/commands patterns (monitor-setup, compliance-check)

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `.claude/commands/metrics.md` | modify | v1.0.0 → v1.1.0, added 9 dashboard sections |

**How it works:**

### Dashboard Architecture

```
╔═══════════════════════════════════════════╗
║         📊 PROTOCOL DASHBOARD             ║
╠═══════════════════════════════════════════╣
║  1. HEALTH SCORE                          ║
║     [██████░░░░░░] 52% 🟡 WARNING         ║
╠═══════════════════════════════════════════╣
║  2. COMPLIANCE TABLE     │  3. TREND      ║
║  ┌───────┬───────┐       │  5│    ╭─╮     ║
║  │ Type  │ Count │       │  3│  ╭─╯ ╰╮    ║
║  ├───────┼───────┤       │  1│╭─╯     ╰── ║
║  │FAILURE│ 2 🔴  │       │   └──────────  ║
║  │INSIGHT│ 5     │       │   M T W T F S  ║
╠═══════════════════════════════════════════╣
║  4. GATE HEATMAP (7 sessions × 6 gates)   ║
║     🟢🟢🟡🟢🟢🟢 │ 🟢🔴🟢🟢🟢🟢 │ ...    ║
╠═══════════════════════════════════════════╣
║  5. ALERTS                                ║
║  🔴 CRITICAL: Pre-Commit missed (2x)      ║
║  🟡 WARNING: MCR skip rate 40%            ║
╠═══════════════════════════════════════════╣
║  6. HISTORICAL │ 7. TOP ISSUES │ 8. RECS  ║
║  This: 72%     │ #1 Pre-Commit │ Fix gate ║
║  Last: 65% ↑   │ #2 MCR skip   │ Review   ║
╚═══════════════════════════════════════════╝
```

### Alert Thresholds

| Level | Trigger | Example |
|-------|---------|---------|
| 🔴 CRITICAL | VIOLATION any, FAILURE >3/wk, Health <60% | Security issue |
| 🟡 WARNING | FRICTION >5/wk, MCR skip >20%, Health <85% | Process slowdown |
| 🟢 GOOD | Health ≥85%, improving trend | Healthy protocol |

🧒 **ELI5:** Instead of just getting a grade at the end of the semester, you get a big colorful poster showing every quiz, which subjects improved, and even a graph showing if you're getting smarter over time. One glance tells you exactly where you stand.

---

### [2026-02-03 16:00] Explanation: /explain Integration Enhancement

**Scope:** file
**Type:** Command enhancement (Scenario B)

**Context:** Enhancing `/explain` command with complexity scoring and LEARNINGS.md cross-reference

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `.claude/commands/explain.md` | modify | Added complexity scope, cross-reference, pattern detection |

**How it works:**

### Knowledge Graph Integration

```
/explain [something]
       │
       ▼
┌─────────────────────────┐
│ Step 3: Generate        │
│ Explanation             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│ Step 3.5: LEARNINGS.md Cross-Reference                  │
│                                                         │
│ 1. Read LEARNINGS.md                                    │
│ 2. Extract keywords from explanation                    │
│ 3. Match against learning entries (>60% overlap)        │
│ 4. Surface related learnings                            │
│ 5. Detect recurring patterns                            │
│ 6. Suggest /learn if new pattern                        │
└───────────┬─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Step 4: Auto-Document   │
│ → session-learnings.md  │
└─────────────────────────┘
```

### Complexity Analysis (New Scope)

```
/explain complexity

📚 EXPLANATION: Complexity Analysis

## Complexity Scores
| Metric | Score | Status |
|--------|-------|--------|
| Cyclomatic | 12 | 🔴 High |    ← >10 triggers warning
| Cognitive | 8 | 🟢 Low |
| Lines | 45 | 🟡 Medium |

## Hotspots
| Location | Score | Suggestion |
|----------|-------|------------|
| auth.ts:45 | 15 | Extract helper functions |

🧒 ELI5: Like a recipe with too many steps
```

🧒 **ELI5:** Imagine explaining cookies to a friend. Before: just the recipe. Now: "Hey, remember last time you asked about measuring? This is related!" AND you count steps - if too complicated, suggest breaking into smaller recipes. /explain now connects new knowledge to old AND warns about complexity.

---

### [2026-02-03 16:15] Explanation: Auto-trigger /metrics at Commit Intervals

**Scope:** file
**Type:** Workflow integration (Scenario B)

**Context:** Adding passive health monitoring to commit workflow in GATES.md

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `.github/rules/GATES.md` | modify | v2.6.0 → v2.7.0, added Post-Commit Metrics Snapshot |

**How it works:**

### Commit-Based Trigger Flow

```
Commit #1 ─────┐
Commit #2 ─────┤
Commit #3 ─────┼──→ Counter tracking (no output)
Commit #4 ─────┤
Commit #5 ─────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ 📊 METRICS SNAPSHOT                     │
│ - Health: 72% 🟡 WARNING                │
│ - This session: 2 violations            │
│ - Trend: ↑ Improving                    │
│                                          │
│ 💡 Consider reviewing top issues        │
└─────────────────────────────────────────┘
       │
       ▼
Counter reset, repeat cycle
```

### Escalation Path

| Health | Status | Action |
|--------|--------|--------|
| ≥85% | 🟢 HEALTHY | Snapshot only |
| 60-84% | 🟡 WARNING | Suggest `/metrics` |
| <60% | 🔴 CRITICAL | Prompt `/metrics` + trigger `/learn` |

🧒 **ELI5:** Like a car dashboard that shows a "check engine" light. Every 5 trips, the car flashes a health summary. You don't have to think about it - if something's wrong, you'll know.

---

### [2026-02-03 16:20] Explanation: Health-Based Auto-Learn Trigger

**Scope:** file
**Type:** Workflow integration (Scenario B)

**Context:** Adding feedback loop from /metrics to /learn in metrics.md v1.2.0

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `.claude/commands/metrics.md` | modify | v1.1.0 → v1.2.0, added Section 1.1 Health-Based Auto-Learn |

**How it works:**

### Feedback Loop Pattern

```
/metrics runs
       │
       ▼
Calculate Health Score
       │
       ▼
┌──────────────────────┐
│ Health < 60%?        │
│                      │
│    YES               │──→ Continue to dashboard
│     │                │
│     ▼                │
│ 🔴 CRITICAL HEALTH   │
│                      │
│ AUTO-LEARN TRIGGERED │
│ - Category: VIOLATION│
│ - Priority: P1       │
│                      │
│ 🚨 HIGH IMPACT ALERT │
│ Require Ack:         │
│ - "Ack" → Capture    │
│ - "Skip learn"       │
│ - "Fix now" → Both   │
└──────────────────────┘
```

### Pre-Filled Learning Entry

When auto-triggered, the learning entry is pre-populated:
- **Category:** PROTOCOL_VIOLATION (from threshold breach)
- **Root cause:** Top issue from dashboard
- **Fix:** Recommended action from dashboard
- **Verification:** Run `/metrics` and confirm Health ≥ 60%

This reduces friction - user just acknowledges instead of writing.

🧒 **ELI5:** Imagine a doctor's check-up (metrics). If your health score is bad (< 60%), the doctor doesn't just say "you're unhealthy" - they automatically write it in your medical record (auto-learn) AND ask "do you want to start treatment right now?" (Fix now). You can skip it, but you have to acknowledge you saw the warning.

---

## Session: 2026-02-03 (Protocol Enhancement v5.15.0 - Phase 3)

### [2026-02-03 11:15] Explanation: Flutter Skill & Skills System Architecture

**Scope:** session
**Type:** Feature implementation (Scenario B)

**Context:** Phase 3 of protocol enhancement - creating Flutter skill and documenting skills system

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `.claude/skills/flutter/SKILL.md` | add | Flutter best practices skill |
| 2 | `.github/rules/SKILLS.md` | add | Skills system documentation |
| 3 | `sync_config.yaml` | modify | Added `.claude/skills` to sync_items |
| 4 | `copilot-instructions.md` | modify | v5.14.0 → v5.15.0, added SKILLS.md to Reference Index |

**How it works:**

### Skills vs Commands Architecture

| Aspect | Commands | Skills |
|--------|----------|--------|
| Location | `.claude/commands/*.md` | `.claude/skills/*/SKILL.md` |
| Invocation | Explicit `/command` | Auto-triggered by context |
| Loading | Full file when called | Progressive (3 levels) |
| Content | Instructions only | Instructions + patterns + examples |

### Progressive Loading (Token Efficiency)

```
Level 1 (Startup): ~100 tokens
└── YAML frontmatter only
    - name: flutter-best-practices
    - description: "Flutter/Dart development patterns..."
    - globs: ["**/*.dart", "**/pubspec.yaml"]

Level 2 (Triggered): <5k tokens
└── Full SKILL.md body loaded when .dart file opened

Level 3 (As needed): Unlimited
└── Bundled files, scripts (none for Flutter skill)
```

### Flutter Skill Content

```markdown
---
name: flutter-best-practices
description: Flutter/Dart patterns including Riverpod, go_router, mobile best practices
globs:
  - "**/*.dart"
  - "**/pubspec.yaml"
alwaysApply: false
---

# Riverpod State Management
- Use `@riverpod` annotation for controllers
- Follow: private fields → service getters → build() → public methods → private methods

# go_router Navigation
- Use `context.push()` with args, `context.go()` for replace

# Widget Patterns
- ConsumerWidget for state, ConsumerStatefulWidget for lifecycle

# Naming Conventions
- Files: snake_case (user_model.dart)
- Classes: PascalCase (UserModel)
- Booleans: is/has/can prefix (isLoading)

# Testing
- Use ProviderContainer for isolated tests
- Mock services with overrides
```

### Sync Configuration

Added `.claude/skills` to sync_config.yaml:
```yaml
sync_items:
  - .github/copilot-instructions.md
  - .github/rules/
  - .claude/commands/
  - .claude/settings.local.json
  - .claude/skills        # NEW - skills folder sync
  - tools/*.ps1
```

### Sync Results

- 7 repos synced successfully
- copilot-instructions.md: winner = ai-BRUST-creator (v5.15.0)
- 60 commands synced across repos
- Skills folder manually propagated (sync script needs enhancement)

🧒 **ELI5:** Imagine skills are like having a helper who automatically knows about different topics. When you open a Dart file, it's like wearing a "Flutter expert" hat - you automatically get Flutter knowledge without asking. Commands are like calling a specific expert by name ("Hey TDD guy, help me!"). Skills load in pieces (like reading chapter titles first, then the full book when needed) so your brain (the AI) doesn't get overwhelmed.

**Key Concepts:**
- Skills auto-trigger based on file patterns (globs)
- Progressive loading prevents token exhaustion
- Commands for explicit workflows, skills for ambient knowledge

---

## Session: 2026-02-03 (Protocol Enhancement v5.15.0 - Phase 1)

### [2026-02-03 12:00] Explanation: External Skills Installation & New Commands

**Scope:** session
**Type:** Feature implementation (Scenario B)

**Context:** Phase 1 of protocol enhancement from v5.14.0 → v5.15.0

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | External skills | add | 7 skills installed via npx skills CLI |
| 2 | `.claude/commands/tdd.md` | add | Red→Green→Refactor TDD workflow |
| 3 | `.claude/commands/context-save.md` | add | Session persistence command |
| 4 | `.claude/commands/context-restore.md` | add | Session resumption command |
| 5 | `.claude/commands/security-scan.md` | add | OWASP Top 10 security audit |
| 6 | `.claude/commands/performance.md` | add | Bundle/vitals analysis |
| 7 | `.claude/commands/incident.md` | add | Production incident response |

**How it works:**

### External Skills (Task 1.1)
```
npx skills add vercel-labs/agent-skills
  → vercel-react-best-practices (40+ React rules)
  → web-design-guidelines (100+ UI/UX rules)
  → vercel-composition-patterns (React patterns)
  → find-skills (meta-skill for discovery)

npx skills add anthropics/skills
  → webapp-testing (Playwright patterns)
  → frontend-design (UI philosophy)
  → mcp-builder (MCP integrations)
  → skill-creator (create new skills)
```

Skills stored globally at `~/.agents/skills/` and symlinked to each agent (Claude Code, GitHub Copilot, etc.)

### TDD Command (Task 1.2)
```
🔴 RED    → Write failing test first
🟢 GREEN  → Write minimal code to pass
🔵 REFACTOR → Clean up while green
```

Called by `/implement` (Step 2.5) and `/fix` (Step 3) - single source of truth pattern.

### Context Commands (Tasks 1.3-1.4)
```
/context-save    → Creates tmp/session-context.md with progress state
/context-restore → Restores from saved context at session start
```

Auto-triggered by MVP 7 (after commit), MVP 8 (on pause/stop), MVP 0 (session start).

### Security Scan (Task 1.5)
OWASP Top 10 checklist:
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- ... (10 categories)

Framework-specific checks for Next.js/React and Flutter.

### Performance Command (Task 1.6)
- Core Web Vitals (LCP, FID, CLS)
- Bundle size analysis
- Static pattern detection (O(n²), large imports, etc.)

### Incident Response (Task 1.7)
4-phase workflow: ASSESS → MITIGATE → RESOLVE → LEARN
Severity classification: P1 Critical → P4 Low

🧒 **ELI5:** We added a bunch of new helper tools to our AI assistant. Some are from other smart people (Vercel and Anthropic), like a kid borrowing study notes from classmates. We also made our own tools for: doing homework step-by-step (TDD), saving your place in a book (context-save/restore), checking if your house is safe (security), seeing if your website is fast enough (performance), and knowing what to do if something breaks badly (incident).

**Key Concept:** The modular command pattern - create standalone commands (`/tdd`) that other workflows reference, rather than duplicating content.

---

## Session: 2026-02-03 (Protocol Enhancement v5.15.0 - Phase 2)

### [2026-02-03 12:30] Explanation: Workflow Integration

**Scope:** Multiple files (implement.md, fix.md, debug.md, verify.md, copilot-instructions.md, GATES.md)
**Type:** Feature implementation (Scenario B) - Workflow integration

**Context:** Phase 2 of protocol enhancement from v5.14.0 → v5.15.0

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `.claude/commands/implement.md` | modify | TDD reference simplified to `/tdd` command |
| 2 | `.claude/commands/fix.md` | modify | TDD RED phase reference added |
| 3 | `.github/copilot-instructions.md` | modify | MVP 0 auto-restore, MVP 8 mandatory save |
| 4 | `.github/rules/GATES.md` | modify | Post-Commit auto-save action |
| 5 | `.claude/commands/debug.md` | modify | Multi-agent hypothesis pattern |
| 6 | `.claude/commands/verify.md` | modify | Security checklist expanded |

**How it works:**

### TDD Integration (Tasks 2.1, 2.2)
**Before:** Verbose inline TDD instructions duplicated in `/implement` and `/fix`
**After:** Single reference: `→ Run /tdd` (full workflow) or `→ Run /tdd (RED phase only)`

Benefits: DRY principle - changes to `/tdd` automatically apply everywhere.

### Session Persistence Integration (Tasks 2.3, 2.4, 2.5)
Three auto-triggers added:
```
MVP 0 (Session Start):  If tmp/session-context.md exists → /context-restore
MVP 7 (Post-Commit):    After git commit → /context-save
MVP 8 (Interrupt):      On "pause" or "stop" → /context-save (mandatory)
```

This creates a "save game" pattern - progress is automatically saved at strategic points.

### Multi-Agent Debugging (Task 2.6)
For complex bugs spanning multiple domains:
```
| Agent Role     | Focus Area                    |
|----------------|-------------------------------|
| Code Agent     | Logic, algorithms, data flow  |
| Data Agent     | State, DB, caching, sync      |
| System Agent   | Infra, network, env, deps     |
```

### Security Integration (Task 2.7)
Basic checklist (always apply) + expanded OWASP-aligned categories:
- Authentication, Authorization, Input Validation, Output Encoding
- Data Protection, Logging & Monitoring, Error Handling, Dependencies

Reference to `/security-scan` for comprehensive audits.

🧒 **ELI5:** Phase 1 gave us new tools. Phase 2 put up signs saying "use this tool here." It's like putting sticky notes on your main recipe book pointing to detailed recipe cards. Also, we added auto-save like in video games - your progress is saved when you pause or finish a level, and when you come back, it asks "continue from where you left off?"

**Key Patterns:**
- **Reference > Duplicate:** Workflow commands point to capability commands
- **Auto-trigger > Manual:** Session persistence at strategic points
- **Multi-perspective Analysis:** Code/Data/System agents for complex bugs

---

## Session: 2026-02-02 (code-map.md Verification & Alignment)

### [2026-02-02 20:30] Explanation: Code-Map Drift Detection & Remediation

**Scope:** session
**Type:** Session summary

**Context:** Verification task (Scenario G) - comparing code-map.md against actual repository structure

**What changed:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `docs/code-map.md` | modify | Aligned 15 gaps with actual repo structure |
| 2 | `docs/changelog.md` | modify | Added entry for code-map.md corrections |
| 3 | `.github/rules/LEARNINGS.md` | modify | Captured INSIGHT about drift detection pattern |

**Overall goal:** Verify and align code-map.md documentation with actual repository structure

**How it works:**

1. **Read code-map.md** - Get documented structure
2. **List actual directories** - Use `list_dir` on key paths (docs/, src/, src/components/, src/lib/)
3. **Compare section-by-section** - Identify mismatches
4. **Classify gaps:**
   - Planned-but-not-implemented: `ai-prompts.md`, `layout/`, `preview/`
   - Created-but-not-documented: `checkbox.tsx`, `changelog.md`, `deployment.md`
   - Config drift: `tailwind.config.ts` removed (Tailwind v4 uses CSS)
   - Version stale: v5.7.0 → v5.14.0
   - Structure inaccuracy: `utils/` folder → `utils.ts` file
5. **Apply fixes** - Update code-map.md with corrections
6. **Update changelog** - Document the changes
7. **Capture learning** - Add pattern to LEARNINGS.md

**Key decisions made:**

1. **Remove planned-but-not-implemented items**: Prompts live in `src/lib/ai/prompts.ts`, not `docs/ai-prompts.md`
2. **Fix structural inaccuracies**: Single `utils.ts` file, not `utils/` folder
3. **Add missing docs**: Files that exist but weren't in directory listing
4. **Update protocol version**: Stale v5.7.0 → current v5.14.0

**Pattern discovered:** Documentation drift happens when plans change during implementation but docs aren't updated. Common patterns:
- Planned-but-not-implemented items accumulate
- Config file changes go untracked
- Versions become stale

**Solution:** Run periodic `/verify` or `/docs` on code-map.md

🧒 **ELI5:** Imagine you have a treasure map but some paths on the map don't exist anymore (someone filled them in), and some new paths were built that aren't on the map. Today we walked around the whole area and fixed the map so it matches reality. Now the map is trustworthy again!

---

### [2026-02-02 21:30] Explanation: Pre-Commit Gate Changelog Date Check

**Scope:** Protocol enhancement
**Type:** Workflow enforcement

**What changed:**
- GATES.md v2.4.0 → v2.5.0: Added `changelog.md date current` check to Pre-Commit Gate template
- New **Changelog Date Rule:** When committing protocol file changes, verify `docs/changelog.md` "Last Updated" date = today
- If stale, GATE is BLOCKED until date is updated

**How it works:**
1. AI is about to commit changes to `.github/`, `.claude/`, or `docs/`
2. Pre-Commit Gate triggers with new check: `changelog.md date current: [Y/N/N/A]`
3. AI verifies the "Last Updated" line at bottom of changelog.md
4. If date ≠ today → GATE BLOCKED, must update changelog date first
5. Once date is current → proceed with commit

**Why this matters:**
- Root cause: Protocol file changes don't trigger the same "docs update" reflex as code changes
- Symptom: Changelog showed "Last Updated: 2026-01-25" despite work on v5.12.0→v5.14.0
- Solution: Enforcement at commit-time catches what manual checklists miss

🧒 **ELI5:** It's like checking you wrote today's date on your homework before turning it in. If you forgot to update the date, you have to fix it first!

---

### [2026-02-02 22:00] Explanation: Auto-Bundled Pre-Commit Commands

**Scope:** Protocol enhancement  
**Type:** Workflow automation

**What changed:**
- GATES.md v2.5.0 → v2.6.0: Pre-Commit Gate now includes DOCS SYNC, LEARNING CHECK, EXPLANATION
- These three commands that were previously manual are now auto-bundled
- Skip conditions prevent noise on micro-tasks

**How it works:**
1. User completes implementation, ready to commit
2. Pre-Commit Gate triggers (existing behavior)
3. NEW sections auto-run:
   - **DOCS SYNC** — Check/update relevant docs, list what was touched
   - **LEARNING CHECK** — Capture any insight/friction/gap to LEARNINGS.md
   - **EXPLANATION** — Generate technical summary + ELI5, save to session-learnings.md
4. All three appear in the same Pre-Commit output block
5. Skip conditions: Micro-tasks, routine tasks, Learning Mode OFF

**Why this matters:**
- Root cause: /docs, /learn, /explain were commonly needed but easily forgotten
- Pattern: Commands that should always run but don't → bundle into mandatory gate
- Benefit: Enforcement at commit-time catches what manual triggers miss

**Skip Conditions Table:**
| Component | Skip When |
|-----------|-----------|
| DOCS SYNC | Micro-task, no doc impact |
| LEARNING CHECK | Routine task, nothing notable |
| EXPLANATION | Learning Mode OFF, micro-task |

🧒 **ELI5:** Before, you had to remember to do three chores after finishing your work. Now, those chores are built into the "hand in your work" step, so they happen automatically every time!

---

## Session: 2026-02-02 (init_protocol.ps1 Creation)

### [2026-02-02 18:45] Explanation: Repository Initialization Script

**Scope:** last change
**Type:** New file

**Context:** Protocol tooling enhancement - adding repository initialization automation

**What changed:**
- File(s): `tools/init_protocol.ps1`
- Type: New file (addition)
- Size: 486 lines

**How it works:**

1. **Script Purpose:** Initializes a new repository with AI protocol files from the `ai-protocol` master repository

2. **Parameter Handling:** Accepts `TargetRepo`, `ProtocolRepo`, `-Force`, `-SkipSync`, `-IncludeTests`, and `-WhatIf` flags

3. **Git Auto-Init:** Automatically runs `git init` if target folder has no `.git` directory

4. **7-Step Copy Process:**
   - `[1/7]` Copy `.github/copilot-instructions.md`
   - `[2/7]` Copy `.github/rules/` folder
   - `[3/7]` Copy `.claude/commands/` folder
   - `[4/7]` Copy `.claude/settings.local.json`
   - `[5/7]` Copy `tools/` scripts (sync + extract)
   - `[6/7]` Initialize `docs/` from templates
   - `[7/7]` Setup `.git/info/exclude` patterns

5. **CLAUDE.md Generation:** Auto-generates `CLAUDE.md` from `copilot-instructions.md` with version/timestamp header

6. **Sync Config:** Adds new repo to `sync_config.yaml` for future sync operations

7. **Test Isolation:** Uses `$env:PESTER_TESTING` guard to prevent real config pollution during tests

**Code example:**
```powershell
# Copy a single file with preview support
function Copy-SingleFile {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [switch]$ForceOverwrite,
        [switch]$PreviewOnly  # WhatIf mode
    )
    
    if ($PreviewOnly) {
        Write-Host "  WhatIf: Would copy: $SourcePath -> $DestPath"
        return $true
    }
    
    Copy-Item -Path $SourcePath -Destination $DestPath -Force
    return $true
}
```

🧒 **ELI5:** Imagine you have a perfect recipe book that you want to share with 7 different kitchens. Instead of manually copying each page to each kitchen, this script is like a photocopier that: (1) Creates a new folder for recipes if there isn't one, (2) Copies all the pages automatically, (3) Writes a note saying "these copies came from the master book", and (4) Remembers which kitchens got copies so you can update them later.

**Related:** 
- `tools/sync_copilot_instructions.ps1` - Syncs changes TO existing repos
- `tools/tests/InitProtocol.Tests.ps1` - 34 Pester tests for this script

---

## Session: 2026-02-02 (Pester Test Isolation Fix)

### [2026-02-02 12:30] Explanation: Pester Test Isolation Guard

**Scope:** last change
**Type:** Last change

**Context:** Protocol sync infrastructure - preventing Pester tests from polluting production config files

**What changed:**
- File(s): `tools/init_protocol.ps1`
- Type: Bug fix
- Impact: Tests no longer add entries to real `sync_config.yaml`

**How it works:**

1. **Problem identified:** Running `/sync` showed warnings about missing repos (`test-init-repo`, `current-dir-test`) that were test artifacts polluting the real config.

2. **Root cause:** The `Add-ToSyncConfig` function in `init_protocol.ps1` was modifying the real `sync_config.yaml` even during Pester tests, despite tests running in temp directories.

3. **Fix applied:** Added a test isolation guard that checks TWO conditions before modifying config:

```powershell
function Add-ToSyncConfig {
    param([string]$RepoPath, [string]$RepoName, [string]$ProtocolRepoPath)
    
    # TEST ISOLATION: Skip if running in Pester AND not in temp directory
    if ($env:PESTER_TESTING -eq '1') {
        $tempPath = [System.IO.Path]::GetTempPath()
        if (-not $ProtocolRepoPath.StartsWith($tempPath)) {
            Write-Verbose "Skipping sync_config update during tests (not in temp dir)"
            return  # ← Early exit prevents pollution
        }
    }
    
    # Normal config update logic follows...
}
```

4. **Why two conditions?**
   - `$env:PESTER_TESTING -eq '1'` → Confirms test mode is active
   - `$ProtocolRepoPath.StartsWith($tempPath)` → Ensures we're modifying temp config, not real one

5. **Verification:** All 34 Pester tests pass, and real `sync_config.yaml` remains clean after test runs.

**Code walkthrough:**
```powershell
# Before: No guard - tests could write to real config
function Add-ToSyncConfig {
    $configPath = Join-Path $ProtocolRepoPath "sync_config.yaml"
    # ... directly modifies config
}

# After: Guard prevents real config modification during tests  
function Add-ToSyncConfig {
    # Guard clause - early return for tests touching real config
    if ($env:PESTER_TESTING -eq '1') {
        $tempPath = [System.IO.Path]::GetTempPath()
        if (-not $ProtocolRepoPath.StartsWith($tempPath)) {
            return  # Safe exit
        }
    }
    # ... proceeds only for real usage OR tests with temp config
}
```

🧒 **ELI5:** Imagine you have a guest book at a hotel. The test automation was accidentally signing the REAL guest book instead of a practice one. The fix adds a check: "Am I practicing? Is this the practice book?" Only if BOTH are true, it writes. Otherwise, it just walks away without signing anything.

**Key Concept:** Test isolation requires both MODE detection (am I testing?) AND SCOPE detection (am I touching real resources?).

**Related:** 
- [LEARNINGS.md](.github/rules/LEARNINGS.md) - GAP entry for this fix
- [InitProtocol.Tests.ps1](../tools/tests/InitProtocol.Tests.ps1) - Tests that were causing pollution

---

## Session: 2026-02-02 (Protocol v5.12.0 - /audit-docs Command)

### [2026-02-02 23:55] Explanation: /audit-docs Auto-Trigger Pattern

**Scope:** last change
**Type:** Last change

**Context:** AI Protocol documentation system - preventing gaps in protocol file references

**What changed:**
- File(s): `.claude/commands/audit-docs.md` (created), `.github/copilot-instructions.md`, `.github/rules/GATES.md`, `.github/rules/COMMANDS.md`, `docs/ai-manifest.json`, `docs/README.md`, `.github/rules/PROTOCOL_CHANGELOG.md`
- Type: Feature addition + modifications
- Version: v5.11.0 → v5.12.0

**How it works:**

1. **Created `/audit-docs` command** - A 5-step workflow to verify protocol files are properly cross-referenced:
   - Step 1: Session Files Check - Scans git status for new/modified protocol files
   - Step 2: Reference Audit - Checks each file against Reference Matrix
   - Step 3: Gap Report - Lists missing references
   - Step 4: Auto-Fix Prompt - Offers to add missing references
   - Step 5: Full Cross-Reference Audit - Verifies ALL existing files (optional)

2. **Added auto-trigger at MVP 0.6** - After any protocol file is created/modified:
   ```
   🔄 PROTOCOL UPDATED: v[old] → v[new]
   ...
   ☐ /audit-docs passed ← AUTO-TRIGGERED
   ```

3. **Added safety net at Pre-Commit Gate** - Before committing protocol files:
   ```
   ✅ PRE-COMMIT CHECK:
   ...
   - /audit-docs passed: [Y/N/N/A] (for protocol files)
   ```

4. **Reference Matrix** - Defines where each file type must be registered:

| File Type | README | DOCS_MAP | ai-manifest | COMMANDS | Ref Index |
|-----------|--------|----------|-------------|----------|-----------|
| `.github/rules/*.md` | If major | ✅ | — | — | ✅ |
| `.claude/commands/*.md` | Update count | ✅ | ✅ skills | ✅ | — |
| `docs/*.md` | ✅ | ✅ | — | — | — |

**Code example:**
```markdown
<!-- From GATES.md Pre-Commit Gate -->
✅ PRE-COMMIT CHECK:
- Code comments tagged: [Y/N/N/A]
- extract_docs.ps1 run: [Y/N/N/A]
- Tests pass: [Y/N/N/A]
- /audit-docs passed: [Y/N/N/A] (for protocol files)  ← NEW
- GATE: [✅ PASSED / 🚫 BLOCKED - reason]
```

🧒 **ELI5:** Imagine you're a librarian adding new books. Before, you might add a book to a shelf but forget to add it to the catalog, the author index, AND the subject list. Now there's a checklist that runs automatically when you add a book (MVP 0.6) AND a final check before you lock up (Pre-Commit Gate). If you missed any registration, the system blocks you until you fix it.

**Key Pattern - Auto-Trigger Design:**
When creating validation commands, always design with two integration points:
1. **Immediate trigger** (MVP 0.6) - Catches gaps at creation time
2. **Safety net** (Pre-Commit Gate) - Catches any that slipped through

---

## Session: 2026-02-02 (Documentation Backfill)

### [2026-02-02 14:30] Explanation: Session Summary

**Scope:** session
**Type:** Session summary

**Changes made this session:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | docs/session-learnings.md | modify | Added ~400 lines documenting phases 2.2, 2.3, 3.3, 3.4 |
| 2 | .github/rules/LEARNINGS.md | modify | Added GAP learning for missing phase documentation |

**Overall goal:** Backfill missing technical pattern documentation for 4 implementation phases that were completed but not captured in session-learnings.md.

**Key decisions made:**
1. **Skip doc-only phases (2.1, 3.1):** These were documentation updates with no code patterns worth capturing.
2. **Document code phases (2.2, 2.3, 3.3, 3.4):** These contained valuable patterns (streaming, ADF, Storage Format) that should be preserved.

**Patterns documented:**

| Phase | Key Patterns |
|-------|--------------|
| **2.2** | Vercel AI SDK `streamText()` + `toDataStreamResponse()`, System prompts design |
| **2.3** | `useChat` hook with `body.context`, floating chat panel UI |
| **3.3** | Confluence Storage Format (`ac:` macros), version increment for updates |
| **3.4** | Atlassian Document Format (ADF), markdown-to-ADF conversion, `taskList`/`taskItem` nodes |

**Tests affected:** None

🧒 **ELI5:** Imagine writing in a journal every day, but you forgot to write for 4 days. Today, we went back and filled in what happened on those missing days so the journal is complete again. The patterns we wrote down are like recipes - future us (or someone else) can read them and know exactly how to cook the same dish.

**Next steps:** None - MVP documentation is now complete.

---

## Session: 2026-01-28 (Phase 1.2 - 1.4)

### Overview
Implemented core foundation of BRUST Creator: Authentication, Database, and Business Rule Wizard.

---

## Technical Explanations

### 1. NextAuth.js with GitHub OAuth

**What it does:** Handles user authentication via GitHub login.

**Key Files:**
- `src/lib/auth/auth-options.ts` - NextAuth configuration
- `src/lib/auth/types.ts` - Extended session types
- `src/middleware.ts` - Route protection

**How it works:**
```
User clicks "Login with GitHub"
    ↓
Redirects to GitHub OAuth
    ↓
GitHub returns with auth code
    ↓
NextAuth exchanges code for tokens
    ↓
JWT callback adds user.id to token
    ↓
Session callback adds id to session.user
    ↓
User is authenticated, session stored in JWT cookie
```

**Key Pattern - Extending Session Types:**
```typescript
// types.ts
declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}

// auth-options.ts - JWT callback
jwt: async ({ token, user, account }) => {
  if (user) token.id = user.id
  if (account) token.accessToken = account.access_token
  return token
}

// Session callback
session: async ({ session, token }) => {
  if (session.user) session.user.id = token.id as string
  return session
}
```

**ELI5:** Like a bouncer at a club - GitHub confirms you're who you say you are, and NextAuth gives you a wristband (JWT) so you don't have to show ID again.

---

### 2. Drizzle ORM with Turso (SQLite Edge)

**What it does:** Provides type-safe database access with SQLite hosted on the edge.

**Key Files:**
- `src/lib/db/schema.ts` - Table definitions
- `src/lib/db/index.ts` - Database connection
- `drizzle.config.ts` - Migration configuration

**Schema Pattern:**
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  githubId: text('github_id').unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Foreign key reference
export const documents = sqliteTable('documents', {
  userId: text('user_id').notNull().references(() => users.id),
  // ...
})

// Type inference (compile-time only!)
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

**Connection Pattern:**
```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })
```

**ELI5:** Drizzle is like a librarian who knows exactly where every book is. You describe what you want in TypeScript, and it fetches the right data from the database filing cabinet.

---

### 3. Zustand State Management with Persistence

**What it does:** Manages wizard state across steps with localStorage backup.

**Key Files:**
- `src/stores/wizard-store.ts` - Zustand store
- `src/types/business-rule.ts` - Type definitions

**Store Pattern:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WizardState {
  currentStep: number
  data: BusinessRuleData
  isDirty: boolean

  // Actions
  nextStep: () => void
  prevStep: () => void
  updateData: (updates: Partial<BusinessRuleData>) => void
  reset: () => void
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      data: { ...INITIAL_BUSINESS_RULE },
      isDirty: false,

      nextStep: () => {
        const { currentStep } = get()
        if (currentStep < MAX_STEPS) {
          set({ currentStep: currentStep + 1 })
        }
      },

      updateData: (updates) => {
        const { data } = get()
        set({ data: { ...data, ...updates }, isDirty: true })
      },

      reset: () => set({ currentStep: 1, data: INITIAL, isDirty: false }),
    }),
    {
      name: 'wizard-storage', // localStorage key
      partialize: (state) => ({
        currentStep: state.currentStep,
        data: state.data
      }), // Only persist these fields
    }
  )
)
```

**Usage in Components:**
```typescript
function MyStep() {
  const { data, updateData } = useWizardStore()

  return (
    <Input
      value={data.ruleName}
      onChange={(e) => updateData({ ruleName: e.target.value })}
    />
  )
}
```

**ELI5:** Zustand is like a shared notebook that everyone can read and write to. The `persist` middleware is like an auto-save feature that backs up to localStorage, so you don't lose your work if you close the browser.

---

### 4. Multi-Step Wizard Architecture

**What it does:** Guides users through 7 steps to create a Business Rule.

**Key Files:**
- `src/components/wizard/wizard-container.tsx` - Orchestrator
- `src/components/wizard/wizard-progress.tsx` - Progress bar
- `src/components/wizard/business-rule/*.tsx` - Step components

**Architecture:**
```
WizardContainer (orchestrator)
├── WizardProgress (shows step X of 7)
├── Current Step Component
│   ├── BasicInfoStep (ID, Name, Category, Priority)
│   ├── DescriptionStep (What rule does)
│   ├── RuleStatementStep (IF/THEN/ELSE)
│   ├── ExceptionsStep (Exception cases)
│   ├── ExamplesStep (Valid/Invalid scenarios)
│   ├── MetadataStep (Related rules, owner, dates)
│   └── ReviewStep (Preview before submit)
└── Navigation (Previous / Save Draft / Next|Submit)
```

**Step Validation Pattern:**
```typescript
isStepComplete: (step: number): boolean => {
  const { data } = get()
  switch (step) {
    case 1: return !!(data.ruleId && data.ruleName && data.category && data.priority)
    case 2: return !!data.description
    case 3: return !!(data.ruleStatement.if && data.ruleStatement.then)
    case 4: return true // Optional
    case 5: return true // Optional
    case 6: return true // Optional
    case 7: return true // Review
    default: return false
  }
}
```

**ELI5:** The wizard is like filling out a form with 7 pages. You can go forward and back, and the computer checks each page is complete before letting you continue.

---

## Key Configuration Discoveries

### Drizzle + Turso Config (IMPORTANT)

**Wrong:**
```typescript
// ❌ This fails!
export default defineConfig({
  dialect: 'turso', // Error: not a valid dialect
})
```

**Correct:**
```typescript
// ✅ This works!
export default defineConfig({
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
```

---

### shadcn/ui Toast Deprecated

**Old (deprecated):**
```bash
npx shadcn@latest add toast  # ❌ Fails
```

**New:**
```bash
npx shadcn@latest add sonner  # ✅ Use this
```

---

### npm Package Names Cannot Have Capitals

When creating a Next.js project in a directory with capitals (e.g., `ai-BRUST-creator`):
```bash
npx create-next-app . --yes  # ❌ Fails: "name can no longer contain capital letters"
```

**Workaround:** Create in temp directory with lowercase name, then copy files.

---

### Drizzle Type Utilities Are Compile-Time Only

```typescript
// ❌ This fails at runtime!
expect(users.$inferSelect).toBeDefined()  // undefined at runtime

// ✅ Test the actual table structure instead
expect(users.id).toBeDefined()
expect(users.email).toBeDefined()
```

**Why:** `$inferSelect` and `$inferInsert` are TypeScript type utilities. They exist only during compilation for type inference, not at runtime.

---

## Testing Patterns

### Testing Zustand Stores
```typescript
import { act, renderHook } from '@testing-library/react'

describe('Store', () => {
  beforeEach(async () => {
    const { useStore } = await import('@/stores/my-store')
    act(() => useStore.getState().reset())
  })

  it('should update state', async () => {
    const { useStore } = await import('@/stores/my-store')
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.updateData({ field: 'value' })
    })

    expect(result.current.data.field).toBe('value')
  })
})
```

### Mocking Stores for Component Tests
```typescript
vi.mock('@/stores/wizard-store', () => ({
  useWizardStore: vi.fn(() => ({
    currentStep: 1,
    data: { /* mock data */ },
    nextStep: vi.fn(),
    // ... other mocked actions
  })),
}))
```

---

## Database Schema Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | GitHub OAuth users | id, email, name, githubId |
| `documents` | BR & US documents | userId, documentType, documentId, status, content (JSON) |
| `documentVersions` | Version history | documentId, version, content |
| `atlassianConnections` | OAuth tokens | userId, accessToken, refreshToken |
| `publishRecords` | Audit trail | documentId, target, status |

---

## Project Statistics (End of Phase 1.4)

| Metric | Value |
|--------|-------|
| Total Tests | 68 |
| Test Files | 6 |
| Components | 12 |
| API Routes | 1 (auth) |
| Database Tables | 5 |
| Wizard Steps | 7 |

---

## Quick Reference Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript check

# Testing
npm test             # Run all tests
npm test -- --watch  # Watch mode
npm run test:coverage # With coverage

# Database
npx drizzle-kit generate  # Generate migrations
npx drizzle-kit migrate   # Run migrations
npx drizzle-kit studio    # Database GUI
```

---

## Session: 2026-01-28 (Phase 1.5 - Document History)

### Overview
Completed Phase 1 by implementing document CRUD API and history UI.

---

### 8. Documents API - RESTful CRUD Pattern

**What it does:** Provides endpoints for creating, reading, updating, and deleting business rule documents.

**Key Files:**
- `src/app/api/documents/route.ts` - List and create (GET, POST)
- `src/app/api/documents/[id]/route.ts` - Individual document operations (GET, PUT, DELETE)

**API Design:**
```
GET  /api/documents          → List user's documents (with filtering)
POST /api/documents          → Create new document
GET  /api/documents/[id]     → Get single document
PUT  /api/documents/[id]     → Update document
DELETE /api/documents/[id]   → Soft delete document
```

**Soft Delete Pattern:**
```typescript
// Don't actually delete - set deletedAt timestamp
await db
  .update(documents)
  .set({ deletedAt: new Date().toISOString() })
  .where(eq(documents.id, id))

// Always filter out deleted in queries
.where(
  and(
    eq(documents.userId, session.user.id),
    isNull(documents.deletedAt)  // Exclude soft-deleted
  )
)
```

🧒 **ELI5:** Instead of throwing papers in the trash (where they're gone forever), we put them in a special drawer marked "deleted". They're still there if we ever need to look at them, but they don't show up on our desk anymore.

---

### 9. Custom React Hooks - useDocuments

**What it does:** Encapsulates all document data fetching and mutations in a reusable hook.

**Key File:** `src/hooks/use-documents.ts`

**Pattern:**
```typescript
export function useDocuments(options: UseDocumentsOptions = {}) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    // Fetch from API
  }, [options.type, options.status])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const createDocument = async (input) => {
    // POST to API, refetch list
  }

  return { documents, isLoading, error, refetch: fetchDocuments, createDocument, ... }
}
```

**Benefits:**
- Encapsulates loading/error state
- Automatic refetch on options change
- Consistent API for all document operations
- Can be used in any component

🧒 **ELI5:** The hook is like a personal assistant for documents. You tell it "I want to see all drafts" and it goes to the filing cabinet, finds all the drafts, and brings them back to you. If you want to save a new document, you hand it to the assistant and they file it away and then show you the updated list.

---

### 10. Chainable Mock Pattern for Tests

**Problem:** Drizzle ORM uses method chaining: `db.select().from().where().orderBy()`

**Solution:** Create a mock that returns itself for chain methods and is also awaitable:
```typescript
const createChainableMock = (result: unknown) => {
  const mock: Record<string, unknown> = {
    // Make the mock awaitable (thenable)
    then: <T>(resolve?: ((value: unknown) => T) | null) =>
      Promise.resolve(result).then(resolve ?? ((v) => v as T)),
  }
  // Each method returns the mock itself for chaining
  const methods = ['from', 'where', 'orderBy', 'values', 'set', 'returning']
  methods.forEach((method) => {
    mock[method] = vi.fn(() => mock)
  })
  return mock
}
```

**Why it works:**
1. Each chain method (`from`, `where`) returns the mock itself
2. The mock has a `then` method, making it "thenable"
3. When `await`ed, JavaScript calls `then()` which resolves to the result

🧒 **ELI5:** It's like playing pretend. We create a fake database that says "yes, yes, okay" to every question, and when you finally ask "what's the answer?", it gives you the answer we decided beforehand.

---

### 11. Next.js Route Params - Promise Pattern

**What:** In Next.js 15+, dynamic route params are Promises.

**Pattern:**
```typescript
// Route: /api/documents/[id]
type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params  // Must await!
  // ...
}
```

**Why:** Allows Next.js to optimize by streaming params before the route handler runs.

---

### Phase 1 Completion Summary

**Test Results:** 82 tests passing
- Unit tests: 46 (smoke, utils, schema, wizard-store)
- Integration tests: 25 (auth, documents API)
- Component tests: 11 (wizard-container)

**Files Created in Phase 1.5:**
- `src/app/api/documents/route.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/hooks/use-documents.ts`
- `src/app/(dashboard)/history/page.tsx`
- `src/app/(dashboard)/business-rule/[id]/page.tsx`
- `__tests__/integration/api/documents.test.ts`

**Ready for Phase 2:** AI Integration

---

---

## Session: 2026-01-28 (Protocol Enhancement - AI Documentation Utilization)

### Overview
Enhanced AI agent protocol to maximize documentation utilization through machine-readable manifests, standardized context loading, and automated gate enforcement.

---

### 12. AI-Native Documentation Infrastructure

**What it does:** Provides AI agents with machine-readable entry points and explicit loading instructions for faster context acquisition.

**Files Created:**
- `docs/README.md` - Documentation index with session resume checklist
- `docs/ai-manifest.json` - Machine-readable manifest for programmatic navigation
- `.claude/commands/context.md` - /context skill for session initialization

**Files Updated:**
- `.github/rules/GATES.md` - Added HTML markers around gate templates
- `.github/rules/SCENARIOS.md` - Added Scenario B example with multi-language code
- `.github/copilot-instructions.md` - Added AUTO-ROUTING section + source-of-truth note

---

### 13. ai-manifest.json Structure

**Purpose:** Machine-readable navigation manifest for AI agents.

**Structure:**
```json
{
  "project": {
    "name": "BRUST Creator",
    "type": "web-application",
    "framework": "Next.js 16.1.6",
    "testCommand": "npm test"
  },
  "autoLoad": {
    "always": ["docs/code-map.md", "docs/progress.md"],
    "onScenario": {
      "A": ["docs/requirements.md"],
      "B": ["docs/requirements.md"],
      "C": ["docs/refactoring.md"],
      "D": ["docs/testing.md"],
      "E": ["docs/defects.md"],
      "F": ["docs/defects.md"],
      "G": ["docs/defects.md", "docs/standards.md"]
    }
  },
  "scenarios": { /* A-G with commit types and workflows */ },
  "skills": { /* 14 available skills */ },
  "gates": { /* links to gate templates */ },
  "mvpCheckpoints": { /* mandatory/optional checkpoints */ }
}
```

🧒 **ELI5:** It's like a restaurant menu for AI - instead of reading the whole cookbook, the AI can quickly see what documents are available and which ones to read based on what you're asking it to do.

---

### 14. HTML Gate Markers for Automation

**What it does:** Enables programmatic detection and extraction of gate templates.

**Pattern:**
```markdown
<!-- GATE:EXECUTION_GATE:START -->
```
🚀 EXECUTION GATE:
- Plan: [1-line summary]
...
```
<!-- GATE:EXECUTION_GATE:END -->
```

**Markers Added:**
- `GATE:EXECUTION_GATE` - Before code changes
- `GATE:PRE_COMMIT` - Before git commit
- `GATE:PROTOCOL_COMPLIANCE` - After task completion

**Use Case:** Future automation can regex-extract these templates for:
- Automatic gate enforcement
- Protocol compliance checking
- Template generation tools

🧒 **ELI5:** Like putting colored stickers on important forms so a robot helper can quickly find them without reading every page.

---

### 15. /context Skill Workflow

**Purpose:** Auto-initialize AI session with required documentation context.

**Workflow:**
1. Load core files: `code-map.md`, `progress.md`
2. Parse current state (phase, task, blockers)
3. Detect active scenario (A-G) from task description
4. Load scenario-specific docs
5. Verify test state (run `npm test`)
6. Report context loaded

**Auto-Invoke Triggers:**
- Session starts fresh
- Resuming from conversation summary
- User explicitly requests `/context`

🧒 **ELI5:** Like a "Previously on..." recap at the start of a TV show episode - it quickly catches you up so you know what's happening.

---

### 16. Source of Truth Hierarchy

**Clarification added to protocol:**

| Layer | File | Authority |
|-------|------|-----------|
| Master | `.github/copilot-instructions.md` | Edit HERE for changes |
| Generated | `CLAUDE.md` | Auto-generated, never edit directly |
| Modular | `.github/rules/*.md` | Detailed specifications |
| Skills | `.claude/commands/*.md` | Skill-specific workflows |

**Sync Flow:**
```
Edit copilot-instructions.md
    ↓
Run .\tools\sync_copilot_instructions.ps1
    ↓
Auto-generates CLAUDE.md
    ↓
Syncs to all repos (newest-wins)
```

🧒 **ELI5:** There's one "original copy" of the rules (copilot-instructions.md). All the other copies get automatically updated when the original changes - like how a teacher's master answer key gets copied to all the student versions.

---

### Gaps Addressed

| Gap | Solution | Impact |
|-----|----------|--------|
| Missing index | `docs/README.md` | Single entry point for doc discovery |
| No manifest | `docs/ai-manifest.json` | Programmatic navigation |
| Limited examples | SCENARIOS.md examples | Clearer implementation patterns |
| No context loading | `/context` skill | Explicit session initialization |
| Redundancy confusion | Source-of-truth note | Clear edit location |

---

## Session: 2026-01-29 (Phase 2.4 - User Story Wizard)

### Overview
Implemented complete User Story Wizard with TDD, adding 38 tests and 11 new files.

---

### User Story Wizard Architecture

**Type System (`src/types/user-story.ts`):**
```typescript
// Core types for User Story data
interface StoryStatement {
  role: string      // As a [role]
  feature: string   // I want [feature]
  benefit: string   // So that [benefit]
}

interface AcceptanceCriterion {
  id: string
  scenario: string  // Scenario name
  given: string     // Precondition
  when: string      // Action
  then: string      // Expected result
}

interface DefinitionOfDoneItem {
  id: string
  description: string
  completed: boolean
}
```

**Store Pattern (`src/stores/user-story-wizard-store.ts`):**
- Uses Zustand with persist middleware (localStorage)
- Separate from BR wizard store for clean separation
- AC/DoD management functions for add/remove/update operations

**Component Structure:**
```
user-story-wizard-container.tsx (orchestrator)
├── basic-info-step.tsx       (Step 1: ID, Epic, Title, Priority)
├── story-statement-step.tsx  (Step 2: As a/I want/So that)
├── acceptance-criteria-step.tsx (Step 3: Gherkin scenarios)
├── definition-of-done-step.tsx  (Step 4: Completion checklist)
├── related-items-step.tsx    (Step 5: Links and notes)
└── review-step.tsx           (Step 6: Preview)
```

---

### Key Patterns

**MoSCoW Priority:**
- `must` - Must Have (critical)
- `should` - Should Have (important)
- `could` - Could Have (nice to have)
- `wont` - Won't Have (deferred)

**Gherkin Format for AC:**
```
Scenario: [Name]
  Given [precondition]
  When [action]
  Then [expected result]
```

**Default DoD Items:**
1. Code complete and reviewed
2. Unit tests passing
3. Acceptance criteria verified

---

### Test Summary

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `user-story-wizard-store.test.ts` | 27 | State management, AC/DoD operations |
| `user-story-wizard.test.tsx` | 11 | Container rendering, navigation |

**Total project tests:** 138 passing

---

## Session: 2026-01-29 (Phase 3.2 - Atlassian OAuth)

### Overview
Implemented Atlassian OAuth 3LO integration for Confluence and JIRA publishing.

---

### 1. Atlassian OAuth 3LO Flow

**What it does:** Connects user's Atlassian account for publishing documents.

**Key Files:**
- `src/lib/auth/atlassian-oauth.ts` - OAuth client
- `src/app/api/atlassian/*/route.ts` - API routes
- `src/app/(dashboard)/settings/page.tsx` - Settings UI

**OAuth Flow:**
```
User clicks "Connect Atlassian"
    ↓
Frontend calls GET /api/atlassian/connect
    ↓
Returns authorization URL with state (CSRF protection)
    ↓
User redirects to Atlassian login
    ↓
User grants permissions
    ↓
Atlassian redirects to /api/atlassian/callback?code=XXX&state=XXX
    ↓
Callback exchanges code for tokens
    ↓
Callback fetches accessible resources (cloud IDs)
    ↓
Tokens encrypted with AES-256-GCM and stored
    ↓
Redirect to /settings?atlassian=connected
```

---

### 2. Token Encryption

**Why:** Tokens stored in database must be encrypted at rest for security.

**Algorithm:** AES-256-GCM (Authenticated Encryption)

**Implementation:**
```typescript
function encryptToken(token: string): string {
  const key = getEncryptionKey() // 32 bytes from env
  const iv = crypto.randomBytes(16) // Random IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Store as: IV (16) + AuthTag (16) + Ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}
```

**ELI5:** Like putting your key in a locked box, and the box has a special seal that shows if anyone tampered with it.

---

### 3. OAuth Scopes

**What they mean:**
- `read:confluence-content.all` - Read Confluence pages
- `write:confluence-content` - Create/update pages
- `read:jira-work` - Read JIRA issues
- `write:jira-work` - Create/update issues
- `offline_access` - Get refresh tokens for long-term access

---

### 4. Accessible Resources

**What it does:** After OAuth, fetch list of Atlassian cloud sites user has access to.

**API:** `GET https://api.atlassian.com/oauth/token/accessible-resources`

**Returns:**
```json
[
  {
    "id": "cloud-123",
    "name": "My Company",
    "url": "https://mycompany.atlassian.net"
  }
]
```

**Why needed:** The cloud ID is required for all subsequent API calls to Confluence/JIRA.

---

### Test Summary

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `atlassian.test.ts` | 17 | OAuth flow, encryption, token exchange |

**Total project tests:** 155 passing

---

## Session: 2026-01-29 (Phase 2.2 & 2.3 - AI Integration)

### Overview
Implemented AI chat endpoint with streaming and floating chat panel for wizard assistance.

---

### 1. Vercel AI SDK Streaming Pattern (Phase 2.2)

**What it does:** Provides real-time streaming responses from Claude in the chat interface.

**Key Files:**
- `src/app/api/ai/chat/route.ts` - Streaming chat endpoint
- `src/lib/ai/prompts.ts` - System prompts for BR/US contexts

**Streaming Pattern:**
```typescript
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(request: NextRequest) {
  // Auth check...
  const { messages, context } = await request.json()

  // Select system prompt based on document type
  let systemPrompt = SYSTEM_PROMPTS.general
  if (context?.documentType === 'business_rule') {
    systemPrompt = SYSTEM_PROMPTS.business_rule
  } else if (context?.documentType === 'user_story') {
    systemPrompt = SYSTEM_PROMPTS.user_story
  }

  // Inject wizard context for better assistance
  if (context?.wizardData) {
    systemPrompt += `\n\nCurrent wizard data:\n${JSON.stringify(context.wizardData, null, 2)}`
  }

  const result = await streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    maxTokens: 2048,
  })

  // Return streaming response directly!
  return result.toDataStreamResponse()
}
```

**Key Insight:** `toDataStreamResponse()` converts the stream to a format compatible with the `useChat` hook on the client side.

🧒 **ELI5:** Instead of waiting for the whole answer (like getting a complete letter), the AI sends words as it thinks of them (like texting). You see the response typing out in real-time!

---

### 2. System Prompts Design (Phase 2.2)

**What it does:** Tailors AI behavior based on what the user is creating.

**Pattern:**
```typescript
export const SYSTEM_PROMPTS = {
  business_rule: `You are an expert business analyst helping users create Business Rules.
Your role is to:
1. Help clarify business rule requirements
2. Suggest improvements to IF/THEN/ELSE statements
3. Identify edge cases and exceptions
4. Ensure rules are clear and testable

Business Rule Format:
- Rule ID: BR-[CATEGORY]-[NUMBER]
- Categories: validation, calculation, authorization, workflow, notification
...`,

  user_story: `You are an expert product manager helping users create User Stories.
Your role is to:
1. Identify the right user persona (WHO)
2. Clarify the desired feature (WHAT)
3. Articulate the business value (WHY)
4. Write acceptance criteria in Gherkin format
...`,

  general: `You are an AI assistant helping users create business documentation...`,
}
```

**Context Injection:** The system prompt is dynamically enhanced with:
- Current wizard data (JSON)
- Current step number
- Document type context

🧒 **ELI5:** Like giving different instruction manuals to a helper. If you're writing business rules, they get the "rules expert" manual. If you're writing user stories, they get the "product manager" manual.

---

### 3. useChat Hook Integration (Phase 2.3)

**What it does:** Provides stateful chat UI with automatic streaming handling.

**Key File:** `src/components/chat/chat-panel.tsx`

**Pattern:**
```typescript
import { useChat } from 'ai/react'

function ChatPanel({ documentType, currentStep, wizardData }) {
  const {
    messages,      // Array of chat messages
    input,         // Current input value
    handleInputChange,  // Input change handler
    handleSubmit,  // Form submit handler
    isLoading,     // True while waiting for response
    error,         // Error if request failed
  } = useChat({
    api: '/api/ai/chat',  // Endpoint URL
    body: {               // Extra data sent with each request
      context: {
        documentType,
        currentStep,
        wizardData,       // Current wizard state!
      },
    },
  })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map(msg => (
        <div key={msg.id} className={msg.role === 'user' ? 'user' : 'assistant'}>
          {msg.content}
        </div>
      ))}
      <input value={input} onChange={handleInputChange} />
      <button type="submit" disabled={isLoading}>Send</button>
    </form>
  )
}
```

**Key Features:**
- `messages` auto-updates as streaming chunks arrive
- `isLoading` enables loading indicator while AI is responding
- `body.context` passes wizard state to AI for context-aware responses

🧒 **ELI5:** The `useChat` hook is like a walkie-talkie that handles all the radio stuff automatically. You just speak into it (input) and hear responses (messages), without worrying about frequencies and signals.

---

### 4. Floating Chat Panel UI (Phase 2.3)

**What it does:** Collapsible AI assistant panel integrated into the wizard.

**Features:**
- Minimize to icon (16x16 Bot icon)
- Expand to chat panel (320x384)
- Context-aware placeholder text
- User/Assistant message styling with avatars
- Loading spinner while streaming

**Architecture:**
```
ChatPanel (fixed position, bottom-right)
├── Header (title + minimize button)
├── Messages Area (scrollable)
│   ├── Empty State (Bot icon + prompt)
│   ├── User Messages (right-aligned, primary color)
│   ├── Assistant Messages (left-aligned, muted bg)
│   └── Loading Indicator (spinner)
├── Error Display (if any)
└── Input Area (textarea + send button)
```

---

### Test Summary (Phase 2.2 & 2.3)

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `ai-chat.test.ts` | 9 | Chat endpoint, auth, validation, streaming |
| `chat-panel.test.tsx` | 9 | Component rendering, interactions |

**Total after Phase 2.3:** 100 tests passing

---

## Session: 2026-01-29 (Phase 3.3 - Confluence Publishing)

### Overview
Implemented one-click publishing of Business Rules to Confluence.

---

### 1. Confluence Storage Format (XHTML)

**What it does:** Converts Business Rule data to Confluence's native page format.

**Key File:** `src/lib/api/confluence.ts`

**Storage Format Overview:**
Confluence uses XHTML with special `ac:` prefixed macros for rich content.

**Key Macros:**
```xml
<!-- Structured panel with title -->
<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="title">Panel Title</ac:parameter>
  <ac:rich-text-body>
    <p>Panel content here...</p>
  </ac:rich-text-body>
</ac:structured-macro>

<!-- Status badge (colored label) -->
<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="colour">Green</ac:parameter>
  <ac:parameter ac:name="title">APPROVED</ac:parameter>
</ac:structured-macro>

<!-- Code block -->
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">none</ac:parameter>
  <ac:plain-text-body><![CDATA[
    IF:   condition
    THEN: action
  ]]></ac:plain-text-body>
</ac:structured-macro>
```

**Color Mappings:**
```typescript
// Status badges
const statusColors = {
  draft: 'Blue',
  review: 'Yellow',
  approved: 'Green',
  deprecated: 'Red',
}

// Priority badges
const priorityColors = {
  critical: 'Red',
  high: 'Orange',
  medium: 'Yellow',
  low: 'Green',
}
```

🧒 **ELI5:** Confluence doesn't understand normal HTML for fancy things like status badges. It has its own special tags (starting with `ac:`) that are like magic spells - you say the right words and a colored badge appears!

---

### 2. Business Rule to Confluence Conversion

**Pattern:**
```typescript
function businessRuleToConfluenceContent(brData: BusinessRuleData): string {
  return `
<h1>${brData.ruleId}: ${brData.ruleName}</h1>

<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="title">Rule Metadata</ac:parameter>
  <ac:rich-text-body>
    <table>
      <tr>
        <td><strong>Rule ID:</strong></td>
        <td>${brData.ruleId}</td>
        <td><strong>Status:</strong></td>
        <td>${statusBadge(brData.status)}</td>
      </tr>
    </table>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Rule Statement</h2>
<ac:structured-macro ac:name="code">
  <ac:plain-text-body><![CDATA[
IF:   ${brData.ruleStatement.if}
THEN: ${brData.ruleStatement.then}
${brData.ruleStatement.else ? `ELSE: ${brData.ruleStatement.else}` : ''}
  ]]></ac:plain-text-body>
</ac:structured-macro>
...`
}
```

---

### 3. Version Management for Updates

**Problem:** Confluence requires version number increment for updates.

**Solution:**
```typescript
async function updateConfluencePage(options: UpdatePageOptions) {
  // 1. Fetch current page to get version
  const currentPage = await getConfluencePage(cloudId, accessToken, pageId)
  const currentVersion = currentPage.version?.number || 1

  // 2. Update with incremented version
  await fetch(`/content/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title,
      body: { storage: { value: content } },
      version: { number: currentVersion + 1 },  // INCREMENT!
    }),
  })
}
```

🧒 **ELI5:** Confluence keeps track of page versions like save points in a video game. Every time you update, you need to say "this is save point #5" (one more than before), or it won't let you save.

---

### Test Summary (Phase 3.3)

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `confluence.test.ts` | 10 | Create, update, token refresh |

**Total after Phase 3.3:** 165 tests passing

---

## Session: 2026-01-29 (Phase 3.4 - JIRA Publishing)

### Overview
Implemented one-click publishing of User Stories to JIRA as Story issues.

---

### 1. Atlassian Document Format (ADF)

**What it does:** JIRA API v3 requires rich content in ADF JSON format, not HTML.

**Key File:** `src/lib/api/jira.ts`

**ADF Structure:**
```typescript
// Document wrapper
{
  type: 'doc',
  version: 1,
  content: [ /* array of block nodes */ ]
}

// Paragraph
{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }

// Heading (levels 1-6)
{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] }

// Bold text
{
  type: 'paragraph',
  content: [{
    type: 'text',
    text: 'Bold text',
    marks: [{ type: 'strong' }]
  }]
}

// Bullet list
{
  type: 'bulletList',
  content: [{
    type: 'listItem',
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'Item' }]
    }]
  }]
}

// Task list (checkboxes!)
{
  type: 'taskList',
  attrs: { localId: 'uuid' },
  content: [{
    type: 'taskItem',
    attrs: { localId: 'uuid', state: 'TODO' }, // or 'DONE'
    content: [{ type: 'text', text: 'Task description' }]
  }]
}
```

🧒 **ELI5:** JIRA speaks a special language (ADF) that's like a recipe book. Instead of just saying "make the text bold", you give it a detailed recipe: "take this text, add a 'strong' mark, put it in a paragraph container."

---

### 2. Markdown to ADF Conversion

**Problem:** User Story data contains plain text. JIRA needs ADF.

**Solution:**
```typescript
function parseDescriptionToAdf(text: string): Array<AdfNode> {
  const lines = text.split('\n')
  const content: Array<AdfNode> = []

  for (const line of lines) {
    if (line.startsWith('# ')) {
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: line.substring(2) }],
      })
    } else if (line.startsWith('## ')) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.substring(3) }],
      })
    } else if (line.startsWith('- [ ] ')) {
      content.push({
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { state: 'TODO' },
          content: [{ type: 'text', text: line.substring(6) }],
        }],
      })
    } else if (line.startsWith('- [x] ')) {
      content.push({
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { state: 'DONE' },
          content: [{ type: 'text', text: line.substring(6) }],
        }],
      })
    } else if (line.startsWith('- ')) {
      content.push({
        type: 'bulletList',
        content: [/* ... */],
      })
    } else {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      })
    }
  }

  return content
}
```

---

### 3. User Story to JIRA Description Format

**Pattern:**
```typescript
function userStoryToJiraDescription(usData: UserStoryData): string {
  let description = `# ${usData.storyId}\n\n`

  // Story Statement (As a / I want / So that)
  description += `## Story\n\n`
  description += `**As a** ${usData.storyStatement.role},\n`
  description += `**I want** ${usData.storyStatement.feature},\n`
  description += `**So that** ${usData.storyStatement.benefit}.\n\n`

  // Acceptance Criteria (Gherkin)
  if (usData.acceptanceCriteria?.length > 0) {
    description += `## Acceptance Criteria\n\n`
    for (const ac of usData.acceptanceCriteria) {
      description += `### ${ac.scenario}\n\n`
      description += `**Given** ${ac.given}\n`
      description += `**When** ${ac.when}\n`
      description += `**Then** ${ac.then}\n\n`
    }
  }

  // Definition of Done (checkboxes)
  if (usData.definitionOfDone?.length > 0) {
    description += `## Definition of Done\n\n`
    for (const dod of usData.definitionOfDone) {
      const checkbox = dod.completed ? '- [x]' : '- [ ]'
      description += `${checkbox} ${dod.text}\n`
    }
  }

  return description
}
```

This intermediate markdown format is then parsed to ADF for the JIRA API.

---

### 4. JIRA Issue Creation

**API Pattern:**
```typescript
async function createJiraIssue(options: CreateIssueOptions) {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          issuetype: { name: 'Story' },  // Create as Story type
          summary: `[${storyId}] ${title}`,
          description: {
            type: 'doc',
            version: 1,
            content: parseDescriptionToAdf(descriptionText),
          },
          labels: ['brust-creator'],  // For tracking
        },
      }),
    }
  )

  return response.json()  // { id, key, self }
}
```

**Response:** Returns `{ id: "10001", key: "PROJ-123", self: "..." }`

🧒 **ELI5:** Publishing to JIRA is like filling out a very specific form. You have to put the project name in one box, the title in another, and the description has to be formatted in JIRA's special way (ADF). When done, JIRA gives you a ticket number like "PROJ-123".

---

### Test Summary (Phase 3.4)

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `jira.test.ts` | 11 | Create, update, ADF conversion, token refresh |

**Total after Phase 3.4 (MVP Complete):** 176 tests passing

---

## MVP Complete Summary

| Phase | Focus | Tests Added |
|-------|-------|-------------|
| 1.1-1.5 | Core Foundation | 68 |
| 2.1-2.4 | AI Integration | 56 |
| 3.1-3.4 | Publishing | 38 |
| **Total** | **MVP** | **176** |

---

## Session: 2026-02-02 (Claude Pro Usage Analysis)

### Overview
Analyzed Claude Code usage statistics and reverse-engineered Claude Pro subscription quota calculations.

---

### Claude Pro Token Weighting Model

**Scope:** Concept
**Type:** Analysis / Reverse-engineering

**What it is:**
Claude Pro ($20/month) uses a weighted token calculation to determine usage percentage, not raw API costs. This explains why cache-heavy workflows barely impact your quota while AI responses do.

**Token Weighting Model:**

| Token Type | Est. Weight | Impact on Quota |
|------------|-------------|-----------------|
| Output | ~50× | **Primary driver** |
| Cache Write | ~1× | Moderate |
| Cache Read | ~0.1× | Nearly free |
| Input | ~1× | Low |

**Key Findings:**
1. **Claude Pro subsidy:** ~6-7× (pay $5/week, get ~$33 API-equivalent)
2. **Cache reads are nearly free:** 3.1M cache reads barely touched quota
3. **Output tokens are expensive:** 231 output tokens contributed ~6% alone
4. **Model choice matters:** 
   - Opus 4.5: ~7-10K output tokens/month
   - Sonnet 4: ~35-50K output tokens/month
   - Haiku: ~150K+ output tokens/month

**Practical Implications:**
- Keep sessions alive (maximize cache reads)
- Prefer concise AI responses
- Use Sonnet for routine tasks, Opus for complex reasoning

🧒 **ELI5:** Imagine your allowance is $5/week for a candy store, but the store gives you a "loyalty discount" that makes your $5 feel like $33. The catch? Speaking to the shopkeeper (AI responses) costs a lot, but looking at the candy menu again (cache reads) is almost free. So look all you want, just don't ask too many questions!

---

### Windows ESM Loader Issue (claude-statusline)

**Problem:** `npx claude-statusline` fails on Windows with:
```
Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. 
On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'
```

**Root Cause:** Node.js ESM loader on Windows requires file:// URLs, but the package uses raw absolute paths (like `c:\...`).

**Workarounds:**
1. Use `ccusage` instead (works on Windows) ✅
2. Use WSL: `wsl npx claude-statusline`
3. Report issue: https://github.com/shrwnsan/claude-statusline

---

## Session: 2026-02-02 (Claude Code Installation)

### [2026-02-02 PM] Explanation: Claude Code Installation

**Scope:** Terminal execution
**Type:** Environment setup (no code changes)

**What changed:**
- File(s): None (terminal commands only)
- Type: Environment setup

**How it works:**
1. User requested Claude Code installation steps
2. Provided 5-step guide (open terminal → npm install → verify → authenticate → use)
3. Executed `npm install -g @anthropic-ai/claude-code` in VS Code terminal
4. Started `claude` command for initial authentication setup

**Code example:**
```powershell
# Step 2: Install globally via npm
npm install -g @anthropic-ai/claude-code

# Step 4: Start and authenticate
claude
```

🧒 **ELI5:** Imagine you want to add a new helper app to your computer. First, you tell your computer "go get this app from the internet store" (npm install). Then you start the app and tell it your secret password so it knows you're allowed to use it (authentication). Now your helper is ready to work whenever you call it!

**Key Concept:** Global npm packages (`-g` flag) are installed system-wide, making the `claude` command available from any terminal, not just this project.

**Related:**
- Claude Code docs: https://anthropic.com/claude-code
- npm global packages: Stored in `%AppData%\npm` on Windows

---

### [2026-02-02 PM] Explanation: Session Summary - Protocol Fix

**Scope:** Session summary
**Type:** Protocol violation fix

**Changes made this session:**

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | `.github/rules/EXPLAIN.md` | modify | v1.2.0 - Added enforcement rule for file save confirmation |
| 2 | `.github/rules/LEARNINGS.md` | modify | Added PROTOCOL_VIOLATION entry, status → Applied |
| 3 | `.claude/commands/explain.md` | modify | Added enforcement warning to workflow |
| 4 | `docs/session-learnings.md` | modify | Added Claude Code installation explanation |

**What happened:**
1. Ran `/explain` command
2. Output included "📝 Saved to docs/session-learnings.md"
3. But NO write tool was actually called - confirmation was premature
4. User asked "review if you have updated session learnings.md"
5. Discovered violation - file was NOT updated
6. Fixed by: (a) Actually saving, (b) Logging violation, (c) Adding enforcement rule

**Key Learning:**
```
❌ WRONG: Generate content → Output "Saved to X" → (forget to actually save)
✅ RIGHT: Generate content → Call write tool → Verify success → THEN output confirmation
```

**Protocol fix applied:**
```markdown
⚠️ ENFORCEMENT: The confirmation message MUST only appear AFTER 
the file write tool has been successfully called. Never output 
"Saved to..." before the actual save operation.
```

🧒 **ELI5:** I said "I saved your homework" without actually saving it - like saying "I cleaned my room" while still standing in the hallway! Now there's a rule: don't say you did something until you ACTUALLY did it.

**Key Concept:** Actions must precede confirmations. Never claim success before the operation completes.

---

## Session: 2026-02-02 (Protocol Improvement - Phases 1-5)

### Overview
Major protocol consolidation and improvement session. Implemented 5-phase improvement plan to reduce duplication, add decisions.md integration, and create MVP 0.7 File Registration Gate.

---

### What Changed This Session

| # | File | Change Type | Summary |
|---|------|-------------|---------|
| 1 | copilot-instructions.md | modify | v5.12.0 → v5.14.0 (MVP 0.7 added) |
| 2 | GATES.md | modify | v2.3.0 → v2.4.0 (merged CHECKLISTS.md) |
| 3 | SCENARIOS.md | modify | v1.6.0 → v1.7.0 (doc refs → ai-manifest.json) |
| 4 | ai-manifest.json | modify | v1.0.0 → v1.1.0 (full docs inventory) |
| 5 | CHECKLISTS.md | delete | Content merged into GATES.md |
| 6 | DOCS_MAP.md | delete | Content migrated to ai-manifest.json |
| 7 | PROTOCOL_CHANGELOG_ARCHIVE.md | create | Historical versions v1.0-v4.14 |
| 8 | LEARNINGS.md | modify | 6 new entries captured |
| 9 | changelog.md | modify | Added v5.13.0-v5.14.0 entries |

---

### Key Technical Patterns

#### 1. File Registration Gate (MVP 0.7)

**What it does:** Ensures newly created files are registered in appropriate index files.

**Why it matters:** Prevents orphaned files (like PROTOCOL_CHANGELOG_ARCHIVE.md that was created but not added to Reference Index).

**Pattern:**
```
📄 FILE REGISTRATION GATE:
- Created: [filepath]
- Type: [rule/command/doc/tool]

| Location | Action | Status |
|----------|--------|--------|
| Reference Index | Add entry | ⏳ |
| COMMANDS.md | N/A | — |

GATE: ⏳ PENDING → Complete registrations → ✅ PASSED
```

**Registration Matrix:**
| File Created In | Must Register In |
|-----------------|------------------|
| `.github/rules/*.md` | Reference Index (copilot-instructions.md) |
| `.claude/commands/*.md` | COMMANDS.md + ai-manifest.json skills |
| `docs/*.md` | ai-manifest.json docs section |

🧒 **ELI5:** When you add a new book to your library, you MUST add it to the catalog too, or no one can find it!

---

#### 2. Protocol Consolidation Pattern

**What it does:** Reduces duplication by establishing single sources of truth.

**Before (duplicated):**
- DOCS_MAP.md had doc read/update triggers
- SCENARIOS.md had inline doc lists
- ai-manifest.json had minimal doc info

**After (consolidated):**
- ai-manifest.json is THE source for doc metadata
- SCENARIOS.md points to ai-manifest.json
- DOCS_MAP.md deleted (redundant)

**Pattern:**
```
1. Identify authoritative source (ai-manifest.json)
2. Migrate all content TO that source
3. Replace inline lists WITH pointers
4. Delete redundant files
5. Update all references
```

🧒 **ELI5:** Instead of having your address written on 3 different papers (and updating all 3 when you move), just write it ONCE in your main contact book, and tell everyone "look there."

---

#### 3. decisions.md Integration

**What it does:** Surfaces pending decisions at session start and during planning.

**Workflow added to Scenario A:**
```
Step 1: Read code-map.md
Step 1.5: Read decisions.md ← NEW
  - If pending decisions exist, surface them
  - Ask if any should be resolved before proceeding
Step 7: Update decisions.md (if major decision made) ← NEW
```

**Context Gate now shows:**
```
🔒 CONTEXT CHECK:
- decisions.md: ✅ Read (2 pending)  ← Shows pending count
```

🧒 **ELI5:** Before starting a road trip, check if there are any unanswered questions like "which route?" or "where to stop for lunch?" - don't just start driving!

---

### Learnings Captured

| Category | Count | Notable |
|----------|-------|---------|
| GAP | 3 | File registration missing, session-learnings gaps, Pester test pollution |
| OPTIMIZATION | 1 | Auto-trigger pattern for validation commands |
| INSIGHT | 2 | Code-map drift detection, changelog staleness |

**Total:** 6 learnings added to LEARNINGS.md

---

### Session Stats

- **Protocol version:** v5.12.0 → v5.14.0 (+2 minor versions)
- **Files deleted:** 2 (CHECKLISTS.md, DOCS_MAP.md)
- **Files created:** 1 (PROTOCOL_CHANGELOG_ARCHIVE.md)
- **Repos synced:** 7 (79 tests passed)
- **New MVP item:** MVP 0.7 File Registration Gate

🧒 **ELI5:** We cleaned up the AI's instruction manual - threw out duplicate pages, combined related sections, added a new rule about registering new pages, and made sure everything points to ONE place instead of scattered notes.

---

## Session: 2026-02-03 (Evening - Local Testing Setup)

### [2026-02-03 20:30] Explanation: Local Testing Environment Setup

**Scope:** session
**Type:** Setup/Configuration

**Changes made this session:**

| # | Action | Result |
|---|--------|--------|
| 1 | Created `.env` file | Copied from `.env.example` |
| 2 | Generated NextAuth secret | `ce8+Rajp50MPuJCj9ak7my96zCINjw1xuBMLFhbUYEU=` |

**Overall goal:** Set up local development environment for BRUST Creator testing

**Key decisions made:**
1. **Start with minimal config**: Skip Atlassian OAuth for initial testing (reduces setup time from ~30min to ~15min)
2. **Use free tiers**: Turso free tier is sufficient for development

**Minimum required services for local testing:**

| Service | Purpose | Required? |
|---------|---------|-----------|
| Turso | Database | ✅ Yes |
| GitHub OAuth | Login | ✅ Yes |
| NextAuth Secret | Sessions | ✅ Yes |
| Anthropic API | AI features | ✅ Yes |
| Atlassian OAuth | Publishing | ❌ No (skip for local) |

**Next steps:**
1. ~~Set up Turso database account~~ ✅ Done
2. Create GitHub OAuth app
3. Get Anthropic API key
4. Update `.env` with all credentials
5. Run `npm install` and `npx drizzle-kit push`
6. Start dev server with `npm run dev`

🧒 **ELI5:** We created a "settings file" for your app (like filling out a form before you can use a new service). Now we need to get the actual values (passwords and keys) from 4 different services to fill in the blanks.

---

### [2026-02-03 20:45] Step 3: Turso Database Setup

**Scope:** configuration
**Type:** Environment Setup

**Actions completed:**

| Action | Result |
|--------|--------|
| Added `TURSO_DATABASE_URL` to .env | `libsql://brust-dev-ansonlam3999.aws-ap-northeast-1.turso.io` |
| Added `TURSO_AUTH_TOKEN` to .env | JWT token configured |
| Added `NEXTAUTH_SECRET` to .env | Base64 secret from Step 2 |
| Pushed schema to database | `npx drizzle-kit push` succeeded |

**Database info:**
- **Provider:** Turso (SQLite edge)
- **Region:** AWS AP-Northeast-1 (Tokyo)
- **Schema:** Drizzle ORM auto-pushed

**What's in the database now:**
- `users` table (for auth)
- `accounts` table (OAuth providers)
- `sessions` table (user sessions)
- `documents` table (business rules & user stories)
- `publish_records` table (Confluence/JIRA publish tracking)
- `atlassian_tokens` table (OAuth tokens)

🧒 **ELI5:** We connected your app to a database that lives on the internet (like a Google Sheet in the cloud). We also told it what columns and tables to create. Now the app has a place to save all the business rules and user stories you'll create!

---

### [2026-02-03 20:50] Step 4: GitHub OAuth Setup

**Scope:** configuration
**Type:** Environment Setup

**Actions completed:**

| Action | Result |
|--------|--------|
| Added `GITHUB_CLIENT_ID` to .env | `Ov23lieCmX1zlluBwsJ4` |
| Added `GITHUB_CLIENT_SECRET` to .env | Configured |

**How GitHub OAuth works in BRUST Creator:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│   BRUST     │────▶│   GitHub    │
│   Browser   │     │   Creator   │     │   OAuth     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │ 1. Click Login     │                    │
      │───────────────────▶│                    │
      │                    │ 2. Redirect to GH  │
      │                    │───────────────────▶│
      │                    │                    │
      │ 3. User authorizes │                    │
      │◀───────────────────────────────────────│
      │                    │                    │
      │ 4. Callback with   │ 5. Exchange code   │
      │    auth code       │    for token       │
      │───────────────────▶│───────────────────▶│
      │                    │                    │
      │ 6. Session created │◀───────────────────│
      │◀───────────────────│                    │
      │                    │                    │
      │ 7. Logged in!      │                    │
└─────────────────────────────────────────────────────────────┘
```

**Configuration Progress:**

| Service | Status |
|---------|--------|
| ✅ Turso (Database) | Configured + Schema pushed |
| ✅ NextAuth Secret | Configured |
| ✅ GitHub OAuth | Configured |
| ⏳ Anthropic API | Next step |
| ⏭️ Atlassian OAuth | Skip for local |

🧒 **ELI5:** We told your app "when someone wants to log in, ask GitHub to verify who they are." It's like using your work badge to get into a building - instead of making you create a new password, GitHub vouches for you!

---

### [2026-02-03 20:55] Step 5: Anthropic API Setup

**Scope:** configuration
**Type:** Environment Setup

**Actions completed:**

| Action | Result |
|--------|--------|
| Added `ANTHROPIC_API_KEY` to .env | `sk-ant-api03-...` (configured) |

**How Anthropic API is used in BRUST Creator:**

| Feature | Model | Purpose |
|---------|-------|---------|
| AI Chat | Claude 3.5 Sonnet | Help users write business rules |
| Suggestions | Claude 3.5 Sonnet | Auto-complete wizard fields |
| Refinement | Claude 3.5 Sonnet | Improve rule descriptions |

**🎉 All Required Services Configured!**

| Service | Status |
|---------|--------|
| ✅ Turso (Database) | Configured + Schema pushed |
| ✅ NextAuth Secret | Configured |
| ✅ GitHub OAuth | Configured |
| ✅ Anthropic API | Configured |
| ⏭️ Atlassian OAuth | Skip for local |

🧒 **ELI5:** We gave your app the password to talk to Claude (the AI). Now when you're stuck writing a business rule, you can ask the AI for help and it will respond!

---

### [2026-02-03 21:00] Fix: Root page showing Next.js default template

**Scope:** fix
**Type:** Bug Fix

**Problem:**
- User navigated to `localhost:3000`
- Saw default Next.js "To get started, edit page.tsx" screen
- Expected to see BRUST Creator login or dashboard

**Root Cause:**
The `src/app/page.tsx` file contained the default Next.js template code that was never replaced with actual app logic.

**Fix Applied:**
Replaced root page with authentication-aware redirect:

```tsx
// Before: Default Next.js template
export default function Home() {
  return <div>To get started, edit the page.tsx file...</div>
}

// After: Smart redirect
export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/history')  // Dashboard
  } else {
    redirect('/login')    // Login page
  }
}
```

**App Route Structure:**

```
/ (root)
├── Authenticated? → /history (dashboard)
└── Not authenticated? → /login

/login
└── Click "Login with GitHub" → OAuth flow → /history

/(dashboard)/*  ← Protected routes
├── /history
├── /business-rule/new
├── /business-rule/[id]
├── /user-story/new
├── /user-story/[id]
└── /settings
```

🧒 **ELI5:** The front door of your app was showing a "coming soon" sign instead of letting people in. Now it checks if you have a key (logged in) and either lets you into the main room (dashboard) or sends you to get a key (login page).

---

**Last Updated:** 2026-02-03
