import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

// Mock the guided creator store
const mockStoreState = {
  documentType: 'business_rule' as const,
  documentId: null,
  documentStatus: 'draft' as const,
  sections: {
    basicInfo: { status: 'draft' as const, completionPercent: 60, content: { ruleId: 'BR-001', ruleName: 'Test Rule' }, lastUpdated: '2026-01-01', aiDraft: null, userAccepted: true },
    description: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    ruleStatement: { status: 'in_progress' as const, completionPercent: 40, content: { if: 'User submits form' }, lastUpdated: '2026-01-01', aiDraft: null, userAccepted: false },
    exceptions: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    examples: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
    metadata: { status: 'not_started' as const, completionPercent: 0, content: {}, lastUpdated: null, aiDraft: null, userAccepted: false },
  },
  currentSection: 'basicInfo' as const,
  messages: [
    { id: '1', role: 'ai' as const, content: 'Welcome! Let me help you create a Business Rule.', timestamp: '2026-01-01T00:00:00Z' },
    { id: '2', role: 'user' as const, content: 'I need a validation rule.', timestamp: '2026-01-01T00:01:00Z' },
    { id: '3', role: 'ai' as const, content: 'Here is a draft.', timestamp: '2026-01-01T00:02:00Z', sectionContext: 'basicInfo' as const, actionRequired: 'accept' as const, draftContent: { ruleId: 'BR-001' } },
  ],
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
  acceptDraft: vi.fn(),
  undoLastChange: vi.fn(),
  editSection: vi.fn(),
  navigateToSection: vi.fn(),
  calculateCompletion: vi.fn(),
  summarizeConversation: vi.fn(),
  setDocumentStatus: vi.fn(),
  setAiThinking: vi.fn(),
  reset: vi.fn(),
  showPublishSuggestion: vi.fn(),
  dismissPublishSuggestion: vi.fn(),
  setRemindLater: vi.fn(),
  setPublished: vi.fn(),
}

vi.mock('@/stores/guided-creator-store', () => ({
  useGuidedCreatorStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState)
    }
    return mockStoreState
  }),
}))

vi.mock('@/lib/guided/advice-engine', () => ({
  getCompletionAdvice: vi.fn((percent: number) => {
    if (percent < 40) return { level: 'minimal', message: 'Keep going!', canSave: false, suggestedAction: 'Continue' }
    if (percent < 60) return { level: 'draft', message: 'Basic draft ready.', canSave: true, suggestedAction: 'Save as draft' }
    if (percent < 80) return { level: 'good', message: 'Good progress!', canSave: true, suggestedAction: 'Review and submit' }
    return { level: 'comprehensive', message: 'Excellent!', canSave: true, suggestedAction: 'Submit' }
  }),
}))

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

