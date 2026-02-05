import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the store
const mockAddMessage = vi.fn()
const mockUpdateSection = vi.fn()
const mockSetAiThinking = vi.fn()
const mockNavigateToSection = vi.fn()
const mockCalculateCompletion = vi.fn()
const mockSetDocumentStatus = vi.fn()

const mockStoreState = {
  documentType: 'business_rule' as const,
  currentSection: 'basicInfo' as const,
  sections: {
    basicInfo: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
  },
  messages: [],
  isAiThinking: false,
  addMessage: mockAddMessage,
  updateSection: mockUpdateSection,
  setAiThinking: mockSetAiThinking,
  navigateToSection: mockNavigateToSection,
  calculateCompletion: mockCalculateCompletion,
  setDocumentStatus: mockSetDocumentStatus,
  overallCompletion: 0,
  documentId: null,
  canSaveDraft: true,
}

vi.mock('@/stores/guided-creator-store', () => ({
  useGuidedCreatorStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState)
    }
    return mockStoreState
  }),
}))

// Mock response parser
vi.mock('@/lib/ai/response-parser', () => ({
  parseAIResponse: vi.fn((raw: string) => {
    try {
      const parsed = JSON.parse(raw)
      return {
        type: parsed.type || 'question',
        section: parsed.section,
        content: parsed.content,
        display: parsed.display || raw,
        hints: parsed.hints,
        actions: parsed.actions,
        suggestedAction: parsed.suggestedAction,
      }
    } catch {
      return { type: 'question', display: raw }
    }
  }),
}))

describe('useGuidedChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState.messages = []
    mockStoreState.currentSection = 'basicInfo' as const
  })

  it('should send user message and call API', async () => {
    const responseText = JSON.stringify({
      type: 'question',
      display: 'What is the rule name?',
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(responseText),
    })

    const { useGuidedChat } = await import('@/hooks/use-guided-chat')
    const { result } = renderHook(() => useGuidedChat())

    await act(async () => {
      await result.current.sendMessage('I need a validation rule')
    })

    // Should add user message to store
    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'I need a validation rule',
      })
    )

    // Should call the API
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/guided',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('should set AI thinking state during API call', async () => {
    const responseText = JSON.stringify({
      type: 'question',
      display: 'Response here',
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(responseText),
    })

    const { useGuidedChat } = await import('@/hooks/use-guided-chat')
    const { result } = renderHook(() => useGuidedChat())

    await act(async () => {
      await result.current.sendMessage('Hello')
    })

    // Should have set thinking to true, then false
    expect(mockSetAiThinking).toHaveBeenCalledWith(true)
    expect(mockSetAiThinking).toHaveBeenCalledWith(false)
  })

  it('should add AI response message to store', async () => {
    const responseText = JSON.stringify({
      type: 'question',
      display: 'What category is this rule?',
      hints: ['Data Validation', 'Authorization'],
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(responseText),
    })

    const { useGuidedChat } = await import('@/hooks/use-guided-chat')
    const { result } = renderHook(() => useGuidedChat())

    await act(async () => {
      await result.current.sendMessage('Test')
    })

    // Should add AI message
    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'ai',
        content: 'What category is this rule?',
      })
    )
  })

  it('should update section when AI proposes a draft', async () => {
    const responseText = JSON.stringify({
      type: 'draft_proposal',
      section: 'basicInfo',
      content: { ruleId: 'BR-001', ruleName: 'Validation Rule' },
      display: 'Here is a draft.',
      actions: ['accept', 'edit', 'regenerate'],
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(responseText),
    })

    const { useGuidedChat } = await import('@/hooks/use-guided-chat')
    const { result } = renderHook(() => useGuidedChat())

    await act(async () => {
      await result.current.sendMessage('Create basic info')
    })

    // Should add AI message with draft content and section context
    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'ai',
        content: 'Here is a draft.',
        sectionContext: 'basicInfo',
        actionRequired: 'accept',
        draftContent: { ruleId: 'BR-001', ruleName: 'Validation Rule' },
      })
    )
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
    })

    const { useGuidedChat } = await import('@/hooks/use-guided-chat')
    const { result } = renderHook(() => useGuidedChat())

    await act(async () => {
      await result.current.sendMessage('Test')
    })

    // Should add error message to store
    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'system',
        content: expect.stringContaining('error'),
      })
    )

    // Should reset thinking state
    expect(mockSetAiThinking).toHaveBeenLastCalledWith(false)
  })

  it('should handle rate limit (429) errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded'),
    })

    const { useGuidedChat } = await import('@/hooks/use-guided-chat')
    const { result } = renderHook(() => useGuidedChat())

    await act(async () => {
      await result.current.sendMessage('Test')
    })

    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'system',
        content: expect.stringMatching(/rate limit|slow down|wait/i),
      })
    )
  })

  it('should support regenerate action', async () => {
    const responseText = JSON.stringify({
      type: 'draft_proposal',
      section: 'basicInfo',
      content: { ruleId: 'BR-002' },
      display: 'New draft.',
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(responseText),
    })

    const { useGuidedChat } = await import('@/hooks/use-guided-chat')
    const { result } = renderHook(() => useGuidedChat())

    await act(async () => {
      await result.current.regenerate()
    })

    // Should call API with regenerate action
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/guided',
      expect.objectContaining({
        body: expect.stringContaining('"action":"regenerate"'),
      })
    )
  })

  it('should provide saveDraft function', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'doc-123' } }),
    })

    const { useGuidedChat } = await import('@/hooks/use-guided-chat')
    const { result } = renderHook(() => useGuidedChat())

    expect(result.current.saveDraft).toBeDefined()
    expect(typeof result.current.saveDraft).toBe('function')
  })
})
