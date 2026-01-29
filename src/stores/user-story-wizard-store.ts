import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  UserStoryData,
  INITIAL_USER_STORY,
  US_WIZARD_STEPS,
  AcceptanceCriterion,
} from '@/types/user-story'

const MAX_STEPS = US_WIZARD_STEPS.length

interface UserStoryWizardState {
  currentStep: number
  data: UserStoryData
  isDirty: boolean

  // Navigation
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void

  // Data management
  updateData: (updates: Partial<UserStoryData>) => void
  reset: () => void

  // Step validation
  isStepComplete: (step: number) => boolean

  // Acceptance Criteria management
  addAcceptanceCriterion: (criterion: Omit<AcceptanceCriterion, 'id'>) => void
  removeAcceptanceCriterion: (id: string) => void
  updateAcceptanceCriterion: (id: string, updates: Partial<AcceptanceCriterion>) => void

  // Definition of Done management
  toggleDoDItem: (id: string) => void
  addDoDItem: (description: string) => void
  removeDoDItem: (id: string) => void

  // Draft management
  canSaveDraft: () => boolean
  markSaved: () => void
}

let acIdCounter = 0
let dodIdCounter = 100

export const useUserStoryWizardStore = create<UserStoryWizardState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      data: { ...INITIAL_USER_STORY },
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

      updateData: (updates: Partial<UserStoryData>) => {
        const { data } = get()
        set({
          data: { ...data, ...updates },
          isDirty: true,
        })
      },

      reset: () => {
        set({
          currentStep: 1,
          data: { ...INITIAL_USER_STORY },
          isDirty: false,
        })
      },

      isStepComplete: (step: number): boolean => {
        const { data } = get()

        switch (step) {
          case 1:
            // Basic Info: storyId, epic, title, priority required
            return !!(
              data.storyId &&
              data.epic &&
              data.title &&
              data.priority
            )
          case 2:
            // Story Statement: role, feature, benefit required
            return !!(
              data.storyStatement.role &&
              data.storyStatement.feature &&
              data.storyStatement.benefit
            )
          case 3:
            // Acceptance Criteria: at least one complete criterion
            return data.acceptanceCriteria.length > 0 &&
              data.acceptanceCriteria.some(
                (ac) => ac.scenario && ac.given && ac.when && ac.then
              )
          case 4:
            // Definition of Done: has items (always has defaults)
            return data.definitionOfDone.length > 0
          case 5:
            // Related Items: optional, always complete
            return true
          case 6:
            // Review: always complete (just viewing)
            return true
          default:
            return false
        }
      },

      addAcceptanceCriterion: (criterion: Omit<AcceptanceCriterion, 'id'>) => {
        const { data } = get()
        const newCriterion: AcceptanceCriterion = {
          ...criterion,
          id: `ac-${++acIdCounter}`,
        }
        set({
          data: {
            ...data,
            acceptanceCriteria: [...data.acceptanceCriteria, newCriterion],
          },
          isDirty: true,
        })
      },

      removeAcceptanceCriterion: (id: string) => {
        const { data } = get()
        set({
          data: {
            ...data,
            acceptanceCriteria: data.acceptanceCriteria.filter((ac) => ac.id !== id),
          },
          isDirty: true,
        })
      },

      updateAcceptanceCriterion: (id: string, updates: Partial<AcceptanceCriterion>) => {
        const { data } = get()
        set({
          data: {
            ...data,
            acceptanceCriteria: data.acceptanceCriteria.map((ac) =>
              ac.id === id ? { ...ac, ...updates } : ac
            ),
          },
          isDirty: true,
        })
      },

      toggleDoDItem: (id: string) => {
        const { data } = get()
        set({
          data: {
            ...data,
            definitionOfDone: data.definitionOfDone.map((item) =>
              item.id === id ? { ...item, completed: !item.completed } : item
            ),
          },
          isDirty: true,
        })
      },

      addDoDItem: (description: string) => {
        const { data } = get()
        set({
          data: {
            ...data,
            definitionOfDone: [
              ...data.definitionOfDone,
              { id: `dod-${++dodIdCounter}`, description, completed: false },
            ],
          },
          isDirty: true,
        })
      },

      removeDoDItem: (id: string) => {
        const { data } = get()
        set({
          data: {
            ...data,
            definitionOfDone: data.definitionOfDone.filter((item) => item.id !== id),
          },
          isDirty: true,
        })
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
      name: 'user-story-wizard-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        data: state.data,
      }),
    }
  )
)
