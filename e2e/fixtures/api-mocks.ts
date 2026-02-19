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

/** Fixture: a saved auto-save draft from D3 server-side save. */
const DRAFT_FIXTURE = {
  draftId: 'draft-001',
  updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
  documentType: 'business_rule',
  content: {
    sections: {
      basicInfo: { ruleId: 'BR-001', ruleName: 'Saved Draft Rule' },
    },
    conversationHistory: [],
  },
}

/** Fixture: Atlassian connected status response. */
const ATLASSIAN_CONNECTED_FIXTURE = {
  connected: true,
  siteName: 'My Atlassian Site',
  siteUrl: 'https://myorg.atlassian.net',
  needsRefresh: false,
  connectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
}

/** Fixture: Confluence publish success response. */
const CONFLUENCE_PUBLISH_FIXTURE = {
  success: true,
  updated: false,
  pageId: 'page-123',
  pageUrl: 'https://myorg.atlassian.net/wiki/spaces/BRUST/pages/page-123',
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

  // Mock Atlassian status (not connected by default)
  await page.route('**/api/atlassian/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connected: false }),
    })
  })
}

/**
 * Extends useApiMocks so that GET /api/documents/draft returns a saved draft.
 * Use this in tests that verify the draft-restore UX.
 */
export async function useApiMocksWithDraft(page: Page): Promise<void> {
  await useApiMocks(page)

  // Override the draft endpoint to return a saved draft on GET
  await page.route('**/api/documents/draft', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DRAFT_FIXTURE),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ draftId: 'draft-001', updatedAt: new Date().toISOString() }),
      })
    }
  })
}

/**
 * Extends useApiMocks so that Atlassian is connected and publish endpoints succeed.
 * Use this in tests that verify the Confluence publish flow.
 */
export async function useApiMocksWithAtlassian(page: Page): Promise<void> {
  await useApiMocks(page)

  // Override Atlassian status — connected
  await page.route('**/api/atlassian/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ATLASSIAN_CONNECTED_FIXTURE),
    })
  })

  // Mock Confluence publish endpoint
  await page.route('**/api/publish/confluence', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CONFLUENCE_PUBLISH_FIXTURE),
    })
  })

  // Mock Jira publish endpoint
  await page.route('**/api/publish/jira', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        updated: false,
        issueKey: 'PROJ-42',
        issueUrl: 'https://myorg.atlassian.net/browse/PROJ-42',
      }),
    })
  })
}
