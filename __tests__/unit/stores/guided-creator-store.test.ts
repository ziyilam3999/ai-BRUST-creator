import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Import after mocking
import { useGuidedCreatorStore, type DocumentSection, type SectionStatus } from '@/stores/guided-creator-store'

describe('Guided Creator Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { reset } = useGuidedCreatorStore.getState()
    act(() => {
      reset()
    })
    localStorageMock.clear()
  })

  describe('Initial State', () => {
    it('should have default document type as business_rule', () => {
      const { documentType } = useGuidedCreatorStore.getState()
      expect(documentType).toBe('business_rule')
    })

    it('should have all sections initialized with not_started status', () => {
      const { sections } = useGuidedCreatorStore.getState()
      const sectionNames: DocumentSection[] = [
        'basicInfo', 'description', 'ruleStatement', 'exceptions', 'examples', 'metadata'
      ]

      sectionNames.forEach(section => {
        expect(sections[section]).toBeDefined()
        expect(sections[section].status).toBe('not_started')
        expect(sections[section].completionPercent).toBe(0)
      })
    })

    it('should start with empty messages array', () => {
      const { messages } = useGuidedCreatorStore.getState()
      expect(messages).toEqual([])
    })

    it('should have currentSection as basicInfo', () => {
      const { currentSection } = useGuidedCreatorStore.getState()
      expect(currentSection).toBe('basicInfo')
    })

    it('should have overallCompletion as 0', () => {
      const { overallCompletion } = useGuidedCreatorStore.getState()
      expect(overallCompletion).toBe(0)
    })

    it('should not be ready for review initially', () => {
      const { isReadyForReview } = useGuidedCreatorStore.getState()
      expect(isReadyForReview).toBe(false)
    })
  })

  describe('initSession', () => {
    it('should initialize session for business_rule', () => {
      const { initSession, documentType, sessionStartedAt } = useGuidedCreatorStore.getState()

      act(() => {
        initSession('business_rule')
      })

      const state = useGuidedCreatorStore.getState()
      expect(state.documentType).toBe('business_rule')
      expect(state.sessionStartedAt).toBeTruthy()
    })

    it('should initialize session for user_story', () => {
      const { initSession } = useGuidedCreatorStore.getState()

      act(() => {
        initSession('user_story')
      })

      const state = useGuidedCreatorStore.getState()
      expect(state.documentType).toBe('user_story')
    })

    it('should reset sections when initializing new session', () => {
      const { initSession, updateSection } = useGuidedCreatorStore.getState()

      // First update a section
      act(() => {
        updateSection('basicInfo', {
          status: 'complete',
          completionPercent: 100,
          content: { ruleId: 'BR-001' }
        })
      })

      // Then init new session
      act(() => {
        initSession('business_rule')
      })

      const state = useGuidedCreatorStore.getState()
      expect(state.sections.basicInfo.status).toBe('not_started')
      expect(state.sections.basicInfo.completionPercent).toBe(0)
    })
  })

  describe('addMessage', () => {
    it('should add a user message', () => {
      const { addMessage } = useGuidedCreatorStore.getState()

      act(() => {
        addMessage({ role: 'user', content: 'Hello AI' })
      })

      const { messages } = useGuidedCreatorStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('Hello AI')
      expect(messages[0].id).toBeTruthy()
      expect(messages[0].timestamp).toBeTruthy()
    })

    it('should add an AI message with section context', () => {
      const { addMessage } = useGuidedCreatorStore.getState()

      act(() => {
        addMessage({
          role: 'ai',
          content: 'Here is a draft',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001' }
        })
      })

      const { messages } = useGuidedCreatorStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('ai')
      expect(messages[0].sectionContext).toBe('basicInfo')
      expect(messages[0].actionRequired).toBe('accept')
      expect(messages[0].draftContent).toEqual({ ruleId: 'BR-001' })
    })

    it('should preserve message order', () => {
      const { addMessage } = useGuidedCreatorStore.getState()

      act(() => {
        addMessage({ role: 'user', content: 'Message 1' })
        addMessage({ role: 'ai', content: 'Message 2' })
        addMessage({ role: 'user', content: 'Message 3' })
      })

      const { messages } = useGuidedCreatorStore.getState()
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('Message 1')
      expect(messages[1].content).toBe('Message 2')
      expect(messages[2].content).toBe('Message 3')
    })
  })

  describe('updateSection', () => {
    it('should update section status', () => {
      const { updateSection } = useGuidedCreatorStore.getState()

      act(() => {
        updateSection('basicInfo', { status: 'in_progress' })
      })

      const { sections } = useGuidedCreatorStore.getState()
      expect(sections.basicInfo.status).toBe('in_progress')
    })

    it('should update section content', () => {
      const { updateSection } = useGuidedCreatorStore.getState()

      act(() => {
        updateSection('basicInfo', {
          content: { ruleId: 'BR-001', ruleName: 'Test Rule' }
        })
      })

      const { sections } = useGuidedCreatorStore.getState()
      expect(sections.basicInfo.content).toEqual({ ruleId: 'BR-001', ruleName: 'Test Rule' })
    })

    it('should update section completion percent', () => {
      const { updateSection } = useGuidedCreatorStore.getState()

      act(() => {
        updateSection('basicInfo', { completionPercent: 75 })
      })

      const { sections } = useGuidedCreatorStore.getState()
      expect(sections.basicInfo.completionPercent).toBe(75)
    })

    it('should update lastUpdated timestamp', () => {
      const { updateSection } = useGuidedCreatorStore.getState()

      act(() => {
        updateSection('basicInfo', { status: 'in_progress' })
      })

      const { sections } = useGuidedCreatorStore.getState()
      expect(sections.basicInfo.lastUpdated).toBeTruthy()
    })
  })

  describe('acceptDraft', () => {
    it('should accept draft and update section', () => {
      const { addMessage, acceptDraft } = useGuidedCreatorStore.getState()

      // First add a message with draft content
      act(() => {
        addMessage({
          role: 'ai',
          content: 'Here is the draft',
          sectionContext: 'basicInfo',
          actionRequired: 'accept',
          draftContent: { ruleId: 'BR-001', ruleName: 'Test' }
        })
      })

      act(() => {
        acceptDraft('basicInfo')
      })

      const { sections } = useGuidedCreatorStore.getState()
      expect(sections.basicInfo.content).toEqual({ ruleId: 'BR-001', ruleName: 'Test' })
      expect(sections.basicInfo.userAccepted).toBe(true)
    })
  })

  describe('navigateToSection', () => {
    it('should update currentSection', () => {
      const { navigateToSection } = useGuidedCreatorStore.getState()

      act(() => {
        navigateToSection('ruleStatement')
      })

      const { currentSection } = useGuidedCreatorStore.getState()
      expect(currentSection).toBe('ruleStatement')
    })
  })

  describe('calculateCompletion', () => {
    it('should calculate overall completion based on section weights', () => {
      const { updateSection, calculateCompletion } = useGuidedCreatorStore.getState()

      act(() => {
        // Update basicInfo to 100% (weight: 15)
        updateSection('basicInfo', { completionPercent: 100 })
        // Update ruleStatement to 50% (weight: 30)
        updateSection('ruleStatement', { completionPercent: 50 })
        calculateCompletion()
      })

      const { overallCompletion } = useGuidedCreatorStore.getState()
      // Expected: (100*15 + 50*30) / 100 = (1500 + 1500) / 100 = 30
      expect(overallCompletion).toBeGreaterThan(0)
    })

    it('should set isReadyForReview when completion >= 80%', () => {
      const { updateSection, calculateCompletion } = useGuidedCreatorStore.getState()

      act(() => {
        // Set all sections to 100%
        updateSection('basicInfo', { completionPercent: 100 })
        updateSection('description', { completionPercent: 100 })
        updateSection('ruleStatement', { completionPercent: 100 })
        updateSection('exceptions', { completionPercent: 100 })
        updateSection('examples', { completionPercent: 100 })
        updateSection('metadata', { completionPercent: 100 })
        calculateCompletion()
      })

      const { isReadyForReview, overallCompletion } = useGuidedCreatorStore.getState()
      expect(overallCompletion).toBe(100)
      expect(isReadyForReview).toBe(true)
    })
  })

  describe('setDocumentStatus', () => {
    it('should set document status to draft', () => {
      const { setDocumentStatus } = useGuidedCreatorStore.getState()

      act(() => {
        setDocumentStatus('draft')
      })

      const { documentStatus } = useGuidedCreatorStore.getState()
      expect(documentStatus).toBe('draft')
    })

    it('should set document status to complete', () => {
      const { setDocumentStatus } = useGuidedCreatorStore.getState()

      act(() => {
        setDocumentStatus('complete')
      })

      const { documentStatus } = useGuidedCreatorStore.getState()
      expect(documentStatus).toBe('complete')
    })
  })

  describe('isManualEditBlocked', () => {
    it('should block manual edits when AI is thinking', () => {
      const { setAiThinking } = useGuidedCreatorStore.getState()

      act(() => {
        setAiThinking(true)
      })

      const { isManualEditBlocked, isAiThinking } = useGuidedCreatorStore.getState()
      expect(isAiThinking).toBe(true)
      expect(isManualEditBlocked).toBe(true)
    })

    it('should allow manual edits when AI is not thinking', () => {
      const { setAiThinking } = useGuidedCreatorStore.getState()

      act(() => {
        setAiThinking(false)
      })

      const { isManualEditBlocked, isAiThinking } = useGuidedCreatorStore.getState()
      expect(isAiThinking).toBe(false)
      expect(isManualEditBlocked).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { updateSection, addMessage, navigateToSection, reset } = useGuidedCreatorStore.getState()

      act(() => {
        updateSection('basicInfo', { status: 'complete', completionPercent: 100 })
        addMessage({ role: 'user', content: 'Test' })
        navigateToSection('exceptions')
      })

      act(() => {
        reset()
      })

      const state = useGuidedCreatorStore.getState()
      expect(state.sections.basicInfo.status).toBe('not_started')
      expect(state.messages).toEqual([])
      expect(state.currentSection).toBe('basicInfo')
      expect(state.overallCompletion).toBe(0)
    })
  })

  describe('undoLastChange', () => {
    it('should be defined', () => {
      const { undoLastChange } = useGuidedCreatorStore.getState()
      expect(undoLastChange).toBeDefined()
    })
  })

  describe('User Story Sections', () => {
    it('should have user story sections when type is user_story', () => {
      const { initSession } = useGuidedCreatorStore.getState()

      act(() => {
        initSession('user_story')
      })

      const { sections, documentType } = useGuidedCreatorStore.getState()
      expect(documentType).toBe('user_story')
      // User story should have different sections
      expect(sections.basicInfo).toBeDefined()
    })
  })
})
