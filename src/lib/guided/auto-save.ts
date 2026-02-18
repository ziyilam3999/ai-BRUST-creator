/**
 * auto-save.ts
 * Debounced localStorage auto-save for guided creator sessions.
 * Design decision DS-1: localStorage (single-device, DB save is explicit).
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

// ── Private helpers ──────────────────────────────────────────────────────────

function _persist(state: Record<string, unknown>): void {
  const entry: AutoSaveEntry = { state, savedAt: Date.now() }
  try {
    localStorage.setItem(AUTO_SAVE_CONFIG.storageKey, JSON.stringify(entry))
  } catch {
    // Swallow quota-exceeded and other storage errors silently
  }
}
