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

// Mock the wizard store
vi.mock('@/stores/wizard-store', () => ({
  useWizardStore: vi.fn(() => ({
    currentStep: 1,
    data: {
      ruleId: '',
      ruleName: '',
      category: 'validation',
      priority: 'medium',
      description: '',
      ruleStatement: { if: '', then: '', else: '' },
      exceptions: [],
      examples: [],
      relatedRules: [],
      source: '',
      owner: '',
      effectiveDate: '',
      version: '1.0',
      status: 'draft',
    },
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    goToStep: vi.fn(),
    updateData: vi.fn(),
    reset: vi.fn(),
    isStepComplete: vi.fn(() => false),
    isDirty: false,
    canSaveDraft: vi.fn(() => true),
    markSaved: vi.fn(),
  })),
}))

describe('WizardContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render wizard container', async () => {
    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should display current step indicator', async () => {
    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
  })

  it('should display step title', async () => {
    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.getByText(/basic info/i)).toBeInTheDocument()
  })

  it('should have Next button', async () => {
    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('should have Save Draft button', async () => {
    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument()
  })

  it('should not show Previous button on step 1', async () => {
    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
  })
})

describe('WizardContainer Navigation', () => {
  it('should show Previous button when not on step 1', async () => {
    const { useWizardStore } = await import('@/stores/wizard-store')
    vi.mocked(useWizardStore).mockReturnValue({
      currentStep: 2,
      data: {
        ruleId: '',
        ruleName: '',
        category: 'validation',
        priority: 'medium',
        description: '',
        ruleStatement: { if: '', then: '', else: '' },
        exceptions: [],
        examples: [],
        relatedRules: [],
        source: '',
        owner: '',
        effectiveDate: '',
        version: '1.0',
        status: 'draft',
      },
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      goToStep: vi.fn(),
      updateData: vi.fn(),
      reset: vi.fn(),
      isStepComplete: vi.fn(() => false),
      isDirty: false,
      canSaveDraft: vi.fn(() => true),
      markSaved: vi.fn(),
    })

    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
  })

  it('should show Submit button on final step', async () => {
    const { useWizardStore } = await import('@/stores/wizard-store')
    vi.mocked(useWizardStore).mockReturnValue({
      currentStep: 7,
      data: {
        ruleId: 'BR-VAL-001',
        ruleName: 'Test Rule',
        category: 'validation',
        priority: 'medium',
        description: 'Test description',
        ruleStatement: { if: 'condition', then: 'action', else: '' },
        exceptions: [],
        examples: [],
        relatedRules: [],
        source: '',
        owner: '',
        effectiveDate: '',
        version: '1.0',
        status: 'draft',
      },
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      goToStep: vi.fn(),
      updateData: vi.fn(),
      reset: vi.fn(),
      isStepComplete: vi.fn(() => true),
      isDirty: false,
      canSaveDraft: vi.fn(() => true),
      markSaved: vi.fn(),
    })

    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('should call nextStep when Next clicked', async () => {
    const nextStepMock = vi.fn()
    const { useWizardStore } = await import('@/stores/wizard-store')
    vi.mocked(useWizardStore).mockReturnValue({
      currentStep: 1,
      data: {
        ruleId: 'BR-001',
        ruleName: 'Test',
        category: 'validation',
        priority: 'medium',
        description: '',
        ruleStatement: { if: '', then: '', else: '' },
        exceptions: [],
        examples: [],
        relatedRules: [],
        source: '',
        owner: '',
        effectiveDate: '',
        version: '1.0',
        status: 'draft',
      },
      nextStep: nextStepMock,
      prevStep: vi.fn(),
      goToStep: vi.fn(),
      updateData: vi.fn(),
      reset: vi.fn(),
      isStepComplete: vi.fn(() => true),
      isDirty: false,
      canSaveDraft: vi.fn(() => true),
      markSaved: vi.fn(),
    })

    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(nextStepMock).toHaveBeenCalled()
  })
})

describe('WizardContainer Progress', () => {
  it('should display progress bar', async () => {
    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show correct progress percentage', async () => {
    const { useWizardStore } = await import('@/stores/wizard-store')
    vi.mocked(useWizardStore).mockReturnValue({
      currentStep: 4,
      data: {
        ruleId: '',
        ruleName: '',
        category: 'validation',
        priority: 'medium',
        description: '',
        ruleStatement: { if: '', then: '', else: '' },
        exceptions: [],
        examples: [],
        relatedRules: [],
        source: '',
        owner: '',
        effectiveDate: '',
        version: '1.0',
        status: 'draft',
      },
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      goToStep: vi.fn(),
      updateData: vi.fn(),
      reset: vi.fn(),
      isStepComplete: vi.fn(() => false),
      isDirty: false,
      canSaveDraft: vi.fn(() => true),
      markSaved: vi.fn(),
    })

    const { WizardContainer } = await import('@/components/wizard/wizard-container')
    render(<WizardContainer />)

    const progressBar = screen.getByRole('progressbar')
    // Step 4 of 7 = ~57%
    expect(progressBar).toHaveAttribute('aria-valuenow', '57')
  })
})
