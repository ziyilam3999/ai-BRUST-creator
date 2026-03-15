# BRUST Creator

> **BRUST** = **B**usiness **R**ules & **U**ser **S**tory **T**ool

AI-assisted business rule and user story generator. Transform product requirements into structured, consistent business rules and user stories using Claude AI.

## Features

- **AI-powered generation** — Claude AI transforms requirements into structured business rules and user stories
- **GitHub OAuth** — Sign in with GitHub, no separate account needed
- **Type-safe throughout** — Zod schemas validate all AI outputs at runtime
- **Persistent storage** — Turso (LibSQL) database with Drizzle ORM
- **Modern stack** — Next.js 16, React 19, TailwindCSS 4

## Tech Stack

- **Next.js 16** / **React 19** — App router with server actions
- **TypeScript** — Full type safety
- **Claude API** (Anthropic SDK) — AI generation engine
- **Drizzle ORM** + **Turso** (LibSQL) — Database
- **NextAuth v4** — GitHub OAuth authentication
- **Zustand** — Client state management
- **Radix UI** + **TailwindCSS 4** — Component library and styling
- **Vitest** + **Playwright** — Unit and E2E testing

## Quick Start

### Prerequisites

- Node.js >= 18
- A [Turso](https://turso.tech/) database
- An [Anthropic API key](https://console.anthropic.com/)
- A [GitHub OAuth app](https://github.com/settings/developers)

### Setup

```bash
# Install dependencies
npm install

# Copy environment template and fill in your keys
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

## Project Structure

```
src/
  app/            # Next.js app router pages
    (auth)/       # Login and auth flows
    (dashboard)/  # Main application views
    api/          # API routes
  components/     # Reusable UI components
  lib/
    ai/           # Claude AI integration
    auth/         # NextAuth configuration
    db/           # Drizzle schema and queries
  stores/         # Zustand state management
  types/          # Shared TypeScript types
```

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run db:studio    # Open Drizzle Studio (database GUI)
```

## License

MIT
