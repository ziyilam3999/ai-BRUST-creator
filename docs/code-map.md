# Code Map

> **Purpose:** Single source of truth for project structure. Read before ANY code change.

## Project Overview

| Field | Value |
|-------|-------|
| **Project Name** | BRUST Creator |
| **Created** | 2026-01-25 |
| **Type** | Web Application |
| **Language** | TypeScript |
| **Framework** | Next.js 16.1.6 (App Router) |
| **Description** | Business Rule and User Story Generator with AI assistance |

## Technology Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Framework | Next.js 16.1.6 (TypeScript) | Full-stack, great DX, Vercel-native |
| AI | Vercel AI SDK + Anthropic Claude | Native Next.js integration, streaming |
| Auth | NextAuth.js + GitHub OAuth | Simple, aligns with dev workflow |
| Database | Turso (SQLite edge) | Free tier, perfect for 10-20 users |
| ORM | Drizzle | Type-safe, lightweight |
| UI | Tailwind + shadcn/ui | Fast development, professional look |
| Hosting | Vercel | One-click deploys, free tier sufficient |
| Testing | Vitest + Testing Library + Playwright | Unit, integration, E2E coverage |

## Directory Structure

```
ai-BRUST-creator/
├── .github/
│   ├── copilot-instructions.md    # AI protocol (v5.14.0)
│   └── rules/                     # Modular protocol rules
├── .claude/                       # Claude Code commands
│   └── commands/                  # Skill definitions
├── docs/                          # Project documentation
│   ├── README.md                 # Documentation hub
│   ├── code-map.md               # This file - codebase structure
│   ├── requirements.md           # Feature specs
│   ├── progress.md               # Session tracking
│   ├── architecture.md           # Design decisions
│   ├── api-contracts.md          # API endpoint specs
│   ├── testing.md                # Test strategy
│   ├── defects.md                # Bug tracking
│   ├── refactoring.md            # Technical debt tracking
│   ├── standards.md              # Coding patterns
│   ├── changelog.md              # Version history
│   ├── deployment.md             # Deployment guide
│   ├── session-learnings.md      # Technical explanations & patterns
│   ├── decisions.md              # Why we made certain choices
│   ├── ai-manifest.json          # AI agent configuration
│   └── proposals/                # Feature proposals awaiting approval
│       └── explain-auto-document.md
├── __tests__/                     # Test files (mirrors src/)
│   ├── unit/                     # Unit tests
│   │   ├── db/                   # Database layer tests
│   │   ├── stores/               # Store tests (wizard, guided)
│   │   ├── lib/                  # Library tests (calculator, sanitizer, advice)
│   │   └── utils/                # Utility function tests
│   ├── integration/              # Integration tests
│   │   └── api/                  # API route tests
│   └── components/               # Component tests
│       ├── wizard/               # Wizard component tests
│       ├── guided/               # Guided creation component tests
│       └── chat/                 # Chat component tests
├── e2e/                          # End-to-end tests
│   └── flows/                    # User flow tests
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth routes
│   │   │   ├── login/page.tsx
│   │   │   └── callback/
│   │   ├── (dashboard)/          # Protected routes
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Document list
│   │   │   ├── business-rule/
│   │   │   │   ├── new/page.tsx  # BR wizard
│   │   │   │   ├── guided/new/page.tsx # Guided BR creation
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── user-story/
│   │   │   │   ├── new/page.tsx  # US wizard
│   │   │   │   ├── guided/new/page.tsx # Guided US creation
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── ai/
│   │   │   │   │   ├── chat/route.ts
│   │   │   │   ├── generate/route.ts
│   │   │   │   ├── guided/route.ts   # AI-guided creation (streaming)
│   │   │   │   └── clarify/route.ts
│   │   │   ├── documents/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── publish/
│   │   │   │   ├── confluence/route.ts
│   │   │   │   └── jira/route.ts
│   │   │   └── atlassian/
│   │   │       ├── connect/route.ts
│   │   │       └── status/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx              # Landing
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── wizard/
│   │   │   ├── index.ts          # Barrel exports
│   │   │   ├── wizard-container.tsx
│   │   │   ├── wizard-progress.tsx
│   │   │   ├── user-story-wizard-container.tsx
│   │   │   ├── business-rule/    # BR wizard steps
│   │   │   └── user-story/       # US wizard steps
│   │   ├── guided/               # AI-guided creation UI
│   │   │   ├── index.ts          # Barrel exports
│   │   │   ├── guided-creator-container.tsx
│   │   │   ├── conversation-panel.tsx
│   │   │   ├── document-panel.tsx
│   │   │   ├── section-card.tsx
│   │   │   ├── section-navigation.tsx
│   │   │   ├── completion-summary.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   └── action-bar.tsx
│   │   ├── chat/
│   │   │   └── chat-panel.tsx
│   │   ├── providers/
│   │   │   └── session-provider.tsx
│   │   └── publish/
│   │       └── publish-dialog.tsx
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── auth-options.ts
│   │   │   ├── atlassian-oauth.ts
│   │   │   └── types.ts
│   │   ├── ai/
│   │   │   ├── prompts.ts        # AI system & generation prompts
│   │   │   ├── guided-prompts.ts # Guided creation prompts (BR + US)
│   │   │   └── input-sanitizer.ts# Prompt injection + XSS prevention
│   │   ├── guided/
│   │   │   ├── completion-calculator.ts # Section-weighted scoring
│   │   │   └── advice-engine.ts  # Completion-based guidance
│   │   ├── api/
│   │   │   ├── confluence.ts
│   │   │   └── jira.ts
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   └── schema.ts
│   │   └── utils.ts              # Utility functions (cn)
│   ├── hooks/
│   │   └── use-documents.ts      # Document list data hook
│   └── types/
│       ├── business-rule.ts
│       └── user-story.ts
├── public/                       # Static assets
├── tools/                        # Build/sync tools
│   ├── extract_docs.ps1
│   └── sync_copilot_instructions.ps1
├── tmp/                          # Temporary AI session files
├── .env.local                    # Environment variables
├── .env.example                  # Environment template
├── next.config.ts
├── package.json
├── components.json               # shadcn/ui configuration
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── CLAUDE.md                     # Claude Code instructions (auto-generated)
└── tsconfig.json
```

