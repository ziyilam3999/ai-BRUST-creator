/**
 * undo-stack.ts
 * Generic pointer-based undo/redo manager.
 * Plan §C1: max 20 entries, push/undo/redo/canUndo/canRedo/clear.
 */

export interface UndoEntry<T> {
  before: T
  after: T
}

export const UNDO_CONFIG = {
  maxEntries: 20,
} as const

/**
 * createUndoManager<T>()
 * Returns a stateful undo/redo manager for any serialisable state shape T.
 * Each "push" records the transition from `before` → `after` so that:
 *   - undo() returns `before` and moves the pointer back
 *   - redo() returns `after` and moves the pointer forward
 */
export function createUndoManager<T>() {
  // `entries[0]` is the oldest, entries[pointer] is the current head
  const entries: UndoEntry<T>[] = []
  let pointer = -1 // points to the last pushed entry

  function canUndo(): boolean {
    return pointer >= 0
  }

  function canRedo(): boolean {
    return pointer < entries.length - 1
  }

  /**
   * Record a state transition from `before` to `after`.
   * Truncates the redo stack (entries after current pointer).
   * Trims the oldest entry when the stack exceeds maxEntries.
   */
  function push(before: T, after: T): void {
    // Drop anything ahead of current pointer (cleared redo stack)
    entries.splice(pointer + 1)

    entries.push({ before, after })
    pointer = entries.length - 1

    // Enforce max size — trim from the front
    if (entries.length > UNDO_CONFIG.maxEntries) {
      const excess = entries.length - UNDO_CONFIG.maxEntries
      entries.splice(0, excess)
      pointer = entries.length - 1
    }
  }

  /** Move pointer back and return the `before` state, or null if at bottom. */
  function undo(): T | null {
    if (!canUndo()) return null
    const entry = entries[pointer]
    pointer -= 1
    return entry.before
  }

  /** Move pointer forward and return the `after` state, or null if at top. */
  function redo(): T | null {
    if (!canRedo()) return null
    pointer += 1
    return entries[pointer].after
  }

  /** Reset the manager to empty state. */
  function clear(): void {
    entries.splice(0)
    pointer = -1
  }

  return { push, undo, redo, canUndo, canRedo, clear }
}

export type UndoManager<T> = ReturnType<typeof createUndoManager<T>>
