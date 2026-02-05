'use client'

import { useCallback, useState } from 'react'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import type { BusinessRuleData } from '@/types/business-rule'
import type { UserStoryData } from '@/types/user-story'

interface ConversionOptions {
  forceSplit?: boolean
  storyCount?: number
}

interface UseConversionReturn {
  analyze: (businessRule: BusinessRuleData) => Promise<void>
  convert: (businessRule: BusinessRuleData, options?: ConversionOptions) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useConversion(): UseConversionReturn {
  const [isLoading, setIsLoading] = useState(false)
  const {
    startConversion,
    setConvertedStories,
    setConversionError,
    setConversionMode,
  } = useGuidedCreatorStore()

  const analyze = useCallback(async (businessRule: BusinessRuleData) => {
    setIsLoading(true)
    setConversionMode('analyzing')

    try {
      const response = await fetch('/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessRule }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to analyze business rule')
      }

      const data = await response.json()

      if (data.type === 'analysis') {
        startConversion(data.analysis)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setConversionError(message)
    } finally {
      setIsLoading(false)
    }
  }, [startConversion, setConversionError, setConversionMode])

  const convert = useCallback(async (
    businessRule: BusinessRuleData,
    options: ConversionOptions = {}
  ) => {
    setIsLoading(true)
    setConversionMode('converting')

    try {
      const response = await fetch('/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessRule,
          options: {
            forceSplit: true,
            ...options,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to convert business rule')
      }

      const data = await response.json()

      if (data.type === 'conversion') {
        setConvertedStories(data.stories as UserStoryData[])
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setConversionError(message)
    } finally {
      setIsLoading(false)
    }
  }, [setConvertedStories, setConversionError, setConversionMode])

  const error = useGuidedCreatorStore((state) => state.conversion.error)

  return {
    analyze,
    convert,
    isLoading,
    error,
  }
}