## Key Files

| File | Purpose | Status |
|------|---------|--------|
| `vitest.config.ts` | Test configuration | ✅ Created |
| `playwright.config.ts` | E2E test configuration | ✅ Created |
| `drizzle.config.ts` | Database configuration | ✅ Created |
| `.env.example` | Environment template | ✅ Created |
| `src/lib/utils.ts` | Utility functions (cn) | ✅ Created |
| `src/components/ui/*` | shadcn/ui components | ✅ Created |
| `__tests__/setup.ts` | Test setup file | ✅ Created |
| `src/lib/auth/auth-options.ts` | NextAuth configuration | ✅ Created |
| `src/lib/auth/types.ts` | Session/JWT type extensions | ✅ Created |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler | ✅ Created |
| `src/middleware.ts` | Auth middleware | ✅ Created |
| `src/app/(auth)/login/page.tsx` | Login page | ✅ Created |
| `src/components/providers/session-provider.tsx` | Session provider | ✅ Created |
| `src/lib/db/schema.ts` | Database schema (Drizzle) | ✅ Created |
| `src/lib/db/index.ts` | Database connection | ✅ Created |
| `__tests__/unit/db/schema.test.ts` | Schema unit tests | ✅ Created |
| `src/types/business-rule.ts` | BR type definitions | ✅ Created |
| `src/stores/wizard-store.ts` | Wizard state (Zustand) | ✅ Created |
| `src/components/wizard/wizard-container.tsx` | Wizard orchestration | ✅ Created |
| `src/components/wizard/wizard-progress.tsx` | Progress bar | ✅ Created |
| `src/components/wizard/business-rule/*.tsx` | 7 step components | ✅ Created |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout | ✅ Created |
| `src/app/(dashboard)/page.tsx` | Dashboard page | ✅ Created |
| `src/app/(dashboard)/business-rule/new/page.tsx` | BR wizard route | ✅ Created |
| `__tests__/unit/stores/wizard-store.test.ts` | Wizard store tests | ✅ Created |
| `__tests__/components/wizard/wizard-container.test.tsx` | Wizard component tests | ✅ Created |
| `src/app/api/documents/route.ts` | Documents API (list, create) | ✅ Created |
| `src/app/api/documents/[id]/route.ts` | Document CRUD (get, update, delete) | ✅ Created |
| `__tests__/integration/api/documents.test.ts` | Documents API tests (14 tests) | ✅ Created |
| `src/hooks/use-documents.ts` | Documents data hook | ✅ Created |
| `src/app/(dashboard)/history/page.tsx` | Document history list | ✅ Created |
| `src/app/(dashboard)/business-rule/[id]/page.tsx` | BR detail/view page | ✅ Created |
| `src/app/api/ai/chat/route.ts` | AI streaming chat endpoint | ✅ Created |
| `src/app/api/ai/generate/route.ts` | AI document generation | ✅ Created |
| `src/lib/ai/prompts.ts` | System and generation prompts | ✅ Created |
| `src/components/chat/chat-panel.tsx` | Floating AI chat panel | ✅ Created |
| `__tests__/integration/api/ai-chat.test.ts` | AI endpoint tests (9) | ✅ Created |
| `__tests__/components/chat/chat-panel.test.tsx` | Chat panel tests (9) | ✅ Created |
| `src/types/user-story.ts` | US type definitions | ✅ Created |
| `src/stores/user-story-wizard-store.ts` | US wizard state (Zustand) | ✅ Created |
| `src/components/wizard/user-story-wizard-container.tsx` | US wizard orchestration | ✅ Created |
| `src/components/wizard/user-story/*.tsx` | 6 US step components | ✅ Created |
| `src/app/(dashboard)/user-story/new/page.tsx` | US wizard route | ✅ Created |
| `src/app/(dashboard)/user-story/[id]/page.tsx` | US detail/view page | ✅ Created |
| `__tests__/unit/stores/user-story-wizard-store.test.ts` | US store tests (27) | ✅ Created |
| `__tests__/components/wizard/user-story/user-story-wizard.test.tsx` | US wizard tests (11) | ✅ Created |
| `src/lib/auth/atlassian-oauth.ts` | Atlassian OAuth + encryption | ✅ Created |
| `src/app/api/atlassian/connect/route.ts` | Start OAuth flow | ✅ Created |
| `src/app/api/atlassian/callback/route.ts` | OAuth callback handler | ✅ Created |
| `src/app/api/atlassian/status/route.ts` | Connection status/disconnect | ✅ Created |
| `src/app/(dashboard)/settings/page.tsx` | Settings page | ✅ Created |
| `__tests__/integration/api/atlassian.test.ts` | Atlassian OAuth tests (17) | ✅ Created |
| `src/lib/api/confluence.ts` | Confluence API client | ✅ Created |
| `src/app/api/publish/confluence/route.ts` | Confluence publish endpoint | ✅ Created |
| `src/components/publish/publish-dialog.tsx` | Publish confirmation dialog | ✅ Created |
| `__tests__/integration/api/confluence.test.ts` | Confluence publish tests (10) | ✅ Created |
| `src/lib/api/jira.ts` | JIRA API client | ✅ Created |
| `src/app/api/publish/jira/route.ts` | JIRA publish endpoint | ✅ Created |
| `__tests__/integration/api/jira.test.ts` | JIRA publish tests (11) | ✅ Created |
| `src/stores/guided-creator-store.ts` | Guided creation session state (Zustand) | ✅ Created |
| `src/lib/guided/completion-calculator.ts` | Section-weighted completion scoring | ✅ Created |
| `src/lib/guided/advice-engine.ts` | Completion-based user guidance | ✅ Created |
| `src/lib/ai/guided-prompts.ts` | AI prompts for guided BR + US creation | ✅ Created |
| `src/lib/ai/input-sanitizer.ts` | Prompt injection + XSS sanitization | ✅ Created |
| `src/app/api/ai/guided/route.ts` | Guided AI streaming endpoint + rate limiting | ✅ Created |
| `__tests__/unit/stores/guided-creator-store.test.ts` | Guided store tests (27) | ✅ Created |
| `__tests__/unit/lib/completion-calculator.test.ts` | Completion calculator tests (24) | ✅ Created |
| `__tests__/unit/lib/advice-engine.test.ts` | Advice engine tests (21) | ✅ Created |
| `__tests__/unit/lib/input-sanitizer.test.ts` | Input sanitizer tests (23) | ✅ Created |
| `__tests__/integration/api/guided.test.ts` | Guided AI API tests (10) | ✅ Created |
| `src/components/guided/guided-creator-container.tsx` | Split-panel guided creation layout | ✅ Created |
| `src/components/guided/conversation-panel.tsx` | Chat messages + input + AI thinking | ✅ Created |
| `src/components/guided/document-panel.tsx` | Section cards + completion summary | ✅ Created |
| `src/components/guided/section-card.tsx` | Editable section cards (FieldEditor + SectionDisplay) | ✅ Created |
| `src/components/guided/section-navigation.tsx` | Section tabs with status icons | ✅ Created |
| `src/components/guided/completion-summary.tsx` | Progress bar + advice engine display | ✅ Created |
| `src/components/guided/message-bubble.tsx` | AI/user/system message display | ✅ Created |
| `src/components/guided/action-bar.tsx` | Accept/Edit/Regenerate/Skip buttons | ✅ Created |
| `src/components/guided/index.ts` | Barrel exports for guided components | ✅ Created |
| `src/app/(dashboard)/business-rule/guided/new/page.tsx` | Guided BR creation route | ✅ Created |
| `src/app/(dashboard)/user-story/guided/new/page.tsx` | Guided US creation route | ✅ Created |
| `__tests__/components/guided/guided-components.test.tsx` | Guided UI component tests (35) | ✅ Created |

