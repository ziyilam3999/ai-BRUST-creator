/**
 * e2e/fixtures/api-mocks.ts
 * D2: Playwright route() helpers that intercept API calls so E2E tests
 *     do NOT require a running database, live AI credentials, or seeded data.
 *
 * Usage:
 *   import { useApiMocks } from '../fixtures/api-mocks'
 *   test('my test', async ({ page }) => {
 *     await useApiMocks(page)
 *     await page.goto('/business-rule/guided/new')
 *     ...
 *   })
 */
import type { Page } from '@playwright/test'

/** Minimal fixture for a guided AI response (non-streaming plain text). */
const GUIDED_AI_FIXTURE = {
  content: 'I can help you create this document. Let me start with the Basic Info section.\n\n**Rule ID:** BR-001\n**Rule Name:** Example Validation Rule\n\nDoes this look correct to you?',
  sectionContext: 'basicInfo',
  draftContent: {
    ruleId: 'BR-001',
    ruleName: 'Example Validation Rule',
  },
}

/** Minimal fixture for a convert API analysis response. */
const CONVERT_ANALYSIS_FIXTURE = {
  type: 'analysis',
  analysis: {
    shouldSplit: false,
    suggestedCount: 1,
    reasoning: ['Business rule is self-contained', 'Single persona identified'],
    proposedStories: [
      {
        title: 'As a user I want to validate my input',
        rationale: 'core validation scenario',
        estimatedSize: 'M',
      },
    ],
  },
}

/** Minimal fixture for a convert API conversion response. */
const CONVERT_STORIES_FIXTURE = {
  type: 'conversion',
  stories: [
    {
      id: 'US-001',
      persona: 'User',
      action: 'validate my input',
      outcome: 'my data is accepted',
      acceptanceCriteria: ['Given valid data, when submitted, then system accepts it'],
      priority: 'Medium',
      storyPoints: 3,
    },
  ],
  sourceRuleId: 'BR-001',
}

/**
 * Sets up all API route mocks for the current page.
 * Call this at the start of each test that needs mocked APIs.
 */
export async function useApiMocks(page: Page): Promise<void> {
  // Mock the guided AI chat endpoint
  // The real endpoint uses streamText, but for E2E we return a plain JSON response
  await page.route('**/api/ai/guided', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(GUIDED_AI_FIXTURE),
    })
  })

  // Mock the BR-to-US convert endpoint
  await page.route('**/api/ai/convert', async (route) => {
    const body = await route.request().postDataJSON().catch(() => ({}))
    // Return analysis if no options.forceSplit, else conversion
    const response = body?.options?.forceSplit
      ? CONVERT_STORIES_FIXTURE
      : CONVERT_ANALYSIS_FIXTURE
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })

  // Mock the documents draft endpoint (D3)
  await page.route('**/api/documents/draft', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 404, body: JSON.stringify({ error: 'No draft' }) })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ draftId: 'draft-001', updatedAt: new Date().toISOString() }),
      })
    }
  })

  // Mock auth session check (NextAuth)
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
        expires: '2099-01-01',
      }),
    })
  })
}
