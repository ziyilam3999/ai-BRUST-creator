import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

describe('User Story Wizard Store', () => {
  beforeEach(async () => {
    // Reset store state before each test
    const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
    const { getState } = useUserStoryWizardStore
    act(() => {
      getState().reset()
    })
  })

  describe('Navigation', () => {
    it('should start at step 1', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      expect(result.current.currentStep).toBe(1)
    })

    it('should navigate to next step', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.currentStep).toBe(2)
    })

    it('should navigate to previous step', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.nextStep()
        result.current.nextStep()
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(2)
    })

    it('should not go below step 1', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('should not exceed max step (6)', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.nextStep()
        }
      })

      expect(result.current.currentStep).toBe(6)
    })

    it('should go to specific step', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.goToStep(4)
      })

      expect(result.current.currentStep).toBe(4)
    })
  })

  describe('Data Management', () => {
    it('should initialize with empty user story data', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      expect(result.current.data.storyId).toBe('')
      expect(result.current.data.epic).toBe('')
      expect(result.current.data.status).toBe('draft')
    })

    it('should update basic info fields', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          storyId: 'US-AUTH-001',
          epic: 'Authentication',
          title: 'User Login',
          priority: 'must',
        })
      })

      expect(result.current.data.storyId).toBe('US-AUTH-001')
      expect(result.current.data.epic).toBe('Authentication')
      expect(result.current.data.title).toBe('User Login')
      expect(result.current.data.priority).toBe('must')
    })

    it('should update story statement', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          storyStatement: {
            role: 'registered user',
            feature: 'log into my account',
            benefit: 'I can access my personalized content',
          },
        })
      })

      expect(result.current.data.storyStatement.role).toBe('registered user')
      expect(result.current.data.storyStatement.feature).toBe('log into my account')
      expect(result.current.data.storyStatement.benefit).toBe('I can access my personalized content')
    })

    it('should update acceptance criteria array', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          acceptanceCriteria: [
            {
              id: '1',
              scenario: 'Successful login',
              given: 'I am on the login page',
              when: 'I enter valid credentials',
              then: 'I should be redirected to dashboard',
            },
          ],
        })
      })

      expect(result.current.data.acceptanceCriteria).toHaveLength(1)
      expect(result.current.data.acceptanceCriteria[0].scenario).toBe('Successful login')
    })

    it('should update definition of done items', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          definitionOfDone: [
            { id: '1', description: 'Code complete and reviewed', completed: true },
            { id: '2', description: 'Unit tests passing', completed: true },
            { id: '3', description: 'Acceptance criteria verified', completed: false },
          ],
        })
      })

      expect(result.current.data.definitionOfDone).toHaveLength(3)
      expect(result.current.data.definitionOfDone[0].completed).toBe(true)
      expect(result.current.data.definitionOfDone[2].completed).toBe(false)
    })

    it('should update related items', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          relatedItems: ['BR-AUTH-001', 'US-AUTH-002'],
          notes: 'See security review notes',
        })
      })

      expect(result.current.data.relatedItems).toHaveLength(2)
      expect(result.current.data.notes).toBe('See security review notes')
    })
  })

  describe('Reset', () => {
    it('should reset all data to initial state', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({ storyId: 'US-001', title: 'Test Story' })
        result.current.nextStep()
        result.current.nextStep()
        result.current.reset()
      })

      expect(result.current.currentStep).toBe(1)
      expect(result.current.data.storyId).toBe('')
      expect(result.current.data.title).toBe('')
    })
  })

  describe('Step Completion Status', () => {
    it('should track step 1 as complete when basic info filled', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          storyId: 'US-AUTH-001',
          epic: 'Authentication',
          title: 'User Login',
          priority: 'must',
        })
      })

      expect(result.current.isStepComplete(1)).toBe(true)
    })

    it('should track step 1 as incomplete when fields missing', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          storyId: 'US-AUTH-001',
          // Missing title, epic
        })
      })

      expect(result.current.isStepComplete(1)).toBe(false)
    })

    it('should track step 2 as complete when story statement filled', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          storyStatement: {
            role: 'user',
            feature: 'do something',
            benefit: 'get value',
          },
        })
      })

      expect(result.current.isStepComplete(2)).toBe(true)
    })

    it('should track step 3 as complete when at least one acceptance criterion exists', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({
          acceptanceCriteria: [
            {
              id: '1',
              scenario: 'Test',
              given: 'Given',
              when: 'When',
              then: 'Then',
            },
          ],
        })
      })

      expect(result.current.isStepComplete(3)).toBe(true)
    })
  })

  describe('Acceptance Criteria Management', () => {
    it('should add acceptance criterion', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.addAcceptanceCriterion({
          scenario: 'New scenario',
          given: 'Given state',
          when: 'When action',
          then: 'Then result',
        })
      })

      expect(result.current.data.acceptanceCriteria).toHaveLength(1)
      expect(result.current.data.acceptanceCriteria[0].scenario).toBe('New scenario')
    })

    it('should remove acceptance criterion by id', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.addAcceptanceCriterion({ scenario: 'AC1', given: 'G1', when: 'W1', then: 'T1' })
        result.current.addAcceptanceCriterion({ scenario: 'AC2', given: 'G2', when: 'W2', then: 'T2' })
      })

      const acId = result.current.data.acceptanceCriteria[0].id

      act(() => {
        result.current.removeAcceptanceCriterion(acId)
      })

      expect(result.current.data.acceptanceCriteria).toHaveLength(1)
      expect(result.current.data.acceptanceCriteria[0].scenario).toBe('AC2')
    })

    it('should update acceptance criterion', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.addAcceptanceCriterion({ scenario: 'Original', given: 'G', when: 'W', then: 'T' })
      })

      const acId = result.current.data.acceptanceCriteria[0].id

      act(() => {
        result.current.updateAcceptanceCriterion(acId, { scenario: 'Updated' })
      })

      expect(result.current.data.acceptanceCriteria[0].scenario).toBe('Updated')
    })
  })

  describe('Definition of Done Management', () => {
    it('should have default DoD items on init', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      expect(result.current.data.definitionOfDone.length).toBeGreaterThanOrEqual(3)
    })

    it('should toggle DoD item completion', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      const dodId = result.current.data.definitionOfDone[0].id

      act(() => {
        result.current.toggleDoDItem(dodId)
      })

      expect(result.current.data.definitionOfDone[0].completed).toBe(true)

      act(() => {
        result.current.toggleDoDItem(dodId)
      })

      expect(result.current.data.definitionOfDone[0].completed).toBe(false)
    })

    it('should add DoD item', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      const initialLength = result.current.data.definitionOfDone.length

      act(() => {
        result.current.addDoDItem('Custom requirement')
      })

      expect(result.current.data.definitionOfDone.length).toBe(initialLength + 1)
      expect(result.current.data.definitionOfDone[initialLength].description).toBe('Custom requirement')
    })

    it('should remove DoD item', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      const initialLength = result.current.data.definitionOfDone.length
      const dodId = result.current.data.definitionOfDone[0].id

      act(() => {
        result.current.removeDoDItem(dodId)
      })

      expect(result.current.data.definitionOfDone.length).toBe(initialLength - 1)
    })
  })

  describe('Draft Mode', () => {
    it('should allow saving as draft at any step', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      expect(result.current.canSaveDraft()).toBe(true)
    })

    it('should mark data as dirty when modified', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.updateData({ storyId: 'US-001' })
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('should clear dirty flag after save', async () => {
      const { useUserStoryWizardStore } = await import('@/stores/user-story-wizard-store')
      const { result } = renderHook(() => useUserStoryWizardStore())

      act(() => {
        result.current.updateData({ storyId: 'US-001' })
        result.current.markSaved()
      })

      expect(result.current.isDirty).toBe(false)
    })
  })
})
