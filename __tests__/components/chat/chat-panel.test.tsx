import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the useChat hook
vi.mock('ai/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    input: '',
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    error: null,
  })),
}))

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chat panel', async () => {
    const { ChatPanel } = await import('@/components/chat/chat-panel')
    render(<ChatPanel />)

    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('should show placeholder when no messages', async () => {
    const { ChatPanel } = await import('@/components/chat/chat-panel')
    render(<ChatPanel documentType="business_rule" />)

    expect(screen.getByText(/ask me anything about your business rule/i)).toBeInTheDocument()
  })

  it('should have textarea for input', async () => {
    const { ChatPanel } = await import('@/components/chat/chat-panel')
    render(<ChatPanel />)

    expect(screen.getByPlaceholderText('Ask a question...')).toBeInTheDocument()
  })

  it('should have send button', async () => {
    const { ChatPanel } = await import('@/components/chat/chat-panel')
    render(<ChatPanel />)

    // Find submit button by type attribute
    const buttons = screen.getAllByRole('button')
    const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit')
    expect(submitButton).toBeDefined()
  })

  it('should show messages when present', async () => {
    const { useChat } = await import('ai/react')
    vi.mocked(useChat).mockReturnValue({
      messages: [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' },
      ],
      input: '',
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: false,
      error: null,
    } as never)

    const { ChatPanel } = await import('@/components/chat/chat-panel')
    render(<ChatPanel />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('should show loading indicator when loading', async () => {
    const { useChat } = await import('ai/react')
    vi.mocked(useChat).mockReturnValue({
      messages: [],
      input: 'test',
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: true,
      error: null,
    } as never)

    const { ChatPanel } = await import('@/components/chat/chat-panel')
    const { container } = render(<ChatPanel />)

    // Should show loading spinner (svg with animate-spin class)
    const spinners = container.querySelectorAll('.animate-spin')
    expect(spinners.length).toBeGreaterThanOrEqual(1)
  })

  it('should show error message when error occurs', async () => {
    const { useChat } = await import('ai/react')
    vi.mocked(useChat).mockReturnValue({
      messages: [],
      input: '',
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: false,
      error: new Error('Test error'),
    } as never)

    const { ChatPanel } = await import('@/components/chat/chat-panel')
    render(<ChatPanel />)

    expect(screen.getByText(/error: test error/i)).toBeInTheDocument()
  })

  it('should minimize when minimize button clicked', async () => {
    const { ChatPanel } = await import('@/components/chat/chat-panel')
    const { container } = render(<ChatPanel />)

    // Find the minimize button (the one that's not a submit button)
    const buttons = screen.getAllByRole('button')
    const minimizeButton = buttons.find(btn => btn.getAttribute('type') !== 'submit')
    expect(minimizeButton).toBeDefined()

    fireEvent.click(minimizeButton!)

    // After minimizing, AI Assistant text should not be visible
    expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument()
  })

  it('should call useChat with correct context', async () => {
    const { useChat } = await import('ai/react')
    const mockUseChat = vi.mocked(useChat)
    mockUseChat.mockReturnValue({
      messages: [],
      input: '',
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: false,
      error: null,
    } as never)

    const { ChatPanel } = await import('@/components/chat/chat-panel')
    const wizardData = { ruleId: 'BR-001' }
    render(
      <ChatPanel
        documentType="business_rule"
        currentStep={2}
        wizardData={wizardData}
      />
    )

    expect(mockUseChat).toHaveBeenCalledWith(
      expect.objectContaining({
        api: '/api/ai/chat',
        body: expect.objectContaining({
          context: expect.objectContaining({
            documentType: 'business_rule',
            currentStep: 2,
            wizardData,
          }),
        }),
      })
    )
  })
})
