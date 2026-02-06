import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConversionPrompt } from '@/components/guided/conversion/conversion-prompt'
import { AnalysisPanel } from '@/components/guided/conversion/analysis-panel'
import { StoryPreviewCard } from '@/components/guided/conversion/story-preview-card'
import { StoryPreviewList } from '@/components/guided/conversion/story-preview-list'
import { SideBySideView } from '@/components/guided/conversion/side-by-side-view'
import { StoryEditorModal } from '@/components/guided/conversion/story-editor-modal'
import { ConversionSummary } from '@/components/guided/conversion/conversion-summary'
import type { GeneratedStory, ConversionAnalysis } from '@/stores/guided-creator-store'
import type { BusinessRuleData } from '@/types/business-rule'
import { INITIAL_USER_STORY } from '@/types/user-story'

// Test helpers
const mockAnalysis: ConversionAnalysis = {
  shouldSplit: true,
  suggestedCount: 2,
  reasoning: ['Multiple personas detected', 'Complex conditions found'],
  proposedStories: [
    { title: 'Admin management', rationale: 'Admin persona', estimatedSize: 'M' },
    { title: 'User access', rationale: 'User persona', estimatedSize: 'S' },
  ],
}

const makeGeneratedStory = (id: string, overrides: Partial<GeneratedStory> = {}): GeneratedStory => ({
  id,
  data: {
    ...INITIAL_USER_STORY,
    storyId: `US-${id}`,
    title: `Story ${id}`,
    storyStatement: { role: 'admin', feature: 'manage users', benefit: 'efficiency' },
  },
  status: 'draft',
  conversationHistory: [],
  ...overrides,
})

const mockBR: BusinessRuleData = {
  ruleId: 'BR-VAL-001',
  ruleName: 'Test Rule',
  category: 'validation',
  priority: 'high',
  description: 'A test business rule',
  ruleStatement: { if: 'user is admin', then: 'allow access', else: 'deny access' },
  exceptions: [],
  examples: [],
  relatedRules: [],
  source: '',
  owner: '',
  effectiveDate: '',
  version: '1.0',
  status: 'approved',
}

