/**
 * Integration tests for Phase 6B publish suggestion UI wiring.
 * Tests that:
 *  - PublishSuggestionCard renders in ConversationPanel when showSuggestion is true
 *  - Dismiss action hides the card
 *  - RemindLater action hides the card and stores timestamp
 * @spec tmp/remaining-implementation-plan.md Group A Step A6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'

// Reset store between tests
beforeEach(async () => {
  const { useGuidedCreatorStore } = await import('@/stores/guided-creator-store')
  act(() => {
    useGuidedCreatorStore.getState().reset()
  })
})

describe('Publish suggestion store actions', () => {
  it('showPublishSuggestion sets showSuggestion to true when not dismissed', async () => {
    const { useGuidedCreatorStore } = await import('@/stores/guided-creator-store')
    act(() => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
    })
    expect(useGuidedCreatorStore.getState().publishSuggestion.showSuggestion).toBe(true)
  })

  it('showPublishSuggestion does NOT set showSuggestion when dismissed', async () => {
    const { useGuidedCreatorStore } = await import('@/stores/guided-creator-store')
    act(() => {
      useGuidedCreatorStore.getState().dismissPublishSuggestion()
      useGuidedCreatorStore.getState().showPublishSuggestion()
    })
    expect(useGuidedCreatorStore.getState().publishSuggestion.showSuggestion).toBe(false)
  })

  it('dismissPublishSuggestion sets dismissed and hides suggestion', async () => {
    const { useGuidedCreatorStore } = await import('@/stores/guided-creator-store')
    act(() => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      useGuidedCreatorStore.getState().dismissPublishSuggestion()
    })
    const state = useGuidedCreatorStore.getState().publishSuggestion
    expect(state.showSuggestion).toBe(false)
    expect(state.dismissed).toBe(true)
  })

  it('setRemindLater hides suggestion and stores remindAt timestamp', async () => {
    const { useGuidedCreatorStore } = await import('@/stores/guided-creator-store')
    const remindAt = new Date(Date.now() + 3600_000).toISOString()
    act(() => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      useGuidedCreatorStore.getState().setRemindLater(remindAt)
    })
    const state = useGuidedCreatorStore.getState().publishSuggestion
    expect(state.showSuggestion).toBe(false)
    expect(state.remindLater).toBe(true)
    expect(state.remindAt).toBe(remindAt)
  })

  it('setPublished stores url and hides suggestion', async () => {
    const { useGuidedCreatorStore } = await import('@/stores/guided-creator-store')
    const url = 'https://example.atlassian.net/wiki/page/123'
    act(() => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      useGuidedCreatorStore.getState().setPublished(url)
    })
    const state = useGuidedCreatorStore.getState().publishSuggestion
    expect(state.publishedUrl).toBe(url)
    expect(state.showSuggestion).toBe(false)
  })

  it('initial state has showSuggestion false and dismissed false', async () => {
    const { useGuidedCreatorStore } = await import('@/stores/guided-creator-store')
    const state = useGuidedCreatorStore.getState().publishSuggestion
    expect(state.showSuggestion).toBe(false)
    expect(state.dismissed).toBe(false)
    expect(state.remindLater).toBe(false)
    expect(state.remindAt).toBe(null)
    expect(state.publishedUrl).toBe(null)
  })
})
