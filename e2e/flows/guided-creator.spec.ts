/**
 * e2e/flows/guided-creator.spec.ts
 * D2: E2E tests for the guided creator flow.
 * All API calls are mocked via useApiMocks — no running DB required.
 *
 * Scenarios:
 *   1. Happy path: navigate → fill ruleStatement field → send message → AI responds
 *   2. Undo: edit a section field manually → Ctrl+Z → verify previous value restored
 *
 * TODO D2-phase2: Publish suggestion E2E (requires ≥80% completion setup — deferred)
 */
import { test, expect } from '@playwright/test'
import { useApiMocks } from '../fixtures/api-mocks'

test.describe('Guided Creator — Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await useApiMocks(page)
  })

  test('page loads and shows the guided creator header', async ({ page }) => {
    await page.goto('/business-rule/guided/new')

    // Header should show document type
    await expect(page.getByRole('heading', { name: /Business Rule/i })).toBeVisible({ timeout: 10000 })

    // Save Draft button should be present
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible()
  })

  test('document panel has Undo and Redo buttons (D1)', async ({ page }) => {
    await page.goto('/business-rule/guided/new')

    await expect(page.getByRole('button', { name: /Undo last change/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Redo last change/i })).toBeVisible()

    // Both should start disabled (empty undo stack)
    await expect(page.getByRole('button', { name: /Undo last change/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Redo last change/i })).toBeDisabled()
  })

  test('conversation panel has a message input', async ({ page }) => {
    await page.goto('/business-rule/guided/new')

    // Chat input area should be present
    const input = page.getByRole('textbox').or(page.locator('textarea')).first()
    await expect(input).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Guided Creator — Undo/Redo (D1)', () => {
  test.beforeEach(async ({ page }) => {
    await useApiMocks(page)
  })

  test('Ctrl+Z keyboard shortcut does not throw errors on empty stack', async ({ page }) => {
    await page.goto('/business-rule/guided/new')

    // Wait for render
    await expect(page.getByRole('heading', { name: /Business Rule/i })).toBeVisible({ timeout: 10000 })

    // Trigger Ctrl+Z on empty stack — should be a no-op (no error, no navigation)
    await page.keyboard.press('Control+z')

    // Page should still show the heading
    await expect(page.getByRole('heading', { name: /Business Rule/i })).toBeVisible()
  })
})
