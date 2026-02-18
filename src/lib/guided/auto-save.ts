/**
 * auto-save.ts
 * Debounced localStorage auto-save for guided creator sessions.
 * Design decision DS-1: localStorage primary (single-device, DB save is explicit).
 * D3: syncToServer() adds an opportunistic server-side upsert for cross-device resilience.
 */

export type AutoSaveEntry = {
  state: Record<string, unknown>
  savedAt: number
}

export const AUTO_SAVE_CONFIG = {
  /** Interval between periodic saves in ms */
  intervalMs: 30_000,
  /** Debounce delay for rapid state changes in ms */
  debounceMs: 2_000,
  /** Time-to-live: drafts older than this are treated as expired (7 days) */
  ttlMs: 7 * 24 * 60 * 60 * 1_000,
  /** localStorage key */
  storageKey: 'guided-creator-autosave',
  /** localStorage key for last sync error */
  syncErrorKey: 'guided-creator-autosave-sync-error',
  /** Timeout for server sync fetch in ms */
  syncTimeoutMs: 5_000,
} as const

// ── Internal state ──────────────────────────────────────────────────────────

let intervalId: ReturnType<typeof setInterval> | null = null
let debounceId: ReturnType<typeof setTimeout> | null = null

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the periodic auto-save loop.
 * @param getState - Callback that returns the current state snapshot to persist.
 */
export function startAutoSave(getState: () => Record<string, unknown>): void {
  stopAutoSave() // cancel any existing timer

  intervalId = setInterval(() => {
    _persist(getState())
  }, AUTO_SAVE_CONFIG.intervalMs)
}

/**
 * Cancel the periodic auto-save loop and any pending debounced save.
 */
export function stopAutoSave(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (debounceId !== null) {
    clearTimeout(debounceId)
    debounceId = null
  }
}

/**
 * Trigger a debounced save immediately (e.g. on user interaction).
 * Resets the debounce window on each call.
 */
export function debounceSave(getState: () => Record<string, unknown>): void {
  if (debounceId !== null) clearTimeout(debounceId)
  debounceId = setTimeout(() => {
    _persist(getState())
    debounceId = null
  }, AUTO_SAVE_CONFIG.debounceMs)
}

/**
 * Check whether an unexpired auto-saved draft exists in localStorage.
 * Returns the entry (with `state` and `savedAt`) or `null`.
 * Synchronous — use as fallback when offline or server is unavailable.
 */
export function checkForUnsavedDraft(): AutoSaveEntry | null {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_CONFIG.storageKey)
    if (!raw) return null

    const entry: AutoSaveEntry = JSON.parse(raw)
    if (!entry || typeof entry.savedAt !== 'number') return null

    // Expire stale drafts
    if (Date.now() - entry.savedAt > AUTO_SAVE_CONFIG.ttlMs) {
      localStorage.removeItem(AUTO_SAVE_CONFIG.storageKey)
      return null
    }

    return entry
  } catch {
    return null
  }
}

/**
 * Remove the auto-saved draft from localStorage (e.g. after explicit save or dismiss).
 */
export function clearDraft(): void {
  localStorage.removeItem(AUTO_SAVE_CONFIG.storageKey)
}

/**
 * D3: Server-first draft check — tries GET /api/documents/draft first,
 * falls back to localStorage if the request fails or times out.
 * Async — intended for use in useEffect on mount.
 *
 * Returns AutoSaveEntry with the draft state, or null if none exists.
 */
export async function checkForUnsavedDraftFromServer(): Promise<AutoSaveEntry | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AUTO_SAVE_CONFIG.syncTimeoutMs)

  try {
    const response = await fetch('/api/documents/draft', {
      method: 'GET',
      signal: controller.signal,
    })

    if (response.status === 404) {
      return checkForUnsavedDraft()
    }

    if (!response.ok) {
      throw new Error(`Server draft fetch failed: ${response.status}`)
    }

    const data = await response.json() as {
      draftId: string
      updatedAt: string
      content?: { sections?: Record<string, unknown>; conversationHistory?: unknown[] }
    }

    if (!data.content) {
      return checkForUnsavedDraft()
    }

    return {
      state: {
        sections: data.content.sections ?? {},
        messages: data.content.conversationHistory ?? [],
      } as Record<string, unknown>,
      savedAt: new Date(data.updatedAt).getTime(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[auto-save] checkForUnsavedDraftFromServer falling back to localStorage:', message)
    return checkForUnsavedDraft()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * D3: Opportunistically sync the current state to the server draft endpoint.
 * Fire-and-forget from the caller's perspective but errors are logged, not swallowed.
 * Uses AbortController with a 5s timeout for reliable offline detection.
 *
 * @param state - The current guided creator state snapshot
 * @param documentType - 'business_rule' | 'user_story'
 */
export async function syncToServer(
  state: Record<string, unknown>,
  documentType: 'business_rule' | 'user_story' = 'business_rule'
): Promise<void> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AUTO_SAVE_CONFIG.syncTimeoutMs)

  try {
    const response = await fetch('/api/documents/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sections: (state.sections as Record<string, unknown>) ?? {},
        conversationHistory: (state.messages as unknown[]) ?? [],
        documentType,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`Draft sync failed: ${response.status} ${body?.error?.message ?? ''}`)
    }

    // Clear any previous sync error
    try { localStorage.removeItem(AUTO_SAVE_CONFIG.syncErrorKey) } catch { /* ignore */ }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[auto-save] syncToServer error:', message)
    try {
      localStorage.setItem(
        AUTO_SAVE_CONFIG.syncErrorKey,
        JSON.stringify({ message, at: Date.now() })
      )
    } catch { /* quota exceeded — ignore */ }
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _persist(state: Record<string, unknown>): void {
  const entry: AutoSaveEntry = { state, savedAt: Date.now() }
  try {
    localStorage.setItem(AUTO_SAVE_CONFIG.storageKey, JSON.stringify(entry))
  } catch {
    // Swallow quota-exceeded and other storage errors silently
  }
}
