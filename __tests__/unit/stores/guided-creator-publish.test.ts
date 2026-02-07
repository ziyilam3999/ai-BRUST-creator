import { describe, it, expect, beforeEach } from 'vitest'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'

describe('Guided Creator Store - Publish Suggestion', () => {
  beforeEach(() => {
    useGuidedCreatorStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have publish suggestion hidden initially', () => {
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.showSuggestion).toBe(false)
    })

    it('should have publish suggestion not dismissed initially', () => {
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.dismissed).toBe(false)
    })

    it('should have no published URL initially', () => {
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.publishedUrl).toBeNull()
    })
  })

  describe('showPublishSuggestion', () => {
    it('should set showSuggestion to true', () => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.showSuggestion).toBe(true)
    })

    it('should not show if already dismissed', () => {
      useGuidedCreatorStore.getState().dismissPublishSuggestion()
      useGuidedCreatorStore.getState().showPublishSuggestion()
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.showSuggestion).toBe(false)
    })
  })

  describe('dismissPublishSuggestion', () => {
    it('should hide suggestion and mark dismissed', () => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      useGuidedCreatorStore.getState().dismissPublishSuggestion()
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.showSuggestion).toBe(false)
      expect(state.publishSuggestion.dismissed).toBe(true)
    })
  })

  describe('setRemindLater', () => {
    it('should hide suggestion and store remind timestamp', () => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      const remindAt = new Date(Date.now() + 3600000).toISOString()
      useGuidedCreatorStore.getState().setRemindLater(remindAt)
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.showSuggestion).toBe(false)
      expect(state.publishSuggestion.remindLater).toBe(true)
      expect(state.publishSuggestion.remindAt).toBe(remindAt)
    })
  })

  describe('setPublished', () => {
    it('should store published URL and hide suggestion', () => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      useGuidedCreatorStore.getState().setPublished('https://confluence.example.com/page/123')
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.publishedUrl).toBe('https://confluence.example.com/page/123')
      expect(state.publishSuggestion.showSuggestion).toBe(false)
    })
  })

  describe('reset includes publish suggestion', () => {
    it('should reset publish suggestion on reset', () => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      useGuidedCreatorStore.getState().setPublished('https://example.com')
      useGuidedCreatorStore.getState().reset()
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.showSuggestion).toBe(false)
      expect(state.publishSuggestion.publishedUrl).toBeNull()
      expect(state.publishSuggestion.dismissed).toBe(false)
    })

    it('should reset publish suggestion on initSession', () => {
      useGuidedCreatorStore.getState().showPublishSuggestion()
      useGuidedCreatorStore.getState().initSession('user_story')
      const state = useGuidedCreatorStore.getState()
      expect(state.publishSuggestion.showSuggestion).toBe(false)
    })
  })
})
