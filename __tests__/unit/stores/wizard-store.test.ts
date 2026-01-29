import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

describe('Business Rule Wizard Store', () => {
  beforeEach(async () => {
    // Reset store state before each test
    const { useWizardStore } = await import('@/stores/wizard-store')
    const { getState } = useWizardStore
    act(() => {
      getState().reset()
    })
  })

  describe('Navigation', () => {
    it('should start at step 1', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      expect(result.current.currentStep).toBe(1)
    })

    it('should navigate to next step', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.currentStep).toBe(2)
    })

    it('should navigate to previous step', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.nextStep()
        result.current.nextStep()
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(2)
    })

    it('should not go below step 1', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('should not exceed max step (7)', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.nextStep()
        }
      })

      expect(result.current.currentStep).toBe(7)
    })

    it('should go to specific step', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.goToStep(5)
      })

      expect(result.current.currentStep).toBe(5)
    })
  })

  describe('Data Management', () => {
    it('should initialize with empty business rule data', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      expect(result.current.data.ruleId).toBe('')
      expect(result.current.data.ruleName).toBe('')
      expect(result.current.data.status).toBe('draft')
    })

    it('should update basic info fields', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          ruleId: 'BR-VAL-001',
          ruleName: 'Email Validation Rule',
          category: 'validation',
          priority: 'high',
        })
      })

      expect(result.current.data.ruleId).toBe('BR-VAL-001')
      expect(result.current.data.ruleName).toBe('Email Validation Rule')
      expect(result.current.data.category).toBe('validation')
      expect(result.current.data.priority).toBe('high')
    })

    it('should update description', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          description: 'Validates email format according to RFC 5322',
        })
      })

      expect(result.current.data.description).toBe('Validates email format according to RFC 5322')
    })

    it('should update rule statement', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          ruleStatement: {
            if: 'email field is provided',
            then: 'validate against RFC 5322 pattern',
            else: 'reject with validation error',
          },
        })
      })

      expect(result.current.data.ruleStatement.if).toBe('email field is provided')
      expect(result.current.data.ruleStatement.then).toBe('validate against RFC 5322 pattern')
    })

    it('should update exceptions array', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          exceptions: ['Internal system emails', 'Legacy format emails'],
        })
      })

      expect(result.current.data.exceptions).toHaveLength(2)
      expect(result.current.data.exceptions[0]).toBe('Internal system emails')
    })

    it('should update examples array', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          examples: [
            { scenario: 'Valid email', isValid: true, description: 'user@example.com' },
            { scenario: 'Invalid email', isValid: false, description: 'not-an-email' },
          ],
        })
      })

      expect(result.current.data.examples).toHaveLength(2)
      expect(result.current.data.examples[0].isValid).toBe(true)
    })

    it('should update metadata fields', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          relatedRules: ['BR-VAL-002', 'BR-VAL-003'],
          source: 'Security Requirements v2.0',
          owner: 'Platform Team',
          effectiveDate: '2026-02-01',
        })
      })

      expect(result.current.data.relatedRules).toHaveLength(2)
      expect(result.current.data.source).toBe('Security Requirements v2.0')
      expect(result.current.data.owner).toBe('Platform Team')
    })
  })

  describe('Reset', () => {
    it('should reset all data to initial state', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({ ruleId: 'BR-001', ruleName: 'Test Rule' })
        result.current.nextStep()
        result.current.nextStep()
        result.current.reset()
      })

      expect(result.current.currentStep).toBe(1)
      expect(result.current.data.ruleId).toBe('')
      expect(result.current.data.ruleName).toBe('')
    })
  })

  describe('Step Completion Status', () => {
    it('should track step 1 as complete when basic info filled', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          ruleId: 'BR-VAL-001',
          ruleName: 'Test Rule',
          category: 'validation',
          priority: 'high',
        })
      })

      expect(result.current.isStepComplete(1)).toBe(true)
    })

    it('should track step 1 as incomplete when fields missing', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          ruleId: 'BR-VAL-001',
          // Missing ruleName
        })
      })

      expect(result.current.isStepComplete(1)).toBe(false)
    })

    it('should track step 2 as complete when description filled', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          description: 'This rule validates email format',
        })
      })

      expect(result.current.isStepComplete(2)).toBe(true)
    })

    it('should track step 3 as complete when rule statement filled', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({
          ruleStatement: {
            if: 'condition',
            then: 'action',
          },
        })
      })

      expect(result.current.isStepComplete(3)).toBe(true)
    })
  })

  describe('Draft Mode', () => {
    it('should allow saving as draft at any step', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      expect(result.current.canSaveDraft()).toBe(true)
    })

    it('should mark data as dirty when modified', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.updateData({ ruleId: 'BR-001' })
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('should clear dirty flag after save', async () => {
      const { useWizardStore } = await import('@/stores/wizard-store')
      const { result } = renderHook(() => useWizardStore())

      act(() => {
        result.current.updateData({ ruleId: 'BR-001' })
        result.current.markSaved()
      })

      expect(result.current.isDirty).toBe(false)
    })
  })
})
