import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConversionPanel } from '@/components/guided/conversion-panel'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import type { ConversionAnalysis, ConversionState } from '@/stores/guided-creator-store'

// Mock the store
vi.mock('@/stores/guided-creator-store', () => ({
  useGuidedCreatorStore: vi.fn(),
}))

describe('ConversionPanel', () => {
  const mockSelectConvertedStory = vi.fn()

  const createMockState = (conversion: Partial<ConversionState>) => {
    const fullConversion: ConversionState = {
      mode: 'none',
      analysis: null,
      convertedStories: [],
      selectedStoryIndex: 0,
      error: null,
      ...conversion,
    }

    return {
      conversion: fullConversion,
      selectConvertedStory: mockSelectConvertedStory,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when mode is none and no analysis', () => {
    vi.mocked(useGuidedCreatorStore).mockReturnValue(createMockState({}))

    const { container } = render(<ConversionPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('should show analyzing state with spinner', () => {
    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        mode: 'analyzing',
        analysis: null,
      })
    )

    render(<ConversionPanel />)
    expect(screen.getByText('Analyzing business rule...')).toBeInTheDocument()
  })

  it('should show converting state with spinner', () => {
    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        mode: 'converting',
      })
    )

    render(<ConversionPanel />)
    expect(screen.getByText('Converting to user stories...')).toBeInTheDocument()
  })

  it('should show error message when error exists', () => {
    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        error: 'Network error occurred',
      })
    )

    render(<ConversionPanel />)
    expect(screen.getByText('Network error occurred')).toBeInTheDocument()
  })

  it('should show analysis results with split recommendation', () => {
    const analysis: ConversionAnalysis = {
      shouldSplit: true,
      suggestedCount: 2,
      reasoning: ['Multiple personas identified'],
      proposedStories: [
        { title: 'Admin Flow', rationale: 'Admin user', estimatedSize: 'M' },
        { title: 'User Flow', rationale: 'Regular user', estimatedSize: 'S' },
      ],
    }

    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        mode: 'analyzing',
        analysis,
      })
    )

    render(<ConversionPanel />)

    expect(screen.getByText('Split Recommended')).toBeInTheDocument()
    expect(screen.getByText('2 stories suggested')).toBeInTheDocument()
    expect(screen.getByText('Multiple personas identified')).toBeInTheDocument()
    expect(screen.getByText('Admin Flow')).toBeInTheDocument()
    expect(screen.getByText('User Flow')).toBeInTheDocument()
  })

  it('should show single story badge when no split needed', () => {
    const analysis: ConversionAnalysis = {
      shouldSplit: false,
      suggestedCount: 1,
      reasoning: ['Simple rule'],
      proposedStories: [{ title: 'Main Flow', rationale: 'Single', estimatedSize: 'S' }],
    }

    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        mode: 'analyzing',
        analysis,
      })
    )

    render(<ConversionPanel />)
    expect(screen.getByText('Single Story')).toBeInTheDocument()
    expect(screen.getByText('1 story suggested')).toBeInTheDocument()
  })

  it('should call onProceedToConvert when convert button clicked', () => {
    const onProceedToConvert = vi.fn()
    const analysis: ConversionAnalysis = {
      shouldSplit: false,
      suggestedCount: 1,
      reasoning: [],
      proposedStories: [],
    }

    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        mode: 'analyzing',
        analysis,
      })
    )

    render(<ConversionPanel onProceedToConvert={onProceedToConvert} />)

    const button = screen.getByRole('button', { name: /Convert to User Story/i })
    fireEvent.click(button)

    expect(onProceedToConvert).toHaveBeenCalled()
  })

  it('should show converted stories when complete', () => {
    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        mode: 'complete',
        convertedStories: [
          { storyId: 'US-001', title: 'First Story' },
          { storyId: 'US-002', title: 'Second Story' },
        ],
      })
    )

    render(<ConversionPanel />)

    expect(screen.getByText('2 Stories Generated')).toBeInTheDocument()
    expect(screen.getByText('US-001')).toBeInTheDocument()
    expect(screen.getByText('US-002')).toBeInTheDocument()
  })

  it('should highlight selected story', () => {
    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        mode: 'complete',
        convertedStories: [
          { storyId: 'US-001', title: 'First' },
          { storyId: 'US-002', title: 'Second' },
        ],
        selectedStoryIndex: 1,
      })
    )

    render(<ConversionPanel />)

    const buttons = screen.getAllByRole('button')
    // Second story should have the selected styles
    expect(buttons[1]).toHaveClass('bg-primary/10')
  })

  it('should call selectConvertedStory and onSelectStory when story clicked', () => {
    const onSelectStory = vi.fn()

    vi.mocked(useGuidedCreatorStore).mockReturnValue(
      createMockState({
        mode: 'complete',
        convertedStories: [
          { storyId: 'US-001', title: 'First' },
          { storyId: 'US-002', title: 'Second' },
        ],
      })
    )

    render(<ConversionPanel onSelectStory={onSelectStory} />)

    const secondStory = screen.getByText('US-002').closest('button')
    fireEvent.click(secondStory!)

    expect(mockSelectConvertedStory).toHaveBeenCalledWith(1)
    expect(onSelectStory).toHaveBeenCalledWith(1)
  })
})
