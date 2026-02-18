/**
 * auto-save-server.test.ts
 * D3: Tests for syncToServer() and checkForUnsavedDraftFromServer().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true })

import {
  syncToServer,
  checkForUnsavedDraftFromServer,
  AUTO_SAVE_CONFIG,
} from '@/lib/guided/auto-save'

describe('syncToServer (D3)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts state to /api/documents/draft and resolves without error on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draftId: 'draft-001', updatedAt: '2026-01-01T00:00:00Z' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const state = { sections: { basicInfo: { status: 'draft' } }, messages: [] }
    await syncToServer(state, 'business_rule')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/documents/draft',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )

    // Should NOT write a sync error to localStorage on success
    expect(localStorageMock.getItem(AUTO_SAVE_CONFIG.syncErrorKey)).toBeNull()
  })

  it('logs and records error to localStorage when fetch fails (network error)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))

    const state = { sections: {}, messages: [] }
    await syncToServer(state, 'business_rule')

    expect(consoleError).toHaveBeenCalledWith(
      '[auto-save] syncToServer error:',
      expect.stringContaining('Network failure')
    )

    const errorEntry = localStorageMock.getItem(AUTO_SAVE_CONFIG.syncErrorKey)
    expect(errorEntry).not.toBeNull()
    const parsed = JSON.parse(errorEntry!)
    expect(parsed.message).toContain('Network failure')
    expect(typeof parsed.at).toBe('number')
  })

  it('logs and records error to localStorage when server returns non-ok status', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal Server Error' } }),
    }))

    const state = { sections: {}, messages: [] }
    await syncToServer(state, 'business_rule')

    expect(consoleError).toHaveBeenCalled()
    const errorEntry = localStorageMock.getItem(AUTO_SAVE_CONFIG.syncErrorKey)
    expect(errorEntry).not.toBeNull()
  })
})

describe('checkForUnsavedDraftFromServer (D3)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns server draft when GET /api/documents/draft succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        draftId: 'draft-001',
        updatedAt: '2026-01-01T12:00:00Z',
        content: {
          sections: { basicInfo: { status: 'draft', content: { ruleId: 'BR-001' } } },
          conversationHistory: [{ role: 'user', content: 'hello' }],
        },
      }),
    }))

    const result = await checkForUnsavedDraftFromServer()

    expect(result).not.toBeNull()
    expect(result!.savedAt).toBe(new Date('2026-01-01T12:00:00Z').getTime())
    expect((result!.state as Record<string, unknown>).sections).toBeDefined()
  })

  it('falls back to localStorage when server returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'No draft' } }),
    }))

    // Pre-seed localStorage with a draft
    const localEntry = { state: { sections: {}, messages: [] }, savedAt: Date.now() }
    localStorageMock.setItem(AUTO_SAVE_CONFIG.storageKey, JSON.stringify(localEntry))

    const result = await checkForUnsavedDraftFromServer()

    expect(result).not.toBeNull()
    expect(result!.savedAt).toBe(localEntry.savedAt)
  })

  it('falls back to localStorage when fetch throws (network error / timeout)', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('AbortError')))

    const localEntry = { state: { sections: { basicInfo: {} }, messages: [] }, savedAt: Date.now() }
    localStorageMock.setItem(AUTO_SAVE_CONFIG.storageKey, JSON.stringify(localEntry))

    const result = await checkForUnsavedDraftFromServer()

    expect(result).not.toBeNull()
    expect(consoleWarn).toHaveBeenCalledWith(
      '[auto-save] checkForUnsavedDraftFromServer falling back to localStorage:',
      expect.any(String)
    )
  })

  it('returns null when server returns 404 and localStorage is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }))

    const result = await checkForUnsavedDraftFromServer()
    expect(result).toBeNull()
  })
})
