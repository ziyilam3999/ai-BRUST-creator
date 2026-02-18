import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the guided creator store
const mockAcceptDraft = vi.fn()
const mockEditSection = vi.fn()
const mockNavigateToSection = vi.fn()

const mockStoreState = {
  documentType: 'business_rule' as const,
  documentId: null,
  documentStatus: 'draft' as const,
  sections: {
    basicInfo: { status: 'draft' as const, completionPercent: 60, content: { ruleId: 'BR-001', ruleName: 'Test Rule' }, lastUpdated: '2026-01-01', aiDraft: null, userAccepted: true },
    description: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    ruleStatement: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    exceptions: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    examples: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    metadata: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
  },
  currentSection: 'basicInfo' as const,
  messages: [] as Array<{
    id: string
    role: 'ai' | 'user' | 'system'
    content: string
    timestamp: string
    sectionContext?: string
    actionRequired?: string
    draftContent?: Record<string, unknown>
  }>,
  conversationSummary: null,
  isAiThinking: false,
  isManualEditBlocked: false,
  overallCompletion: 25,
  canSaveDraft: true,
  isReadyForReview: false,
  lastSessionSummary: null,
  sessionStartedAt: '2026-01-01T00:00:00Z',
  publishSuggestion: {
    showSuggestion: false,
    dismissed: false,
    remindLater: false,
    remindAt: null,
    publishedUrl: null,
  },
  initSession: vi.fn(),
  resumeSession: vi.fn(),
  addMessage: vi.fn(),
  updateSection: vi.fn(),
  acceptDraft: mockAcceptDraft,
  undoLastChange: vi.fn(),
  redoLastChange: vi.fn(),
  editSection: mockEditSection,
  navigateToSection: mockNavigateToSection,
  calculateCompletion: vi.fn(),
  summarizeConversation: vi.fn(),
  setDocumentStatus: vi.fn(),
  setAiThinking: vi.fn(),
  reset: vi.fn(),
  showPublishSuggestion: vi.fn(),
  dismissPublishSuggestion: vi.fn(),
  setRemindLater: vi.fn(),
  setPublished: vi.fn(),
  restoreFromAutoSave: vi.fn(),
  lastAiError: null,
  setAiError: vi.fn(),
  clearAiError: vi.fn(),
  canUndo: false,
  canRedo: false,
}

vi.mock('@/stores/guided-creator-store', () => ({
  useGuidedCreatorStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState)
    }
    return mockStoreState
  }),
}))

// Mock useGuidedChat
const mockSendMessage = vi.fn()
const mockRegenerate = vi.fn()
const mockSaveDraft = vi.fn()

vi.mock('@/hooks/use-guided-chat', () => ({
  useGuidedChat: vi.fn(() => ({
    sendMessage: mockSendMessage,
    regenerate: mockRegenerate,
    saveDraft: mockSaveDraft,
  })),
}))

vi.mock('@/lib/guided/advice-engine', () => ({
  getCompletionAdvice: vi.fn(() => ({
    level: 'minimal',
    message: 'Keep going!',
    canSave: false,
    suggestedAction: 'Continue',
  })),
}))

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