describe('Guided UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GuidedCreatorContainer', () => {
    it('should render header with document type', async () => {
      const { GuidedCreatorContainer } = await import('@/components/guided/guided-creator-container')
      render(<GuidedCreatorContainer documentType="business_rule" />)

      expect(screen.getByRole('heading', { name: /Business Rule/i })).toBeInTheDocument()
    })

    it('should render header for user story type', async () => {
      const { GuidedCreatorContainer } = await import('@/components/guided/guided-creator-container')
      render(<GuidedCreatorContainer documentType="user_story" />)

      expect(screen.getByRole('heading', { name: /User Story/i })).toBeInTheDocument()
    })

    it('should show overall completion percentage', async () => {
      const { GuidedCreatorContainer } = await import('@/components/guided/guided-creator-container')
      render(<GuidedCreatorContainer documentType="business_rule" />)

      expect(screen.getByText(/25% Complete/i)).toBeInTheDocument()
    })

    it('should have Save Draft button', async () => {
      const { GuidedCreatorContainer } = await import('@/components/guided/guided-creator-container')
      render(<GuidedCreatorContainer documentType="business_rule" />)

      expect(screen.getByText('Save Draft')).toBeInTheDocument()
    })

    it('should have close button', async () => {
      const { GuidedCreatorContainer } = await import('@/components/guided/guided-creator-container')
      render(<GuidedCreatorContainer documentType="business_rule" />)

      const closeButton = screen.getByLabelText('Close')
      expect(closeButton).toBeInTheDocument()
    })

    it('should call initSession on mount', async () => {
      const { GuidedCreatorContainer } = await import('@/components/guided/guided-creator-container')
      render(<GuidedCreatorContainer documentType="business_rule" />)

      expect(mockStoreState.initSession).toHaveBeenCalledWith('business_rule')
    })
  })

  describe('MessageBubble', () => {
    it('should render AI message with assistant styling', async () => {
      const { MessageBubble } = await import('@/components/guided/message-bubble')
      const message = { id: '1', role: 'ai' as const, content: 'Hello from AI', timestamp: '2026-01-01T00:00:00Z' }
      render(<MessageBubble message={message} />)

      expect(screen.getByText('Hello from AI')).toBeInTheDocument()
      expect(screen.getByText('Assistant')).toBeInTheDocument()
    })

    it('should render user message with user styling', async () => {
      const { MessageBubble } = await import('@/components/guided/message-bubble')
      const message = { id: '2', role: 'user' as const, content: 'Hello from user', timestamp: '2026-01-01T00:00:00Z' }
      render(<MessageBubble message={message} />)

      expect(screen.getByText('Hello from user')).toBeInTheDocument()
      expect(screen.getByText('You')).toBeInTheDocument()
    })
  })

  describe('ConversationPanel', () => {
    it('should render messages from store', async () => {
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      expect(screen.getByText('Welcome! Let me help you create a Business Rule.')).toBeInTheDocument()
      expect(screen.getByText('I need a validation rule.')).toBeInTheDocument()
    })

    it('should have text input area', async () => {
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      expect(screen.getByPlaceholderText('Type your response...')).toBeInTheDocument()
    })

    it('should have send button', async () => {
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      expect(screen.getByLabelText('Send message')).toBeInTheDocument()
    })

    it('should show thinking indicator when AI is processing', async () => {
      mockStoreState.isAiThinking = true
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      expect(screen.getByText(/AI is thinking/i)).toBeInTheDocument()
      mockStoreState.isAiThinking = false
    })

    it('should disable send when input is empty', async () => {
      const { ConversationPanel } = await import('@/components/guided/conversation-panel')
      render(<ConversationPanel />)

      const sendButton = screen.getByLabelText('Send message')
      expect(sendButton).toBeDisabled()
    })
  })

  describe('ActionBar', () => {
    it('should render Accept button', async () => {
      const { ActionBar } = await import('@/components/guided/action-bar')
      render(<ActionBar section="basicInfo" />)

      expect(screen.getByText('Accept')).toBeInTheDocument()
    })

    it('should render Edit button', async () => {
      const { ActionBar } = await import('@/components/guided/action-bar')
      render(<ActionBar section="basicInfo" />)

      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    it('should call acceptDraft when Accept clicked', async () => {
      const { ActionBar } = await import('@/components/guided/action-bar')
      render(<ActionBar section="basicInfo" />)

      fireEvent.click(screen.getByText('Accept'))
      expect(mockStoreState.acceptDraft).toHaveBeenCalledWith('basicInfo')
    })

    it('should call editSection when Edit clicked', async () => {
      const { ActionBar } = await import('@/components/guided/action-bar')
      render(<ActionBar section="ruleStatement" />)

      fireEvent.click(screen.getByText('Edit'))
      expect(mockStoreState.editSection).toHaveBeenCalledWith('ruleStatement')
    })

    it('should have Regenerate button', async () => {
      const { ActionBar } = await import('@/components/guided/action-bar')
      render(<ActionBar section="basicInfo" />)

      expect(screen.getByLabelText('Regenerate')).toBeInTheDocument()
    })

    it('should have Skip button', async () => {
      const { ActionBar } = await import('@/components/guided/action-bar')
      render(<ActionBar section="basicInfo" />)

      expect(screen.getByLabelText('Skip section')).toBeInTheDocument()
    })
  })

  describe('SectionNavigation', () => {
    it('should render all section names', async () => {
      const { SectionNavigation } = await import('@/components/guided/section-navigation')
      const sections = ['basicInfo', 'description', 'ruleStatement', 'exceptions', 'examples', 'metadata']
      render(
        <SectionNavigation
          sections={sections}
          sectionStates={mockStoreState.sections}
          currentSection="basicInfo"
          onNavigate={vi.fn()}
        />
      )

      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Rule Statement')).toBeInTheDocument()
    })

    it('should highlight current section', async () => {
      const { SectionNavigation } = await import('@/components/guided/section-navigation')
      const sections = ['basicInfo', 'description', 'ruleStatement']
      render(
        <SectionNavigation
          sections={sections}
          sectionStates={mockStoreState.sections}
          currentSection="basicInfo"
          onNavigate={vi.fn()}
        />
      )

      const basicInfoButton = screen.getByText('Basic Information').closest('button')
      expect(basicInfoButton?.className).toContain('bg-primary')
    })

    it('should call onNavigate when section clicked', async () => {
      const onNavigate = vi.fn()
      const { SectionNavigation } = await import('@/components/guided/section-navigation')
      const sections = ['basicInfo', 'description']
      render(
        <SectionNavigation
          sections={sections}
          sectionStates={mockStoreState.sections}
          currentSection="basicInfo"
          onNavigate={onNavigate}
        />
      )

      fireEvent.click(screen.getByText('Description'))
      expect(onNavigate).toHaveBeenCalledWith('description')
    })
  })

  describe('SectionCard', () => {
    it('should render section title', async () => {
      const { SectionCard } = await import('@/components/guided/section-card')
      render(
        <SectionCard
          section="basicInfo"
          state={mockStoreState.sections.basicInfo}
          isActive={true}
        />
      )

      expect(screen.getByText('Basic Information')).toBeInTheDocument()
    })

    it('should show completion percentage', async () => {
      const { SectionCard } = await import('@/components/guided/section-card')
      render(
        <SectionCard
          section="basicInfo"
          state={mockStoreState.sections.basicInfo}
          isActive={false}
        />
      )

      expect(screen.getByText('60%')).toBeInTheDocument()
    })

    it('should show content in view mode for draft sections', async () => {
      const { SectionCard } = await import('@/components/guided/section-card')
      render(
        <SectionCard
          section="basicInfo"
          state={mockStoreState.sections.basicInfo}
          isActive={false}
        />
      )

      expect(screen.getByText('BR-001')).toBeInTheDocument()
      expect(screen.getByText('Test Rule')).toBeInTheDocument()
    })

    it('should show IF/THEN/ELSE for ruleStatement section', async () => {
      const { SectionCard } = await import('@/components/guided/section-card')
      render(
        <SectionCard
          section="ruleStatement"
          state={mockStoreState.sections.ruleStatement}
          isActive={false}
        />
      )

      expect(screen.getByText('IF:')).toBeInTheDocument()
      expect(screen.getByText('User submits form')).toBeInTheDocument()
    })

    it('should not show content for not_started sections', async () => {
      const { SectionCard } = await import('@/components/guided/section-card')
      render(
        <SectionCard
          section="description"
          state={mockStoreState.sections.description}
          isActive={false}
        />
      )

      expect(screen.getByText('Description')).toBeInTheDocument()
      // No content area should be visible
      expect(screen.queryByRole('region')).not.toBeInTheDocument()
    })

    it('should show edit button when not blocked', async () => {
      const { SectionCard } = await import('@/components/guided/section-card')
      render(
        <SectionCard
          section="basicInfo"
          state={mockStoreState.sections.basicInfo}
          isActive={false}
        />
      )

      expect(screen.getByLabelText('Edit Basic Information')).toBeInTheDocument()
    })

    it('should not show edit button when manual edit is blocked', async () => {
      mockStoreState.isManualEditBlocked = true
      const { SectionCard } = await import('@/components/guided/section-card')
      render(
        <SectionCard
          section="basicInfo"
          state={mockStoreState.sections.basicInfo}
          isActive={false}
        />
      )

      expect(screen.queryByLabelText('Edit Basic Information')).not.toBeInTheDocument()
      mockStoreState.isManualEditBlocked = false
    })

    it('should apply active ring when isActive is true', async () => {
      const { SectionCard } = await import('@/components/guided/section-card')
      const { container } = render(
        <SectionCard
          section="basicInfo"
          state={mockStoreState.sections.basicInfo}
          isActive={true}
        />
      )

      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('ring-2')
    })
  })

  describe('CompletionSummary', () => {
    it('should show overall completion percentage', async () => {
      const { CompletionSummary } = await import('@/components/guided/completion-summary')
      render(<CompletionSummary />)

      expect(screen.getByText('25%')).toBeInTheDocument()
    })

    it('should show advice message', async () => {
      const { CompletionSummary } = await import('@/components/guided/completion-summary')
      render(<CompletionSummary />)

      expect(screen.getByText('Keep going!')).toBeInTheDocument()
    })

    it('should show suggested action', async () => {
      const { CompletionSummary } = await import('@/components/guided/completion-summary')
      render(<CompletionSummary />)

      expect(screen.getByText(/Continue/)).toBeInTheDocument()
    })
  })

  describe('DocumentPanel', () => {
    it('should render section cards for business rule', async () => {
      const { DocumentPanel } = await import('@/components/guided/document-panel')
      render(<DocumentPanel />)

      expect(screen.getByText('Basic Information')).toBeInTheDocument()
      expect(screen.getByText('Rule Statement')).toBeInTheDocument()
    })

    it('should show completion summary', async () => {
      const { DocumentPanel } = await import('@/components/guided/document-panel')
      render(<DocumentPanel />)

      expect(screen.getByText('25%')).toBeInTheDocument()
    })
  })
})
