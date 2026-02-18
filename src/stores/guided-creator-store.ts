import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserStoryData } from '@/types/user-story'
import { INITIAL_USER_STORY } from '@/types/user-story'
import { getCompletionAdvice } from '@/lib/guided/advice-engine'
import { createUndoManager } from '@/lib/guided/undo-stack'

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

// Conversion types for BR-to-US
export type ConversionMode = 'none' | 'analyzing' | 'converting' | 'complete'

export interface ProposedStory {
  title: string
  rationale: string
  estimatedSize: 'XS' | 'S' | 'M' | 'L' | 'XL'
}

export interface ConversionAnalysis {
  shouldSplit: boolean
  suggestedCount: number
  reasoning: string[]
  proposedStories: ProposedStory[]
}

export interface GeneratedStory {
  id: string
  data: UserStoryData
  status: 'draft' | 'accepted' | 'editing'
  conversationHistory: ConversationMessage[]
}

export interface ConversionState {
  mode: ConversionMode
  analysis: ConversionAnalysis | null
  convertedStories: GeneratedStory[]
  selectedStoryIndex: number
  currentEditingStory: string | null
  error: string | null
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

// Publish suggestion state (Plan §13.5)
export interface PublishSuggestionState {
  showSuggestion: boolean
  dismissed: boolean
  remindLater: boolean
  remindAt: string | null
  publishedUrl: string | null
}

const INITIAL_PUBLISH_STATE: PublishSuggestionState = {
  showSuggestion: false,
  dismissed: false,
  remindLater: false,
  remindAt: null,
  publishedUrl: null,
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

  // Conversion state (BR-to-US)
  conversion: ConversionState

  // Publish suggestion state (Plan §13.5)
  publishSuggestion: PublishSuggestionState

  // AI stream error state (Plan §B5)
  lastAiError: string | null

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
  setAiError: (error: string | null) => void
  clearAiError: () => void
  reset: () => void

  // Conversion actions
  startConversion: (analysis: ConversionAnalysis) => void
  setConvertedStories: (stories: GeneratedStory[]) => void
  selectConvertedStory: (index: number) => void
  resetConversion: () => void
  setConversionError: (error: string | null) => void
  setConversionMode: (mode: ConversionMode) => void

  // Per-story actions (Plan §12.5)
  acceptStory: (storyId: string) => void
  editStory: (storyId: string) => void
  updateStory: (storyId: string, data: Partial<UserStoryData>) => void
  deleteStory: (storyId: string) => void
  addManualStory: () => void

  // Publish suggestion actions (Plan §13.5)
  showPublishSuggestion: () => void
  dismissPublishSuggestion: () => void
  setRemindLater: (remindAt: string) => void
  setPublished: (url: string) => void

  // Auto-save recovery action (Plan §B2)
  restoreFromAutoSave: (snapshot: Record<string, unknown>) => void

  // Redo action (Plan §C2)
  redoLastChange: () => void
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

// C2: Module-level undo manager for section content changes (not persisted)
type SectionsSnapshot = Record<DocumentSection, SectionState>
const _undoMgr = createUndoManager<SectionsSnapshot>()

const INITIAL_CONVERSION_STATE: ConversionState = {
  mode: 'none',
  analysis: null,
  convertedStories: [],
  selectedStoryIndex: 0,
  currentEditingStory: null,
  error: null,
}

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
      canSaveDraft: false,
      isReadyForReview: false,
      lastSessionSummary: null,
      sessionStartedAt: new Date().toISOString(),
      conversion: INITIAL_CONVERSION_STATE,
      publishSuggestion: INITIAL_PUBLISH_STATE,
      lastAiError: null,

      // Actions
      initSession: (docType) => {
        _undoMgr.clear()
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
          canSaveDraft: false,
          isReadyForReview: false,
          sessionStartedAt: new Date().toISOString(),
          conversion: INITIAL_CONVERSION_STATE,
          publishSuggestion: INITIAL_PUBLISH_STATE,
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
        const before = get().sections
        set((state) => {
          const after: SectionsSnapshot = {
            ...state.sections,
            [section]: {
              ...state.sections[section],
              ...content,
              lastUpdated: new Date().toISOString(),
            },
          }
          _undoMgr.push(before, after)
          return { sections: after }
        })
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
        const prev = _undoMgr.undo()
        if (prev) set({ sections: prev })
      },

      redoLastChange: () => {
        const next = _undoMgr.redo()
        if (next) set({ sections: next })
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

        const advice = getCompletionAdvice(overallCompletion)
        set({
          overallCompletion,
          canSaveDraft: advice.canSave,
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

      // B5: AI stream error tracking
      setAiError: (error) => set({ lastAiError: error }),
      clearAiError: () => set({ lastAiError: null }),

      reset: () => {
        _undoMgr.clear()
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
          canSaveDraft: false,
          isReadyForReview: false,
          lastSessionSummary: null,
          sessionStartedAt: new Date().toISOString(),
          conversion: INITIAL_CONVERSION_STATE,
          publishSuggestion: INITIAL_PUBLISH_STATE,
          lastAiError: null,
        })
      },

      // Conversion actions
      startConversion: (analysis) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            mode: 'analyzing',
            analysis,
            error: null,
          },
        }))
      },

      setConvertedStories: (stories) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            mode: 'complete',
            convertedStories: stories,
            selectedStoryIndex: 0,
          },
        }))
      },

      selectConvertedStory: (index) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            selectedStoryIndex: index,
          },
        }))
      },

      resetConversion: () => {
        set({ conversion: INITIAL_CONVERSION_STATE })
      },

      setConversionError: (error) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            mode: 'none',
            error,
          },
        }))
      },

      setConversionMode: (mode) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            mode,
          },
        }))
      },

      // Per-story actions (Plan §12.5)
      acceptStory: (storyId) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            convertedStories: state.conversion.convertedStories.map((s) =>
              s.id === storyId ? { ...s, status: 'accepted' as const } : s
            ),
            currentEditingStory: state.conversion.currentEditingStory === storyId
              ? null
              : state.conversion.currentEditingStory,
          },
        }))
      },

      editStory: (storyId) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            convertedStories: state.conversion.convertedStories.map((s) =>
              s.id === storyId ? { ...s, status: 'editing' as const } : s
            ),
            currentEditingStory: storyId,
          },
        }))
      },

      updateStory: (storyId, data) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            convertedStories: state.conversion.convertedStories.map((s) =>
              s.id === storyId ? { ...s, data: { ...s.data, ...data } } : s
            ),
          },
        }))
      },

      deleteStory: (storyId) => {
        set((state) => ({
          conversion: {
            ...state.conversion,
            convertedStories: state.conversion.convertedStories.filter((s) => s.id !== storyId),
            currentEditingStory: state.conversion.currentEditingStory === storyId
              ? null
              : state.conversion.currentEditingStory,
          },
        }))
      },

      // Publish suggestion actions (Plan §13.5)
      showPublishSuggestion: () => {
        set((state) => ({
          publishSuggestion: {
            ...state.publishSuggestion,
            showSuggestion: !state.publishSuggestion.dismissed,
          },
        }))
      },

      dismissPublishSuggestion: () => {
        set({
          publishSuggestion: {
            showSuggestion: false,
            dismissed: true,
            remindLater: false,
            remindAt: null,
            publishedUrl: null,
          },
        })
      },

      setRemindLater: (remindAt) => {
        set((state) => ({
          publishSuggestion: {
            ...state.publishSuggestion,
            showSuggestion: false,
            remindLater: true,
            remindAt,
          },
        }))
      },

      setPublished: (url) => {
        set((state) => ({
          publishSuggestion: {
            ...state.publishSuggestion,
            showSuggestion: false,
            publishedUrl: url,
          },
        }))
      },

      // B2: Restore state from auto-save snapshot (shallow merge of serialisable fields)
      restoreFromAutoSave: (snapshot) => {
        const allowed = ['documentType', 'documentId', 'documentStatus', 'sections',
          'currentSection', 'messages', 'conversationSummary', 'overallCompletion',
          'sourceBusinessRuleId', 'sourceBusinessRuleName', 'publishSuggestion'] as const
        const patch: Record<string, unknown> = {}
        for (const key of allowed) {
          if (key in snapshot) patch[key] = snapshot[key]
        }
        set(patch as Partial<GuidedCreatorState>)
      },

      addManualStory: () => {
        const id = `manual-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        set((state) => ({
          conversion: {
            ...state.conversion,
            convertedStories: [
              ...state.conversion.convertedStories,
              {
                id,
                data: { ...INITIAL_USER_STORY },
                status: 'draft' as const,
                conversationHistory: [],
              },
            ],
          },
        }))
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
        conversion: state.conversion,
        publishSuggestion: state.publishSuggestion,
      }),
    }
  )
)