describe('Phase 4: ActionBar Wiring & Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset messages to empty
    mockStoreState.messages = []
    mockStoreState.currentSection = 'basicInfo' as const
    mockStoreState.isAiThinking = false
  })

  describe('ConversationPanel - ActionBar Integration', () => {
    it('should show ActionBar when last AI message has actionRequired', async () => {
      mockStoreState.messages = [
        { id: '1', role: 'user' as const, content: 'Create basic info', timestamp: '2026-01-01T00:00:00Z' },
        {
          id: '2',
          role: 'ai' as const,
          content: 'Here is a draft for basic info.',
          timestamp: '2026-01-01T00:01:00Z',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001', ruleName: 'Test' },
        },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      // ActionBar should be visible with Accept/Edit buttons
      expect(screen.getByText('Accept')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    it('should NOT show ActionBar when last message is from user', async () => {
      mockStoreState.messages = [
        {
          id: '1',
          role: 'ai' as const,
          content: 'Here is a draft.',
          timestamp: '2026-01-01T00:00:00Z',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001' },
        },
        { id: '2', role: 'user' as const, content: 'Let me change something', timestamp: '2026-01-01T00:01:00Z' },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      expect(screen.queryByText('Accept')).not.toBeInTheDocument()
    })

    it('should NOT show ActionBar when last AI message has no actionRequired', async () => {
      mockStoreState.messages = [
        { id: '1', role: 'ai' as const, content: 'What category is this rule?', timestamp: '2026-01-01T00:00:00Z' },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      expect(screen.queryByText('Accept')).not.toBeInTheDocument()
    })

    it('should call regenerate from useGuidedChat when Regenerate clicked', async () => {
      mockStoreState.messages = [
        {
          id: '1',
          role: 'ai' as const,
          content: 'Here is a draft.',
          timestamp: '2026-01-01T00:00:00Z',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001' },
        },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      fireEvent.click(screen.getByLabelText('Regenerate'))
      expect(mockRegenerate).toHaveBeenCalled()
    })

    it('should call acceptDraft and navigate to next section when Accept clicked', async () => {
      mockStoreState.messages = [
        {
          id: '1',
          role: 'ai' as const,
          content: 'Here is a draft.',
          timestamp: '2026-01-01T00:00:00Z',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001' },
        },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      fireEvent.click(screen.getByText('Accept'))
      expect(mockAcceptDraft).toHaveBeenCalledWith('basicInfo')
      // Should auto-advance to next section (description for BR)
      expect(mockNavigateToSection).toHaveBeenCalledWith('description')
    })

    it('should call editSection when Edit clicked in ActionBar', async () => {
      mockStoreState.messages = [
        {
          id: '1',
          role: 'ai' as const,
          content: 'Here is a draft.',
          timestamp: '2026-01-01T00:00:00Z',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001' },
        },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      fireEvent.click(screen.getByText('Edit'))
      expect(mockEditSection).toHaveBeenCalledWith('basicInfo')
    })

    it('should navigate to next section when Skip clicked', async () => {
      mockStoreState.messages = [
        {
          id: '1',
          role: 'ai' as const,
          content: 'Here is a draft.',
          timestamp: '2026-01-01T00:00:00Z',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001' },
        },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      fireEvent.click(screen.getByLabelText('Skip section'))
      expect(mockNavigateToSection).toHaveBeenCalledWith('description')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should send message on Ctrl+Enter', async () => {
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      const textarea = screen.getByPlaceholderText('Type your response...')
      fireEvent.change(textarea, { target: { value: 'Test message' } })
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

      expect(mockSendMessage).toHaveBeenCalledWith('Test message')
    })

    it('should send message on Meta+Enter (Mac)', async () => {
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      const textarea = screen.getByPlaceholderText('Type your response...')
      fireEvent.change(textarea, { target: { value: 'Mac test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

      expect(mockSendMessage).toHaveBeenCalledWith('Mac test')
    })

    it('should still send on Enter without Shift', async () => {
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      const textarea = screen.getByPlaceholderText('Type your response...')
      fireEvent.change(textarea, { target: { value: 'Enter test' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(mockSendMessage).toHaveBeenCalledWith('Enter test')
    })

    it('should NOT send on Shift+Enter (newline)', async () => {
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      const textarea = screen.getByPlaceholderText('Type your response...')
      fireEvent.change(textarea, { target: { value: 'Multiline' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('Auto-Advance Helper', () => {
    it('should advance from basicInfo to description for BR', async () => {
      mockStoreState.messages = [
        {
          id: '1',
          role: 'ai' as const,
          content: 'Draft for basicInfo.',
          timestamp: '2026-01-01T00:00:00Z',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001' },
        },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      fireEvent.click(screen.getByText('Accept'))
      expect(mockNavigateToSection).toHaveBeenCalledWith('description')
    })

    it('should advance from last BR section (metadata) without error', async () => {
      mockStoreState.currentSection = 'metadata' as const
      mockStoreState.messages = [
        {
          id: '1',
          role: 'ai' as const,
          content: 'Draft for metadata.',
          timestamp: '2026-01-01T00:00:00Z',
          sectionContext: 'metadata',
          actionRequired: 'accept',
          draftContent: { owner: 'Team A' },
        },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      fireEvent.click(screen.getByText('Accept'))
      expect(mockAcceptDraft).toHaveBeenCalledWith('metadata')
      // Should NOT navigate (no next section) — or stay on same
    })

    it('should advance through US sections correctly', async () => {
      mockStoreState.documentType = 'user_story' as const
      mockStoreState.currentSection = 'basicInfo' as const
      mockStoreState.messages = [
        {
          id: '1',
          role: 'ai' as const,
          content: 'Draft for US basicInfo.',
          timestamp: '2026-01-01T00:00:00Z',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { title: 'My Story' },
        },
      ]

      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      fireEvent.click(screen.getByText('Accept'))
      // US next section after basicInfo is storyStatement
      expect(mockNavigateToSection).toHaveBeenCalledWith('storyStatement')

      // Reset
      mockStoreState.documentType = 'business_rule' as const
    })
  })
})
