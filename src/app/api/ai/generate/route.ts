import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { authOptions } from '@/lib/auth/auth-options'
import { GENERATION_PROMPTS } from '@/lib/ai/prompts'

interface GenerateRequest {
  wizardData: Record<string, unknown>
  documentType: 'business_rule' | 'user_story'
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
    const body: GenerateRequest = await request.json()
    const { wizardData, documentType } = body

    if (!wizardData || typeof wizardData !== 'object') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Wizard data is required' } },
        { status: 400 }
      )
    }

    // Select appropriate generation prompt
    const promptFn = GENERATION_PROMPTS[documentType] || GENERATION_PROMPTS.business_rule
    const prompt = promptFn(wizardData)

    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt,
      maxTokens: 4096,
    })

    // Try to parse JSON response
    let parsedContent
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0])
      } else {
        parsedContent = { formattedRule: result.text }
      }
    } catch {
      // If parsing fails, return raw text
      parsedContent = { formattedRule: result.text }
    }

    return NextResponse.json({
      data: {
        content: parsedContent,
        raw: result.text,
        usage: {
          promptTokens: result.usage?.promptTokens,
          completionTokens: result.usage?.completionTokens,
        },
      },
    })
  } catch (error) {
    console.error('Error in AI generate:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate content' } },
      { status: 500 }
    )
  }
}
