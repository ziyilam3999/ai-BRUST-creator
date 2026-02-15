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
<!-- Historical entries archived to docs/learnings-history.md -->

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
