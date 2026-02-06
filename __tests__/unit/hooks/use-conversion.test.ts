import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock store actions
const mockStartConversion = vi.fn()
const mockSetConvertedStories = vi.fn()
const mockSetConversionError = vi.fn()
const mockSetConversionMode = vi.fn()

const mockStoreState = {
  conversion: { error: null },
  startConversion: mockStartConversion,
  setConvertedStories: mockSetConvertedStories,
  setConversionError: mockSetConversionError,
  setConversionMode: mockSetConversionMode,
}

vi.mock('@/stores/guided-creator-store', () => ({
  useGuidedCreatorStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState)
    }
    return mockStoreState
  }),
}))

import { useConversion } from '@/hooks/use-conversion'

const mockBusinessRule = {
  ruleId: 'BR-001',
  ruleName: 'Test Rule',
  description: 'Test description',
  category: 'validation' as const,
  priority: 'high' as const,
  ruleStatement: { if: 'condition', then: 'action' },
  exceptions: [],
  examples: [],
  relatedRules: [],
  source: '',
  owner: '',
  effectiveDate: '',
  version: '1.0',
  status: 'draft' as const,
}

describe('useConversion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('analyze', () => {
    it('should call API and pass analysis to store on success', async () => {
      const analysis = { shouldSplit: true, suggestedCount: 3, reasoning: ['r1'], proposedStories: [] }
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ type: 'analysis', analysis }),
      })

      const { result } = renderHook(() => useConversion())

      await act(async () => {
        await result.current.analyze(mockBusinessRule)
      })

      expect(mockSetConversionMode).toHaveBeenCalledWith('analyzing')
      expect(mockStartConversion).toHaveBeenCalledWith(analysis)
      expect(result.current.isLoading).toBe(false)
    })

    it('should set error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Server error' } }),
      })

      const { result } = renderHook(() => useConversion())

      await act(async () => {
        await result.current.analyze(mockBusinessRule)
      })

      expect(mockSetConversionError).toHaveBeenCalledWith('Server error')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('convert', () => {
    it('should map UserStoryData[] into GeneratedStory[] wrapper objects', async () => {
      const storyData = [
        {
          storyId: 'US-001',
          title: 'Story 1',
          epic: '',
          priority: 'must' as const,
          storyStatement: { role: 'user', feature: 'login', benefit: 'access' },
          acceptanceCriteria: [],
          definitionOfDone: [],
          notes: '',
        },
        {
          storyId: 'US-002',
          title: 'Story 2',
          epic: '',
          priority: 'should' as const,
          storyStatement: { role: 'admin', feature: 'manage', benefit: 'control' },
          acceptanceCriteria: [],
          definitionOfDone: [],
          notes: '',
        },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ type: 'conversion', stories: storyData }),
      })

      const { result } = renderHook(() => useConversion())

      await act(async () => {
        await result.current.convert(mockBusinessRule, { storyCount: 2 })
      })

      expect(mockSetConversionMode).toHaveBeenCalledWith('converting')
      expect(mockSetConvertedStories).toHaveBeenCalledTimes(1)

      const stories = mockSetConvertedStories.mock.calls[0][0]
      expect(stories).toHaveLength(2)

      // Each item should be a GeneratedStory wrapper
      expect(stories[0]).toMatchObject({
        data: storyData[0],
        status: 'draft',
        conversationHistory: [],
      })
      expect(stories[1]).toMatchObject({
        data: storyData[1],
        status: 'draft',
        conversationHistory: [],
      })

      // IDs should be unique and have the expected format
      expect(stories[0].id).toMatch(/^converted-\d+-0$/)
      expect(stories[1].id).toMatch(/^converted-\d+-1$/)
    })

    it('should set error on conversion API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Conversion failed' } }),
      })

      const { result } = renderHook(() => useConversion())

      await act(async () => {
        await result.current.convert(mockBusinessRule)
      })

      expect(mockSetConversionError).toHaveBeenCalledWith('Conversion failed')
      expect(mockSetConvertedStories).not.toHaveBeenCalled()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useConversion())

      await act(async () => {
        await result.current.convert(mockBusinessRule)
      })

      expect(mockSetConversionError).toHaveBeenCalledWith('Network error')
    })

    it('should pass forceSplit and options to API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ type: 'conversion', stories: [] }),
      })

      const { result } = renderHook(() => useConversion())

      await act(async () => {
        await result.current.convert(mockBusinessRule, { storyCount: 3 })
      })

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(fetchBody.options).toEqual({ forceSplit: true, storyCount: 3 })
    })
  })
})
