import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Section definitions for Business Rules
export type BRSection =
  | 'basicInfo'
  | 'description'
  | 'ruleStatement'
  | 'exceptions'
  | 'examples'
  | 'metadata'

// Section definitions for User Stories
export type USSection =
  | 'basicInfo'
  | 'storyStatement'
  | 'acceptanceCriteria'
  | 'definitionOfDone'
  | 'relatedItems'

// Union type for all sections
export type DocumentSection = BRSection | USSection

export type SectionStatus = 'not_started' | 'in_progress' | 'draft' | 'complete'

export interface SectionState {
  status: SectionStatus
  completionPercent: number
  content: Record<string, unknown>
  lastUpdated: string | null
  aiDraft: string | null
  userAccepted: boolean
}

export interface ConversationMessage {
  id: string
  role: 'ai' | 'user' | 'system'
  content: string
  timestamp: string
  sectionContext?: DocumentSection
  actionRequired?: 'accept' | 'edit' | 'answer'
  draftContent?: Record<string, unknown>
}

// Section weights for completion calculation
const SECTION_WEIGHTS = {
  business_rule: {
    basicInfo: 15,
    description: 15,
    ruleStatement: 30,
    exceptions: 15,
    examples: 15,
    metadata: 10,
  },
  user_story: {
    basicInfo: 15,
    storyStatement: 30,
    acceptanceCriteria: 25,
    definitionOfDone: 15,
    relatedItems: 15,
  },
}

const createInitialSections = (docType: 'business_rule' | 'user_story'): Record<DocumentSection, SectionState> => {
  const sections = docType === 'business_rule'
    ? ['basicInfo', 'description', 'ruleStatement', 'exceptions', 'examples', 'metadata']
    : ['basicInfo', 'storyStatement', 'acceptanceCriteria', 'definitionOfDone', 'relatedItems']

  return sections.reduce((acc, section) => {
    acc[section as DocumentSection] = {
      status: 'not_started',
      completionPercent: 0,
      content: {},
      lastUpdated: null,
      aiDraft: null,
      userAccepted: false,
    }
    return acc
  }, {} as Record<DocumentSection, SectionState>)
}

export interface GuidedCreatorState {
  // Document metadata
  documentType: 'business_rule' | 'user_story'
  documentId: string | null
  documentStatus: 'draft' | 'complete'

  // BR-to-US soft link
  sourceBusinessRuleId?: string
  sourceBusinessRuleName?: string

  // Section states
  sections: Record<DocumentSection, SectionState>
  currentSection: DocumentSection

  // Conversation
  messages: ConversationMessage[]
  conversationSummary: string | null
  isAiThinking: boolean
  isManualEditBlocked: boolean

  // Overall progress
  overallCompletion: number
  canSaveDraft: boolean
  isReadyForReview: boolean

  // Session management
  lastSessionSummary: string | null
  sessionStartedAt: string

