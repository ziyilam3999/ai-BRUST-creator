import { describe, it, expect, beforeEach } from 'vitest'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import type { ConversionAnalysis, GeneratedStory } from '@/stores/guided-creator-store'
import type { UserStoryData } from '@/types/user-story'
import { INITIAL_USER_STORY } from '@/types/user-story'

describe('Guided Creator Store - Conversion', () => {
  beforeEach(() => {
    useGuidedCreatorStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have conversion mode as none', () => {
      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.mode).toBe('none')
    })

    it('should have null analysis initially', () => {
      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.analysis).toBeNull()
    })

    it('should have empty converted stories initially', () => {
      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.convertedStories).toEqual([])
    })
  })

  describe('startConversion', () => {
    it('should set mode to analyzing', () => {
      const analysis: ConversionAnalysis = {
        shouldSplit: true,
        suggestedCount: 2,
        reasoning: ['Multiple personas'],
        proposedStories: [
          { title: 'Story 1', rationale: 'Test', estimatedSize: 'M' },
        ],
      }

      useGuidedCreatorStore.getState().startConversion(analysis)
      const state = useGuidedCreatorStore.getState()

      expect(state.conversion.mode).toBe('analyzing')
      expect(state.conversion.analysis).toEqual(analysis)
    })

    it('should clear any previous error', () => {
      useGuidedCreatorStore.getState().setConversionError('Previous error')
      useGuidedCreatorStore.getState().startConversion({
        shouldSplit: false,
        suggestedCount: 1,
        reasoning: [],
        proposedStories: [],
      })

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.error).toBeNull()
    })
  })

  // Helper to create minimal GeneratedStory for older tests
  const makeMinimalStory = (id: string, overrides: Partial<UserStoryData> = {}): GeneratedStory => ({
    id,
    data: { ...INITIAL_USER_STORY, ...overrides },
    status: 'draft',
    conversationHistory: [],
  })

  describe('setConvertedStories', () => {
    it('should store converted stories', () => {
      const stories = [
        makeMinimalStory('s1', { storyId: 'US-001', title: 'Test Story 1' }),
        makeMinimalStory('s2', { storyId: 'US-002', title: 'Test Story 2' }),
      ]

      useGuidedCreatorStore.getState().setConvertedStories(stories)
      const state = useGuidedCreatorStore.getState()

      expect(state.conversion.convertedStories).toEqual(stories)
      expect(state.conversion.mode).toBe('complete')
    })

    it('should reset selected index to 0', () => {
      useGuidedCreatorStore.getState().selectConvertedStory(2)
      useGuidedCreatorStore.getState().setConvertedStories([makeMinimalStory('s1')])

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.selectedStoryIndex).toBe(0)
    })
  })

  describe('selectConvertedStory', () => {
    it('should update selected story index', () => {
      useGuidedCreatorStore.getState().setConvertedStories([
        makeMinimalStory('s1'),
        makeMinimalStory('s2'),
        makeMinimalStory('s3'),
      ])
      useGuidedCreatorStore.getState().selectConvertedStory(2)

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.selectedStoryIndex).toBe(2)
    })
  })

  describe('resetConversion', () => {
    it('should reset all conversion state', () => {
      // Set up some conversion state
      useGuidedCreatorStore.getState().startConversion({
        shouldSplit: true,
        suggestedCount: 2,
        reasoning: ['Test'],
        proposedStories: [],
      })
      useGuidedCreatorStore.getState().setConvertedStories([makeMinimalStory('s1')])

      // Reset
      useGuidedCreatorStore.getState().resetConversion()

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.mode).toBe('none')
      expect(state.conversion.analysis).toBeNull()
      expect(state.conversion.convertedStories).toEqual([])
      expect(state.conversion.error).toBeNull()
    })
  })

  describe('setConversionError', () => {
    it('should set error and reset mode', () => {
      useGuidedCreatorStore.getState().setConversionMode('converting')
      useGuidedCreatorStore.getState().setConversionError('Network error')

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.error).toBe('Network error')
      expect(state.conversion.mode).toBe('none')
    })

    it('should clear error when set to null', () => {
      useGuidedCreatorStore.getState().setConversionError('Some error')
      useGuidedCreatorStore.getState().setConversionError(null)

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.error).toBeNull()
    })
  })

  describe('setConversionMode', () => {
    it('should update conversion mode', () => {
      useGuidedCreatorStore.getState().setConversionMode('converting')
      expect(useGuidedCreatorStore.getState().conversion.mode).toBe('converting')

      useGuidedCreatorStore.getState().setConversionMode('complete')
      expect(useGuidedCreatorStore.getState().conversion.mode).toBe('complete')
    })
  })

  describe('GeneratedStory per-story actions', () => {
    const makeStory = (overrides: Partial<UserStoryData> = {}): UserStoryData => ({
      ...INITIAL_USER_STORY,
      storyId: 'US-TEST-001',
      title: 'Test Story',
      ...overrides,
    })

    const makeGenerated = (id: string, data?: Partial<UserStoryData>): GeneratedStory => ({
      id,
      data: makeStory(data),
      status: 'draft',
      conversationHistory: [],
    })

    it('should accept a generated story by id', () => {
      const stories = [makeGenerated('s1'), makeGenerated('s2')]
      useGuidedCreatorStore.getState().setConvertedStories(stories)
      useGuidedCreatorStore.getState().acceptStory('s1')

      const state = useGuidedCreatorStore.getState()
      const s1 = state.conversion.convertedStories.find((s: GeneratedStory) => s.id === 's1')
      expect(s1?.status).toBe('accepted')
    })

    it('should set a story to editing mode', () => {
      const stories = [makeGenerated('s1')]
      useGuidedCreatorStore.getState().setConvertedStories(stories)
      useGuidedCreatorStore.getState().editStory('s1')

      const state = useGuidedCreatorStore.getState()
      const s1 = state.conversion.convertedStories.find((s: GeneratedStory) => s.id === 's1')
      expect(s1?.status).toBe('editing')
      expect(state.conversion.currentEditingStory).toBe('s1')
    })

    it('should update a story data by id', () => {
      const stories = [makeGenerated('s1', { title: 'Original' })]
      useGuidedCreatorStore.getState().setConvertedStories(stories)
      useGuidedCreatorStore.getState().updateStory('s1', { title: 'Updated' })

      const state = useGuidedCreatorStore.getState()
      const s1 = state.conversion.convertedStories.find((s: GeneratedStory) => s.id === 's1')
      expect(s1?.data.title).toBe('Updated')
    })

    it('should delete a story by id', () => {
      const stories = [makeGenerated('s1'), makeGenerated('s2')]
      useGuidedCreatorStore.getState().setConvertedStories(stories)
      useGuidedCreatorStore.getState().deleteStory('s1')

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.convertedStories).toHaveLength(1)
      expect(state.conversion.convertedStories[0].id).toBe('s2')
    })

    it('should add a manual story with draft status', () => {
      useGuidedCreatorStore.getState().setConvertedStories([])
      useGuidedCreatorStore.getState().addManualStory()

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.convertedStories).toHaveLength(1)
      expect(state.conversion.convertedStories[0].status).toBe('draft')
      expect(state.conversion.convertedStories[0].id).toBeTruthy()
    })

    it('should track currentEditingStory and clear on accept', () => {
      const stories = [makeGenerated('s1')]
      useGuidedCreatorStore.getState().setConvertedStories(stories)
      useGuidedCreatorStore.getState().editStory('s1')
      expect(useGuidedCreatorStore.getState().conversion.currentEditingStory).toBe('s1')

      useGuidedCreatorStore.getState().acceptStory('s1')
      expect(useGuidedCreatorStore.getState().conversion.currentEditingStory).toBeNull()
    })
  })

  describe('session reset includes conversion', () => {
    it('should reset conversion when initSession is called', () => {
      useGuidedCreatorStore.getState().setConvertedStories([makeMinimalStory('s1')])
      useGuidedCreatorStore.getState().initSession('user_story')

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.mode).toBe('none')
      expect(state.conversion.convertedStories).toEqual([])
    })

    it('should reset conversion when reset is called', () => {
      useGuidedCreatorStore.getState().setConvertedStories([makeMinimalStory('s1')])
      useGuidedCreatorStore.getState().reset()

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.mode).toBe('none')
    })
  })
})