## Modules / Components

| Module | Path | Responsibility | Status |
|--------|------|----------------|--------|
| Auth | `src/lib/auth/` | GitHub OAuth, Atlassian OAuth | ✅ Phase 1.2 |
| Providers | `src/components/providers/` | Context providers | ✅ Phase 1.2 |
| Database | `src/lib/db/` | Turso connection, Drizzle ORM | ✅ Phase 1.3 |
| Types | `src/types/` | BR and US type definitions | ✅ Phase 1.4/2.4 |
| Stores | `src/stores/` | Zustand state management (BR + US) | ✅ Phase 1.4/2.4 |
| BR Wizard | `src/components/wizard/business-rule/` | Business Rule wizard | ✅ Phase 1.4 |
| US Wizard | `src/components/wizard/user-story/` | User Story wizard | ✅ Phase 2.4 |
| Documents API | `src/app/api/documents/` | Document CRUD endpoints | ✅ Phase 1.5 |
| Hooks | `src/hooks/` | Custom React hooks | ✅ Phase 1.5 |
| History | `src/app/(dashboard)/history/` | Document history list | ✅ Phase 1.5 |
| AI | `src/lib/ai/` | Anthropic Claude integration | ✅ Phase 2 |
| AI API | `src/app/api/ai/` | Chat and generate endpoints | ✅ Phase 2 |
| Chat | `src/components/chat/` | AI chat panel | ✅ Phase 2 |
| Atlassian Auth | `src/lib/auth/atlassian-oauth.ts` | OAuth + token encryption | ✅ Phase 3.2 |
| Confluence | `src/lib/api/confluence.ts` | Confluence API client | ✅ Phase 3.3 |
| JIRA | `src/lib/api/jira.ts` | JIRA API client | ✅ Phase 3.4 |
| Publish API | `src/app/api/publish/` | Confluence/JIRA endpoints | ✅ Phase 3.3/3.4 |
| Guided Store | `src/stores/guided-creator-store.ts` | Guided creation session state | ✅ Guided P1 |
| Guided Lib | `src/lib/guided/` | Completion calc + advice engine | ✅ Guided P1 |
| AI Guided | `src/lib/ai/guided-prompts.ts` | SBVR/INVEST prompts for guided creation | ✅ Guided P1 |
| Input Sanitizer | `src/lib/ai/input-sanitizer.ts` | Prompt injection + XSS prevention | ✅ Guided P1 |
| Guided API | `src/app/api/ai/guided/route.ts` | Streaming AI endpoint + rate limiting | ✅ Guided P1 |
| Guided UI | `src/components/guided/` | Split-panel guided creation components | ✅ Guided P2 |
| Guided Routes | `src/app/(dashboard)/*/guided/new/` | Guided creation page routes | ✅ Guided P2 |

