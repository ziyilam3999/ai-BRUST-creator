# Contributing to BRUST Creator

Thanks for your interest in contributing!

## Getting Started

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your keys
4. Run database migrations: `npm run db:migrate`
5. Start the dev server: `npm run dev`

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run Vitest tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # Run ESLint
npm run db:studio    # Open Drizzle Studio
```

## Submitting Changes

1. Create a branch: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. Ensure lint passes: `npm run lint`
4. Submit a pull request

## Guidelines

- Keep PRs focused on a single change
- Follow existing code patterns (App Router, server actions, Zod validation)
- Use Radix UI primitives for new components
- Add Vitest tests for business logic

## Bug Reports

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and Node.js version
