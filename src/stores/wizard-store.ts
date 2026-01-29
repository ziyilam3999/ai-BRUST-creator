import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  BusinessRuleData,
  INITIAL_BUSINESS_RULE,
  WIZARD_STEPS,
} from '@/types/business-rule'

const MAX_STEPS = WIZARD_STEPS.length

interface WizardState {
  currentStep: number
  data: BusinessRuleData
  isDirty: boolean

  // Navigation
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void

  // Data management
  updateData: (updates: Partial<BusinessRuleData>) => void
  reset: () => void

  // Step validation
  isStepComplete: (step: number) => boolean

  // Draft management
  canSaveDraft: () => boolean
  markSaved: () => void
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      data: { ...INITIAL_BUSINESS_RULE },
      isDirty: false,

      nextStep: () => {
        const { currentStep } = get()
        if (currentStep < MAX_STEPS) {
          set({ currentStep: currentStep + 1 })
        }
      },

      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 })
        }
      },

      goToStep: (step: number) => {
        if (step >= 1 && step <= MAX_STEPS) {
          set({ currentStep: step })
        }
      },

      updateData: (updates: Partial<BusinessRuleData>) => {
        const { data } = get()
        set({
          data: { ...data, ...updates },
          isDirty: true,
        })
      },

      reset: () => {
        set({
          currentStep: 1,
          data: { ...INITIAL_BUSINESS_RULE },
          isDirty: false,
        })
      },

      isStepComplete: (step: number): boolean => {
        const { data } = get()

        switch (step) {
          case 1:
            // Basic Info: ruleId, ruleName, category, priority required
            return !!(
              data.ruleId &&
              data.ruleName &&
              data.category &&
              data.priority
            )
          case 2:
            // Description required
            return !!data.description
          case 3:
            // Rule Statement: if and then required
            return !!(data.ruleStatement.if && data.ruleStatement.then)
          case 4:
            // Exceptions: optional, always complete
            return true
          case 5:
            // Examples: optional, always complete
            return true
          case 6:
            // Metadata: optional, always complete
            return true
          case 7:
            // Review: always complete (just viewing)
            return true
          default:
            return false
        }
      },

      canSaveDraft: () => {
        // Can always save as draft
        return true
      },

      markSaved: () => {
        set({ isDirty: false })
      },
    }),
    {
      name: 'wizard-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        data: state.data,
      }),
    }
  )
)