## Entry Points

| Entry Point | File | Description |
|-------------|------|-------------|
| Landing | `src/app/page.tsx` | Public landing page |
| Login | `src/app/(auth)/login/page.tsx` | GitHub OAuth login |
| Dashboard | `src/app/(dashboard)/page.tsx` | Document list (protected) |
| BR Wizard | `src/app/(dashboard)/business-rule/new/page.tsx` | Create Business Rule |
| US Wizard | `src/app/(dashboard)/user-story/new/page.tsx` | Create User Story |
| Guided BR | `src/app/(dashboard)/business-rule/guided/new/page.tsx` | AI-Guided BR Creation |
| Guided US | `src/app/(dashboard)/user-story/guided/new/page.tsx` | AI-Guided US Creation |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/*` | * | NextAuth.js endpoints |
| `/api/ai/chat` | POST | AI chat with streaming |
| `/api/ai/generate` | POST | Generate document from wizard data |
| `/api/ai/guided` | POST | AI-guided creation (streaming + rate limited) |
| `/api/ai/clarify` | POST | Get clarification questions |
| `/api/documents` | GET, POST | List/create documents |
| `/api/documents/[id]` | GET, PUT, DELETE | Document CRUD |
| `/api/publish/confluence` | POST | Publish to Confluence |
| `/api/publish/jira` | POST | Publish to JIRA |
| `/api/atlassian/connect` | GET | Start Atlassian OAuth |
| `/api/atlassian/status` | GET | Check connection status |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.6 | React framework |
| react | 19.2.3 | UI library |
| ai | ^3.4.0 | Vercel AI SDK |
| @ai-sdk/anthropic | ^0.0.50 | Anthropic provider |
| next-auth | ^4.24.0 | Authentication |
| drizzle-orm | ^0.33.0 | ORM |
| @libsql/client | ^0.10.0 | Turso database client |
| react-hook-form | ^7.71.1 | Form handling |
| zod | ^3.25.76 | Schema validation |
| zustand | ^4.5.0 | State management |
| tailwindcss | ^4 | CSS framework |
| vitest | ^2.0.0 | Testing framework |
| @testing-library/react | ^16.0.0 | Component testing |
| @playwright/test | ^1.47.0 | E2E testing |

## shadcn/ui Components (Installed)

| Component | File |
|-----------|------|
| Alert Dialog | `src/components/ui/alert-dialog.tsx` |
| Badge | `src/components/ui/badge.tsx` |
| Button | `src/components/ui/button.tsx` |
| Card | `src/components/ui/card.tsx` |
| Checkbox | `src/components/ui/checkbox.tsx` |
| Dialog | `src/components/ui/dialog.tsx` |
| Form | `src/components/ui/form.tsx` |
| Input | `src/components/ui/input.tsx` |
| Label | `src/components/ui/label.tsx` |
| Select | `src/components/ui/select.tsx` |
| Sonner (Toast) | `src/components/ui/sonner.tsx` |
| Table | `src/components/ui/table.tsx` |
| Tabs | `src/components/ui/tabs.tsx` |
| Textarea | `src/components/ui/textarea.tsx` |
| Progress | `src/components/ui/progress.tsx` |

---

**Last Updated:** 2026-02-05
