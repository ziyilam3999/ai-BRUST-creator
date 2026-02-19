import { test, expect } from '@playwright/test'
import { useApiMocks } from '../fixtures/api-mocks'

/**
 * E2E test for BR-to-US conversion flow.
 * Tests the full flow: view completed BR → trigger conversion → review analysis →
 * generate stories → review/edit stories → save all.
 *
 * All API calls are mocked via useApiMocks — no running DB or seeded data required.
 */
test.describe('BR-to-US Conversion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await useApiMocks(page)
  })

  test('should show conversion prompt on completed BR detail page', async ({ page }) => {
    // Navigate to a completed BR (assumes seeded data)
    await page.goto('/business-rule/test-br-id')

    // Conversion prompt should appear for completed BRs
    await expect(page.getByText('Business Rule Complete!')).toBeVisible()
    await expect(page.getByText('Convert to User Stories')).toBeVisible()
    await expect(page.getByText('Just Save BR')).toBeVisible()
  })

  test('should trigger analysis when convert button is clicked', async ({ page }) => {
    await page.goto('/business-rule/test-br-id')

    // Click convert
    await page.getByText('Yes, Convert to User Stories').click()

    // Should show analyzing state or analysis results
    await expect(
      page.getByText('AI is analyzing').or(page.getByText('AI Recommendation'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('should display generated stories in side-by-side view', async ({ page }) => {
    await page.goto('/business-rule/test-br-id')

    // Trigger full conversion flow
    await page.getByText('Yes, Convert to User Stories').click()

    // Wait for analysis
    await page.waitForSelector('text=AI Recommendation', { timeout: 10000 })

    // Accept analysis
    await page.getByText(/Generate \d+ User/).click()

    // Wait for stories
    await page.waitForSelector('text=Source Business Rule', { timeout: 15000 })
    await expect(page.getByText('Generated User Stories')).toBeVisible()
    await expect(page.getByText('Conversion Summary')).toBeVisible()
  })

  test('should allow editing a generated story', async ({ page }) => {
    await page.goto('/business-rule/test-br-id')

    // Full flow to generated stories
    await page.getByText('Yes, Convert to User Stories').click()
    await page.waitForSelector('text=AI Recommendation', { timeout: 10000 })
    await page.getByText(/Generate \d+ User/).click()
    await page.waitForSelector('text=Source Business Rule', { timeout: 15000 })

    // Click edit on first story (use exact match to avoid matching disabled "Edit (Coming Soon)" button)
    const editButtons = page.getByRole('button', { name: /^Edit$/i })
    await editButtons.first().click()

    // Editor modal should open
    await expect(page.getByText('Edit User Story')).toBeVisible()

    // Save changes
    await page.getByRole('button', { name: /save/i }).click()
  })
})