// ========== ConversionPrompt Tests ==========
describe('ConversionPrompt', () => {
  it('should render prompt with BR title', () => {
    render(<ConversionPrompt brTitle="Test Rule" onConvert={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText(/Test Rule/)).toBeInTheDocument()
    expect(screen.getByText(/Convert to User Stories/i)).toBeInTheDocument()
  })

  it('should call onConvert when convert button clicked', () => {
    const onConvert = vi.fn()
    render(<ConversionPrompt brTitle="Test" onConvert={onConvert} onSkip={vi.fn()} />)
    fireEvent.click(screen.getByText(/Convert to User Stories/i))
    expect(onConvert).toHaveBeenCalledOnce()
  })

  it('should call onSkip when skip button clicked', () => {
    const onSkip = vi.fn()
    render(<ConversionPrompt brTitle="Test" onConvert={vi.fn()} onSkip={onSkip} />)
    fireEvent.click(screen.getByText(/Just Save BR/i))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})

// ========== AnalysisPanel Tests ==========
describe('AnalysisPanel', () => {
  it('should show analyzing state', () => {
    render(<AnalysisPanel recommendation={mockAnalysis} onAccept={vi.fn()} isAnalyzing={true} />)
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument()
  })

  it('should display split recommendation badge', () => {
    render(<AnalysisPanel recommendation={mockAnalysis} onAccept={vi.fn()} isAnalyzing={false} />)
    expect(screen.getByText(/Split into 2/i)).toBeInTheDocument()
  })

  it('should display reasoning', () => {
    render(<AnalysisPanel recommendation={mockAnalysis} onAccept={vi.fn()} isAnalyzing={false} />)
    expect(screen.getByText('Multiple personas detected')).toBeInTheDocument()
  })

  it('should call onAccept with story count', () => {
    const onAccept = vi.fn()
    render(<AnalysisPanel recommendation={mockAnalysis} onAccept={onAccept} isAnalyzing={false} />)
    fireEvent.click(screen.getByText(/Generate 2 User Stories/i))
    expect(onAccept).toHaveBeenCalledWith(2)
  })
})

// ========== StoryPreviewCard Tests ==========
describe('StoryPreviewCard', () => {
  const defaultProps = {
    story: makeGeneratedStory('s1'),
    index: 0,
    totalStories: 2,
    onAccept: vi.fn(),
    onEdit: vi.fn(),
    onRegenerate: vi.fn(),
    onDelete: vi.fn(),
    onChat: vi.fn(),
  }

  it('should render story statement', () => {
    render(<StoryPreviewCard {...defaultProps} />)
    expect(screen.getByText(/admin/)).toBeInTheDocument()
    expect(screen.getByText(/manage users/)).toBeInTheDocument()
  })

  it('should show accept button for draft stories', () => {
    render(<StoryPreviewCard {...defaultProps} />)
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
  })

  it('should show accepted badge for accepted stories', () => {
    const accepted = makeGeneratedStory('s1', { status: 'accepted' })
    render(<StoryPreviewCard {...defaultProps} story={accepted} />)
    expect(screen.getByText(/accepted/i)).toBeInTheDocument()
  })

  it('should call action callbacks', () => {
    const onEdit = vi.fn()
    render(<StoryPreviewCard {...defaultProps} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('should show delete button only when multiple stories', () => {
    const { rerender } = render(<StoryPreviewCard {...defaultProps} totalStories={1} />)
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()

    rerender(<StoryPreviewCard {...defaultProps} totalStories={2} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })
})

// ========== StoryPreviewList Tests ==========
describe('StoryPreviewList', () => {
  it('should render story cards', () => {
    const stories = [makeGeneratedStory('s1'), makeGeneratedStory('s2')]
    render(
      <StoryPreviewList
        stories={stories}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onRegenerate={vi.fn()}
        onDelete={vi.fn()}
        onChat={vi.fn()}
      />
    )
    expect(screen.getByText('2 User Stories Generated')).toBeInTheDocument()
  })

  it('should show empty state when no stories', () => {
    render(
      <StoryPreviewList
        stories={[]}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onRegenerate={vi.fn()}
        onDelete={vi.fn()}
        onChat={vi.fn()}
      />
    )
    expect(screen.getByText(/no stories/i)).toBeInTheDocument()
  })

  it('should show story count', () => {
    const stories = [makeGeneratedStory('s1'), makeGeneratedStory('s2'), makeGeneratedStory('s3')]
    render(
      <StoryPreviewList
        stories={stories}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onRegenerate={vi.fn()}
        onDelete={vi.fn()}
        onChat={vi.fn()}
      />
    )
    expect(screen.getByText('3 User Stories Generated')).toBeInTheDocument()
  })
})

// ========== SideBySideView Tests ==========
describe('SideBySideView', () => {
  it('should render BR panel and US panel', () => {
    const stories = [makeGeneratedStory('s1')]
    render(<SideBySideView businessRule={mockBR} stories={stories} onAccept={vi.fn()} onEdit={vi.fn()} onRegenerate={vi.fn()} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.getByText(/source business rule/i)).toBeInTheDocument()
    expect(screen.getByText(/generated user stories/i)).toBeInTheDocument()
  })

  it('should display BR title', () => {
    render(<SideBySideView businessRule={mockBR} stories={[makeGeneratedStory('s1')]} onAccept={vi.fn()} onEdit={vi.fn()} onRegenerate={vi.fn()} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.getByText('Test Rule')).toBeInTheDocument()
  })

  it('should display BR rule statement', () => {
    render(<SideBySideView businessRule={mockBR} stories={[makeGeneratedStory('s1')]} onAccept={vi.fn()} onEdit={vi.fn()} onRegenerate={vi.fn()} onDelete={vi.fn()} onChat={vi.fn()} />)
    expect(screen.getByText(/user is admin/)).toBeInTheDocument()
  })
})

// ========== StoryEditorModal Tests ==========
describe('StoryEditorModal', () => {
  const story = makeGeneratedStory('s1')

  it('should render editor with story fields', () => {
    render(<StoryEditorModal story={story} open={true} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('admin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('manage users')).toBeInTheDocument()
  })

  it('should call onSave with updated data', () => {
    const onSave = vi.fn()
    render(<StoryEditorModal story={story} open={true} onSave={onSave} onCancel={vi.fn()} />)

    const roleInput = screen.getByDisplayValue('admin')
    fireEvent.change(roleInput, { target: { value: 'manager' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledOnce()
    const savedData = onSave.mock.calls[0][0]
    expect(savedData.storyStatement.role).toBe('manager')
  })

  it('should call onCancel without saving', () => {
    const onCancel = vi.fn()
    const onSave = vi.fn()
    render(<StoryEditorModal story={story} open={true} onSave={onSave} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('should not render when closed', () => {
    render(<StoryEditorModal story={story} open={false} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByDisplayValue('admin')).not.toBeInTheDocument()
  })
})

// ========== ConversionSummary Tests ==========
describe('ConversionSummary', () => {
  it('should show story count and accepted count', () => {
    const stories = [
      makeGeneratedStory('s1', { status: 'accepted' }),
      makeGeneratedStory('s2', { status: 'draft' }),
      makeGeneratedStory('s3', { status: 'accepted' }),
    ]
    render(<ConversionSummary stories={stories} onSaveAll={vi.fn()} onAddManual={vi.fn()} />)
    expect(screen.getByText(/2 of 3 accepted/i)).toBeInTheDocument()
  })

  it('should call onSaveAll', () => {
    const onSaveAll = vi.fn()
    const stories = [makeGeneratedStory('s1', { status: 'accepted' })]
    render(<ConversionSummary stories={stories} onSaveAll={onSaveAll} onAddManual={vi.fn()} />)
    fireEvent.click(screen.getByText(/save all/i))
    expect(onSaveAll).toHaveBeenCalledOnce()
  })

  it('should call onAddManual', () => {
    const onAddManual = vi.fn()
    render(<ConversionSummary stories={[]} onSaveAll={vi.fn()} onAddManual={onAddManual} />)
    fireEvent.click(screen.getByText(/add manual/i))
    expect(onAddManual).toHaveBeenCalledOnce()
  })
})
