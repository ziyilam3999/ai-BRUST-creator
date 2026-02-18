/**
 * B6 (partial): auto-save.ts unit tests — TDD RED phase
 * Tests are written before implementation to define the contract.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Module under test (does not yet exist) ---
// import { startAutoSave, stopAutoSave, checkForUnsavedDraft, clearDraft, AUTO_SAVE_CONFIG } from '@/lib/guided/auto-save'

// Stub the localStorage API
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// --- Import after mocks so module picks up localStorage ---
// (Will fail until auto-save.ts is created — that's intentional RED)
import {
  startAutoSave,
  stopAutoSave,
  checkForUnsavedDraft,
  clearDraft,
  AUTO_SAVE_CONFIG,
} from '@/lib/guided/auto-save'

describe('auto-save', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    stopAutoSave()
    vi.useRealTimers()
  })

  // --- CONFIG ---

  it('exports AUTO_SAVE_CONFIG with expected defaults', () => {
    expect(AUTO_SAVE_CONFIG.intervalMs).toBe(30_000)
    expect(AUTO_SAVE_CONFIG.debounceMs).toBe(2_000)
    expect(AUTO_SAVE_CONFIG.ttlMs).toBe(7 * 24 * 60 * 60 * 1_000) // 7 days
    expect(AUTO_SAVE_CONFIG.storageKey).toBe('guided-creator-autosave')
  })

  // --- startAutoSave / stopAutoSave ---

  it('startAutoSave saves the state to localStorage on interval', () => {
    const state = { documentType: 'business_rule', sections: {} }
    startAutoSave(() => state)
    expect(localStorageMock.getItem(AUTO_SAVE_CONFIG.storageKey)).toBeNull()

    vi.advanceTimersByTime(AUTO_SAVE_CONFIG.intervalMs)

    const saved = localStorageMock.getItem(AUTO_SAVE_CONFIG.storageKey)
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(parsed.state.documentType).toBe('business_rule')
  })

  it('startAutoSave records savedAt timestamp', () => {
    const state = { documentType: 'business_rule', sections: {} }
    startAutoSave(() => state)
    vi.advanceTimersByTime(AUTO_SAVE_CONFIG.intervalMs)

    const saved = localStorageMock.getItem(AUTO_SAVE_CONFIG.storageKey)
    const parsed = JSON.parse(saved!)
    expect(typeof parsed.savedAt).toBe('number')
    expect(parsed.savedAt).toBeGreaterThan(0)
  })

  it('stopAutoSave cancels the interval so no further saves happen', () => {
    const state = { documentType: 'business_rule', sections: {} }
    startAutoSave(() => state)
    stopAutoSave()

    vi.advanceTimersByTime(AUTO_SAVE_CONFIG.intervalMs * 3)
    expect(localStorageMock.getItem(AUTO_SAVE_CONFIG.storageKey)).toBeNull()
  })

  // --- checkForUnsavedDraft ---

  it('checkForUnsavedDraft returns null when no draft exists', () => {
    const result = checkForUnsavedDraft()
    expect(result).toBeNull()
  })

  it('checkForUnsavedDraft returns the draft when a recent one exists', () => {
    const state = { documentType: 'business_rule', sections: { basicInfo: {} } }
    const entry = { state, savedAt: Date.now() }
    localStorageMock.setItem(AUTO_SAVE_CONFIG.storageKey, JSON.stringify(entry))

    const result = checkForUnsavedDraft()
    expect(result).not.toBeNull()
    expect(result!.state.documentType).toBe('business_rule')
  })

  it('checkForUnsavedDraft returns null for an expired draft (beyond TTL)', () => {
    const state = { documentType: 'business_rule', sections: {} }
    const expiredAt = Date.now() - AUTO_SAVE_CONFIG.ttlMs - 1_000
    localStorageMock.setItem(AUTO_SAVE_CONFIG.storageKey, JSON.stringify({ state, savedAt: expiredAt }))

    const result = checkForUnsavedDraft()
    expect(result).toBeNull()
  })

  it('checkForUnsavedDraft returns null for malformed JSON', () => {
    localStorageMock.setItem(AUTO_SAVE_CONFIG.storageKey, 'not-json{{{')
    const result = checkForUnsavedDraft()
    expect(result).toBeNull()
  })

  // --- clearDraft ---

  it('clearDraft removes the stored entry', () => {
    const entry = { state: {}, savedAt: Date.now() }
    localStorageMock.setItem(AUTO_SAVE_CONFIG.storageKey, JSON.stringify(entry))

    clearDraft()
    expect(localStorageMock.getItem(AUTO_SAVE_CONFIG.storageKey)).toBeNull()
  })
})
