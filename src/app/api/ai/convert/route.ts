import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import type { BusinessRuleData } from '@/types/business-rule'
import { analyzeForUserStories } from '@/lib/guided/br-to-us-analyzer'
import { mapBRtoUS } from '@/lib/guided/br-to-us-mapper'

interface ConvertRequest {
  businessRule: BusinessRuleData
  options?: {
    forceSplit?: boolean
    storyCount?: number
  }
}

interface AnalysisResponse {
  type: 'analysis'
  analysis: {
    shouldSplit: boolean
    suggestedCount: number
    reasoning: string[]
    proposedStories: Array<{
      title: string
      rationale: string
      estimatedSize: string
    }>
  }
}

interface ConversionResponse {
  type: 'conversion'
  stories: ReturnType<typeof mapBRtoUS>[]
  sourceRuleId: string
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const body: ConvertRequest = await request.json()
    const { businessRule, options } = body

    if (!businessRule || !businessRule.ruleId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Business rule data is required' } },
        { status: 400 }
      )
    }

    // Analyze the BR for splitting
    const analysis = analyzeForUserStories(businessRule)

    // If just analyzing (no forceSplit specified), return analysis
    if (options?.forceSplit === undefined) {
      const response: AnalysisResponse = {
        type: 'analysis',
        analysis: {
          shouldSplit: analysis.shouldSplit,
          suggestedCount: analysis.suggestedCount,
          reasoning: analysis.reasoning,
          proposedStories: analysis.proposedStories.map((s) => ({
            title: s.title,
            rationale: s.rationale,
            estimatedSize: s.estimatedSize,
          })),
        },
      }
      return NextResponse.json(response)
    }

    // Perform conversion
    const storyCount = options.storyCount ?? analysis.suggestedCount
    const stories = []

    for (let i = 0; i < storyCount; i++) {
      const story = mapBRtoUS(businessRule, i, storyCount)
      stories.push(story)
    }

    const response: ConversionResponse = {
      type: 'conversion',
      stories,
      sourceRuleId: businessRule.ruleId,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in BR-to-US conversion:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to convert business rule' } },
      { status: 500 }
    )
  }
}
