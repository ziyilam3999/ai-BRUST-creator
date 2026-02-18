/**
 * Tests for Phase 6B publish suggestion trigger logic.
 * Covers: completion trigger guard conditions + remindAt timestamp comparison.
 * @spec tmp/remaining-implementation-plan.md Group A Steps A2, A5
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Helper that mirrors the trigger condition logic in guided-creator-container.tsx
// Extracted for isolated unit testing
function shouldShowPublishSuggestion(
  overallCompletion: number,
  dismissed: boolean,
  remindLater: boolean,
  remindAt: string | null,
  now: number = Date.now()
): boolean {
  if (overallCompletion < 80) return false
  if (dismissed) return false
  if (remindLater) {
    if (!remindAt) return false
    return now > new Date(remindAt).getTime()
  }
  return true
}

describe('shouldShowPublishSuggestion — trigger guard logic', () => {
  const PAST = new Date(Date.now() - 3600_000).toISOString()    // 1 hour ago
  const FUTURE = new Date(Date.now() + 3600_000).toISOString()  // 1 hour from now

  it('fires when completion reaches 80%', () => {
    expect(shouldShowPublishSuggestion(80, false, false, null)).toBe(true)
  })

  it('fires when completion exceeds 80%', () => {
    expect(shouldShowPublishSuggestion(95, false, false, null)).toBe(true)
  })

  it('does NOT fire below 80%', () => {
    expect(shouldShowPublishSuggestion(79, false, false, null)).toBe(false)
  })

  it('does NOT fire at exactly 0%', () => {
    expect(shouldShowPublishSuggestion(0, false, false, null)).toBe(false)
  })

  it('does NOT fire when dismissed, even at 100%', () => {
    expect(shouldShowPublishSuggestion(100, true, false, null)).toBe(false)
  })

  it('does NOT fire when remindLater is true and remindAt is in the future', () => {
    expect(shouldShowPublishSuggestion(80, false, true, FUTURE)).toBe(false)
  })

  it('DOES fire when remindLater is true and remindAt has passed', () => {
    expect(shouldShowPublishSuggestion(80, false, true, PAST)).toBe(true)
  })

  it('does NOT fire when remindLater is true and remindAt is null', () => {
    expect(shouldShowPublishSuggestion(80, false, true, null)).toBe(false)
  })

  it('dismissed takes precedence over remindAt passed', () => {
    expect(shouldShowPublishSuggestion(80, true, true, PAST)).toBe(false)
  })

  it('does NOT fire at 79% even with no guards set', () => {
    expect(shouldShowPublishSuggestion(79, false, false, null)).toBe(false)
  })
})
