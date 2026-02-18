// NOTE: No RED phase recorded — post-hoc test (written after D1 implementation). Behavior validity unverified.
/**
 * document-panel.test.tsx
 * D1: Tests for DocumentPanel undo/redo toolbar — button disabled states.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Shared mock store state — will be mutated per test
const mockStoreState = {
  documentType: 'business_rule' as const,
  sections: {
    basicInfo: { status: 'draft' as const, completionPercent: 60, content: { ruleId: 'BR-001' }, lastUpdated: '2026-01-01', aiDraft: null, userAccepted: true },
    description: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    ruleStatement: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    exceptions: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    examples: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    metadata: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
  },
  currentSection: 'basicInfo' as const,
  canUndo: false,
  canRedo: false,
  undoLastChange: vi.fn(),
  redoLastChange: vi.fn(),
  isManualEditBlocked: false,
  updateSection: vi.fn(),
}

vi.mock('@/stores/guided-creator-store', () => ({
  useGuidedCreatorStore: vi.fn((selector?: (s: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') return selector(mockStoreState)
    return mockStoreState
  }),
}))

// Mock CompletionSummary to avoid its store dependency
vi.mock('@/components/guided/completion-summary', () => ({
  CompletionSummary: () => <div data-testid="completion-summary" />,
}))

// Mock SectionCard likewise
vi.mock('@/components/guided/section-card', () => ({
  SectionCard: ({ section }: { section: string }) => <div data-testid={`section-${section}`} />,
}))

import { DocumentPanel } from '@/components/guided/document-panel'

describe('DocumentPanel — Undo/Redo toolbar (D1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState.canUndo = false
    mockStoreState.canRedo = false
  })

  it('renders Undo and Redo buttons', () => {
    render(<DocumentPanel />)
    expect(screen.getByRole('button', { name: /undo last change/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /redo last change/i })).toBeTruthy()
  })

  it('Undo button is disabled when canUndo=false', () => {
    mockStoreState.canUndo = false
    render(<DocumentPanel />)
    const undoBtn = screen.getByRole('button', { name: /undo last change/i })
    expect(undoBtn).toHaveProperty('disabled', true)
  })

  it('Undo button is enabled and calls undoLastChange when canUndo=true', () => {
    mockStoreState.canUndo = true
    render(<DocumentPanel />)
    const undoBtn = screen.getByRole('button', { name: /undo last change/i }) as HTMLButtonElement
    expect(undoBtn.disabled).toBe(false)
    undoBtn.click()
    expect(mockStoreState.undoLastChange).toHaveBeenCalledTimes(1)
  })

  it('Redo button is disabled when canRedo=false', () => {
    mockStoreState.canRedo = false
    render(<DocumentPanel />)
    const redoBtn = screen.getByRole('button', { name: /redo last change/i })
    expect(redoBtn).toHaveProperty('disabled', true)
  })

  it('Redo button is enabled and calls redoLastChange when canRedo=true', () => {
    mockStoreState.canRedo = true
    render(<DocumentPanel />)
    const redoBtn = screen.getByRole('button', { name: /redo last change/i }) as HTMLButtonElement
    expect(redoBtn.disabled).toBe(false)
    redoBtn.click()
    expect(mockStoreState.redoLastChange).toHaveBeenCalledTimes(1)
  })
})
