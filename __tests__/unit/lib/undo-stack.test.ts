/**
 * C5 (partial): undo-stack.ts unit tests — TDD RED phase
 */
import { describe, it, expect } from 'vitest'

import {
  createUndoManager,
  UNDO_CONFIG,
  type UndoEntry,
} from '@/lib/guided/undo-stack'

type TestState = { value: string }

describe('undo-stack', () => {
  // --- CONFIG ---

  it('exports UNDO_CONFIG with maxEntries = 20', () => {
    expect(UNDO_CONFIG.maxEntries).toBe(20)
  })

  // --- createUndoManager ---

  it('createUndoManager returns push, undo, redo, canUndo, canRedo, clear', () => {
    const mgr = createUndoManager<TestState>()
    expect(typeof mgr.push).toBe('function')
    expect(typeof mgr.undo).toBe('function')
    expect(typeof mgr.redo).toBe('function')
    expect(typeof mgr.canUndo).toBe('function')
    expect(typeof mgr.canRedo).toBe('function')
    expect(typeof mgr.clear).toBe('function')
  })

  it('canUndo returns false on empty stack', () => {
    const mgr = createUndoManager<TestState>()
    expect(mgr.canUndo()).toBe(false)
  })

  it('canRedo returns false on empty stack', () => {
    const mgr = createUndoManager<TestState>()
    expect(mgr.canRedo()).toBe(false)
  })

  it('push adds entries and canUndo returns true', () => {
    const mgr = createUndoManager<TestState>()
    mgr.push({ value: 'a' }, { value: 'b' })
    expect(mgr.canUndo()).toBe(true)
  })

  it('undo returns the previous state', () => {
    const mgr = createUndoManager<TestState>()
    mgr.push({ value: 'a' }, { value: 'b' })
    const prev = mgr.undo()
    expect(prev).toEqual({ value: 'a' })
  })

  it('undo returns null when there is nothing to undo', () => {
    const mgr = createUndoManager<TestState>()
    expect(mgr.undo()).toBeNull()
  })

  it('after undo, canRedo returns true', () => {
    const mgr = createUndoManager<TestState>()
    mgr.push({ value: 'a' }, { value: 'b' })
    mgr.undo()
    expect(mgr.canRedo()).toBe(true)
  })

  it('redo returns the state that was undone', () => {
    const mgr = createUndoManager<TestState>()
    mgr.push({ value: 'a' }, { value: 'b' })
    mgr.undo()
    const next = mgr.redo()
    expect(next).toEqual({ value: 'b' })
  })

  it('redo returns null when there is nothing to redo', () => {
    const mgr = createUndoManager<TestState>()
    expect(mgr.redo()).toBeNull()
  })

  it('push after undo clears the redo stack', () => {
    const mgr = createUndoManager<TestState>()
    mgr.push({ value: 'a' }, { value: 'b' })
    mgr.undo()
    // push new state — redo should now be empty
    mgr.push({ value: 'b' }, { value: 'c' })
    expect(mgr.canRedo()).toBe(false)
  })

  it('truncates to maxEntries when stack exceeds limit', () => {
    const mgr = createUndoManager<TestState>()
    // Push 25 entries (> 20)
    for (let i = 0; i < 25; i++) {
      mgr.push({ value: `s${i}` }, { value: `s${i + 1}` })
    }
    // After 20 undos we should hit the limit (canUndo returns false)
    for (let i = 0; i < 20; i++) {
      mgr.undo()
    }
    expect(mgr.canUndo()).toBe(false)
  })

  it('clear resets stack so canUndo and canRedo return false', () => {
    const mgr = createUndoManager<TestState>()
    mgr.push({ value: 'a' }, { value: 'b' })
    mgr.clear()
    expect(mgr.canUndo()).toBe(false)
    expect(mgr.canRedo()).toBe(false)
  })
})
