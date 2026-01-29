import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { authOptions } from '@/lib/auth/auth-options'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  context?: {
    documentType?: 'business_rule' | 'user_story'
    currentStep?: number
    wizardData?: Record<string, unknown>
  }
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
    const body: ChatRequest = await request.json()
    const { messages, context } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Messages are required' } },
        { status: 400 }
      )
    }

    // Select appropriate system prompt based on context
    let systemPrompt = SYSTEM_PROMPTS.general
    if (context?.documentType === 'business_rule') {
      systemPrompt = SYSTEM_PROMPTS.business_rule
    } else if (context?.documentType === 'user_story') {
      systemPrompt = SYSTEM_PROMPTS.user_story
    }

    // Add wizard context if available
    if (context?.wizardData) {
      systemPrompt += `\n\nCurrent wizard data:\n${JSON.stringify(context.wizardData, null, 2)}`
    }

    if (context?.currentStep) {
      systemPrompt += `\n\nUser is currently on step ${context.currentStep} of the wizard.`
    }

    const result = await streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      maxTokens: 2048,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process chat request' } },
      { status: 500 }
    )
  }
}