  // Actions
  initSession: (docType: 'business_rule' | 'user_story') => void
  resumeSession: (documentId: string) => void
  addMessage: (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => void
  updateSection: (section: DocumentSection, content: Partial<SectionState>) => void
  acceptDraft: (section: DocumentSection) => void
  undoLastChange: () => void
  editSection: (section: DocumentSection) => void
  navigateToSection: (section: DocumentSection) => void
  calculateCompletion: () => void
  summarizeConversation: () => Promise<void>
  setDocumentStatus: (status: 'draft' | 'complete') => void
  setAiThinking: (thinking: boolean) => void
  reset: () => void
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useGuidedCreatorStore = create<GuidedCreatorState>()(
  persist(
    (set, get) => ({
      // Initial state
      documentType: 'business_rule',
      documentId: null,
      documentStatus: 'draft',
      sourceBusinessRuleId: undefined,
      sourceBusinessRuleName: undefined,
      sections: createInitialSections('business_rule'),
      currentSection: 'basicInfo' as DocumentSection,
      messages: [],
      conversationSummary: null,
      isAiThinking: false,
      isManualEditBlocked: false,
      overallCompletion: 0,
      canSaveDraft: true,
      isReadyForReview: false,
      lastSessionSummary: null,
      sessionStartedAt: new Date().toISOString(),

      // Actions
      initSession: (docType) => {
        set({
          documentType: docType,
          documentId: null,
          documentStatus: 'draft',
          sections: createInitialSections(docType),
          currentSection: 'basicInfo',
          messages: [],
          conversationSummary: null,
          isAiThinking: false,
          isManualEditBlocked: false,
          overallCompletion: 0,
          canSaveDraft: true,
          isReadyForReview: false,
          sessionStartedAt: new Date().toISOString(),
        })
      },

      resumeSession: (documentId) => {
        // Would load from database - placeholder for now
        set({ documentId })
      },

      addMessage: (message) => {
        const newMessage: ConversationMessage = {
          ...message,
          id: generateId(),
          timestamp: new Date().toISOString(),
        }
        set((state) => ({
          messages: [...state.messages, newMessage],
        }))
      },

      updateSection: (section, content) => {
        set((state) => ({
          sections: {
            ...state.sections,
            [section]: {
              ...state.sections[section],
              ...content,
              lastUpdated: new Date().toISOString(),
            },
          },
        }))
      },

      acceptDraft: (section) => {
        const state = get()
        // Find the last AI message with draft content for this section
        const lastDraftMessage = [...state.messages]
          .reverse()
          .find(m => m.role === 'ai' && m.sectionContext === section && m.draftContent)

        if (lastDraftMessage?.draftContent) {
          set((state) => ({
            sections: {
              ...state.sections,
              [section]: {
                ...state.sections[section],
                content: lastDraftMessage.draftContent,
                userAccepted: true,
                status: 'draft',
                lastUpdated: new Date().toISOString(),
              },
            },
          }))
        }
      },

      undoLastChange: () => {
        // Placeholder - would implement undo stack
      },

      editSection: (section) => {
        set((state) => ({
          currentSection: section,
          sections: {
            ...state.sections,
            [section]: {
              ...state.sections[section],
              status: 'in_progress',
            },
          },
        }))
      },

      navigateToSection: (section) => {
        set({ currentSection: section })
      },

      calculateCompletion: () => {
        const state = get()
        const weights = SECTION_WEIGHTS[state.documentType]
        let totalWeightedScore = 0
        let totalWeight = 0

        for (const [section, weight] of Object.entries(weights)) {
          const sectionState = state.sections[section as DocumentSection]
          if (sectionState) {
            totalWeight += weight
            totalWeightedScore += (sectionState.completionPercent / 100) * weight
          }
        }

        const overallCompletion = totalWeight > 0
          ? Math.round((totalWeightedScore / totalWeight) * 100)
          : 0

        set({
          overallCompletion,
          isReadyForReview: overallCompletion >= 80,
        })
      },

      summarizeConversation: async () => {
        // Placeholder - would call AI to summarize
        const state = get()
        if (state.messages.length > 20) {
          // Would trigger summarization
        }
      },

      setDocumentStatus: (status) => {
        set({ documentStatus: status })
      },

      setAiThinking: (thinking) => {
        set({
          isAiThinking: thinking,
          isManualEditBlocked: thinking,
        })
      },

      reset: () => {
        set({
          documentType: 'business_rule',
          documentId: null,
          documentStatus: 'draft',
          sourceBusinessRuleId: undefined,
          sourceBusinessRuleName: undefined,
          sections: createInitialSections('business_rule'),
          currentSection: 'basicInfo',
          messages: [],
          conversationSummary: null,
          isAiThinking: false,
          isManualEditBlocked: false,
          overallCompletion: 0,
          canSaveDraft: true,
          isReadyForReview: false,
          lastSessionSummary: null,
          sessionStartedAt: new Date().toISOString(),
        })
      },
    }),
    {
      name: 'guided-creator-storage',
      partialize: (state) => ({
        documentType: state.documentType,
        documentId: state.documentId,
        documentStatus: state.documentStatus,
        sections: state.sections,
        currentSection: state.currentSection,
        messages: state.messages,
        overallCompletion: state.overallCompletion,
      }),
    }
  )
)
