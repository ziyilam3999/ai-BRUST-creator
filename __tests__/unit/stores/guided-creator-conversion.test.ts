import { describe, it, expect, beforeEach } from 'vitest'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import type { ConversionAnalysis } from '@/stores/guided-creator-store'

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

  describe('setConvertedStories', () => {
    it('should store converted stories', () => {
      const stories = [
        { storyId: 'US-001', title: 'Test Story 1' },
        { storyId: 'US-002', title: 'Test Story 2' },
      ]

      useGuidedCreatorStore.getState().setConvertedStories(stories)
      const state = useGuidedCreatorStore.getState()

      expect(state.conversion.convertedStories).toEqual(stories)
      expect(state.conversion.mode).toBe('complete')
    })

    it('should reset selected index to 0', () => {
      useGuidedCreatorStore.getState().selectConvertedStory(2)
      useGuidedCreatorStore.getState().setConvertedStories([{ id: 1 }])

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.selectedStoryIndex).toBe(0)
    })
  })

  describe('selectConvertedStory', () => {
    it('should update selected story index', () => {
      useGuidedCreatorStore.getState().setConvertedStories([
        { id: 1 },
        { id: 2 },
        { id: 3 },
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
      useGuidedCreatorStore.getState().setConvertedStories([{ id: 1 }])

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

  describe('session reset includes conversion', () => {
    it('should reset conversion when initSession is called', () => {
      useGuidedCreatorStore.getState().setConvertedStories([{ id: 1 }])
      useGuidedCreatorStore.getState().initSession('user_story')

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.mode).toBe('none')
      expect(state.conversion.convertedStories).toEqual([])
    })

    it('should reset conversion when reset is called', () => {
      useGuidedCreatorStore.getState().setConvertedStories([{ id: 1 }])
      useGuidedCreatorStore.getState().reset()

      const state = useGuidedCreatorStore.getState()
      expect(state.conversion.mode).toBe('none')
    })
  })
})
