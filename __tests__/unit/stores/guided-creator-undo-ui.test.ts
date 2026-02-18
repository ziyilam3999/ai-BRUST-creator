// NOTE: No RED phase recorded — post-hoc test (written after D1 implementation). Behavior validity unverified.
/**
 * guided-creator-undo-ui.test.ts
 * D1: Tests for canUndo/canRedo reactive state fields in the store.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

import { useGuidedCreatorStore } from '@/stores/guided-creator-store'

describe('canUndo / canRedo state fields (D1)', () => {
  beforeEach(() => {
    act(() => {
      useGuidedCreatorStore.getState().reset()
    })
    localStorageMock.clear()
  })

  it('starts with canUndo=false and canRedo=false', () => {
    const { canUndo, canRedo } = useGuidedCreatorStore.getState()
    expect(canUndo).toBe(false)
    expect(canRedo).toBe(false)
  })

  it('canUndo becomes true after updateSection, false after exhausting undo stack', () => {
    const { initSession, updateSection } = useGuidedCreatorStore.getState()

    act(() => { initSession('business_rule') })

    // Push one change
    act(() => {
      updateSection('basicInfo', { content: { ruleId: 'BR-001' } })
    })
    expect(useGuidedCreatorStore.getState().canUndo).toBe(true)
    expect(useGuidedCreatorStore.getState().canRedo).toBe(false)

    // Undo the change
    act(() => {
      useGuidedCreatorStore.getState().undoLastChange()
    })
    expect(useGuidedCreatorStore.getState().canUndo).toBe(false)
    expect(useGuidedCreatorStore.getState().canRedo).toBe(true)
  })

  it('canRedo becomes false again after redoing all changes', () => {
    const { initSession, updateSection } = useGuidedCreatorStore.getState()

    act(() => { initSession('business_rule') })
    act(() => { updateSection('basicInfo', { content: { ruleId: 'BR-001' } }) })
    act(() => { useGuidedCreatorStore.getState().undoLastChange() })

    expect(useGuidedCreatorStore.getState().canRedo).toBe(true)

    act(() => { useGuidedCreatorStore.getState().redoLastChange() })

    expect(useGuidedCreatorStore.getState().canRedo).toBe(false)
    expect(useGuidedCreatorStore.getState().canUndo).toBe(true)
  })

  it('canUndo/canRedo both reset to false on initSession', () => {
    const { initSession, updateSection } = useGuidedCreatorStore.getState()

    act(() => { initSession('business_rule') })
    act(() => { updateSection('basicInfo', { content: { ruleId: 'BR-001' } }) })
    expect(useGuidedCreatorStore.getState().canUndo).toBe(true)

    act(() => { initSession('user_story') })
    expect(useGuidedCreatorStore.getState().canUndo).toBe(false)
    expect(useGuidedCreatorStore.getState().canRedo).toBe(false)
  })

  it('canUndo/canRedo both reset to false on reset()', () => {
    const { initSession, updateSection } = useGuidedCreatorStore.getState()

    act(() => { initSession('business_rule') })
    act(() => { updateSection('basicInfo', { content: { ruleId: 'BR-001' } }) })
    expect(useGuidedCreatorStore.getState().canUndo).toBe(true)

    act(() => { useGuidedCreatorStore.getState().reset() })
    expect(useGuidedCreatorStore.getState().canUndo).toBe(false)
    expect(useGuidedCreatorStore.getState().canRedo).toBe(false)
  })
})
