import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}))

// Mock the user story wizard store
vi.mock('@/stores/user-story-wizard-store', () => ({
  useUserStoryWizardStore: vi.fn(() => ({
    currentStep: 1,
    data: {
      storyId: '',
      epic: '',
      title: '',
      priority: 'should',
      storyStatement: { role: '', feature: '', benefit: '' },
      acceptanceCriteria: [],
      definitionOfDone: [
        { id: '1', description: 'Code complete and reviewed', completed: false },
        { id: '2', description: 'Unit tests passing', completed: false },
        { id: '3', description: 'Acceptance criteria verified', completed: false },
      ],
      relatedItems: [],
      notes: '',
      version: '1.0',
      status: 'draft',
    },
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    goToStep: vi.fn(),
    updateData: vi.fn(),
    reset: vi.fn(),
    isStepComplete: vi.fn(() => false),
    addAcceptanceCriterion: vi.fn(),
    removeAcceptanceCriterion: vi.fn(),
    updateAcceptanceCriterion: vi.fn(),
    toggleDoDItem: vi.fn(),
    addDoDItem: vi.fn(),
    removeDoDItem: vi.fn(),
    isDirty: false,
    canSaveDraft: vi.fn(() => true),
    markSaved: vi.fn(),
  })),
}))

describe('UserStoryWizardContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render wizard container', async () => {
    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should display current step indicator', async () => {
    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
  })

  it('should display step title', async () => {
    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.getByText(/basic info/i)).toBeInTheDocument()
  })

  it('should have Next button', async () => {
    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('should have Save Draft button', async () => {
    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument()
  })

  it('should not show Previous button on step 1', async () => {
    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
  })
})

describe('UserStoryWizardContainer Navigation', () => {
  it('should show Previous button when not on step 1', async () => {
    const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
    vi.mocked(useUserStoryWizardStore).mockReturnValue({
      currentStep: 2,
      data: {
        storyId: '',
        epic: '',
        title: '',
        priority: 'should',
        storyStatement: { role: '', feature: '', benefit: '' },
        acceptanceCriteria: [],
        definitionOfDone: [],
        relatedItems: [],
        notes: '',
        version: '1.0',
        status: 'draft',
      },
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      goToStep: vi.fn(),
      updateData: vi.fn(),
      reset: vi.fn(),
      isStepComplete: vi.fn(() => false),
      addAcceptanceCriterion: vi.fn(),
      removeAcceptanceCriterion: vi.fn(),
      updateAcceptanceCriterion: vi.fn(),
      toggleDoDItem: vi.fn(),
      addDoDItem: vi.fn(),
      removeDoDItem: vi.fn(),
      isDirty: false,
      canSaveDraft: vi.fn(() => true),
      markSaved: vi.fn(),
    })

    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
  })

  it('should show Submit button on final step', async () => {
    const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
    vi.mocked(useUserStoryWizardStore).mockReturnValue({
      currentStep: 6,
      data: {
        storyId: 'US-AUTH-001',
        epic: 'Authentication',
        title: 'User Login',
        priority: 'must',
        storyStatement: { role: 'user', feature: 'login', benefit: 'access' },
        acceptanceCriteria: [{ id: '1', scenario: 'Test', given: 'G', when: 'W', then: 'T' }],
        definitionOfDone: [{ id: '1', description: 'Code reviewed', completed: true }],
        relatedItems: [],
        notes: '',
        version: '1.0',
        status: 'draft',
      },
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      goToStep: vi.fn(),
      updateData: vi.fn(),
      reset: vi.fn(),
      isStepComplete: vi.fn(() => true),
      addAcceptanceCriterion: vi.fn(),
      removeAcceptanceCriterion: vi.fn(),
      updateAcceptanceCriterion: vi.fn(),
      toggleDoDItem: vi.fn(),
      addDoDItem: vi.fn(),
      removeDoDItem: vi.fn(),
      isDirty: false,
      canSaveDraft: vi.fn(() => true),
      markSaved: vi.fn(),
    })

    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('should call nextStep when Next clicked', async () => {
    const nextStepMock = vi.fn()
    const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
    vi.mocked(useUserStoryWizardStore).mockReturnValue({
      currentStep: 1,
      data: {
        storyId: 'US-001',
        epic: 'Auth',
        title: 'Login',
        priority: 'must',
        storyStatement: { role: '', feature: '', benefit: '' },
        acceptanceCriteria: [],
        definitionOfDone: [],
        relatedItems: [],
        notes: '',
        version: '1.0',
        status: 'draft',
      },
      nextStep: nextStepMock,
      prevStep: vi.fn(),
      goToStep: vi.fn(),
      updateData: vi.fn(),
      reset: vi.fn(),
      isStepComplete: vi.fn(() => true),
      addAcceptanceCriterion: vi.fn(),
      removeAcceptanceCriterion: vi.fn(),
      updateAcceptanceCriterion: vi.fn(),
      toggleDoDItem: vi.fn(),
      addDoDItem: vi.fn(),
      removeDoDItem: vi.fn(),
      isDirty: false,
      canSaveDraft: vi.fn(() => true),
      markSaved: vi.fn(),
    })

    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(nextStepMock).toHaveBeenCalled()
  })
})

describe('UserStoryWizardContainer Progress', () => {
  it('should display progress bar', async () => {
    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show correct progress percentage for 6 steps', async () => {
    const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
    vi.mocked(useUserStoryWizardStore).mockReturnValue({
      currentStep: 3,
      data: {
        storyId: '',
        epic: '',
        title: '',
        priority: 'should',
        storyStatement: { role: '', feature: '', benefit: '' },
        acceptanceCriteria: [],
        definitionOfDone: [],
        relatedItems: [],
        notes: '',
        version: '1.0',
        status: 'draft',
      },
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      goToStep: vi.fn(),
      updateData: vi.fn(),
      reset: vi.fn(),
      isStepComplete: vi.fn(() => false),
      addAcceptanceCriterion: vi.fn(),
      removeAcceptanceCriterion: vi.fn(),
      updateAcceptanceCriterion: vi.fn(),
      toggleDoDItem: vi.fn(),
      addDoDItem: vi.fn(),
      removeDoDItem: vi.fn(),
      isDirty: false,
      canSaveDraft: vi.fn(() => true),
      markSaved: vi.fn(),
    })

    const { UserStoryWizardContainer } = await import('@/components/wizard/user-story-wizard-container')
    render(<UserStoryWizardContainer />)

    const progressBar = screen.getByRole('progressbar')
    // Step 3 of 6 = 50%
    expect(progressBar).toHaveAttribute('aria-valuenow', '50')
  })
})
