import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { authOptions } from '@/lib/auth/auth-options'
import { GUIDED_SYSTEM_PROMPT, SECTION_PROMPTS } from '@/lib/ai/guided-prompts'
import { sanitizeUserInput } from '@/lib/ai/input-sanitizer'

interface GuidedRequest {
  documentType: 'business_rule' | 'user_story'
  currentSection: string
  sectionContent?: Record<string, unknown>
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  userInput: string
  action?: 'start' | 'continue' | 'regenerate' | 'edit'
}

/**
 * In-memory rate limiter for development.
 * In production, replace with Redis-based rate limiter (e.g. @upstash/ratelimit).
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; limit: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, limit: RATE_LIMIT_MAX, resetAt: now + RATE_LIMIT_WINDOW_MS }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, limit: RATE_LIMIT_MAX, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, limit: RATE_LIMIT_MAX, resetAt: entry.resetAt }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit check — fail-open in dev so a broken limiter doesn't block all requests.
  // In production, replace with Redis-based limiter and fail-closed (remove try-catch).
  try {
    const rateLimit = checkRateLimit(session.user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      )
    }
  } catch (rateLimitError) {
    console.warn('Rate limiter failed, allowing request:', rateLimitError)
  }

  try {
    const body: GuidedRequest = await request.json()
    const { documentType, currentSection, sectionContent, conversationHistory, userInput, action } = body

    // Validate required fields
    if (!documentType || !currentSection || !userInput) {
      return NextResponse.json(
        { error: 'Missing required fields: documentType, currentSection, userInput' },
        { status: 400 }
      )
    }

    // Validate documentType
    if (!['business_rule', 'user_story'].includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid documentType. Must be "business_rule" or "user_story"' },
        { status: 400 }
      )
    }

    // Cap conversation history to prevent abuse (client sends slice(-20), but server enforces its own limit)
    const safeHistory = (conversationHistory || []).slice(-25)

    // Sanitize user input
    const sanitizedInput = sanitizeUserInput(userInput)

    // Build context-aware system prompt
    let systemPrompt = GUIDED_SYSTEM_PROMPT
    systemPrompt += `\n\nDocument Type: ${documentType}`
    systemPrompt += `\nCurrent Section: ${currentSection}`

    if (sectionContent && Object.keys(sectionContent).length > 0) {
      systemPrompt += `\nSection Content So Far: ${JSON.stringify(sectionContent)}`
    }

    // Add section-specific guidance
    const prompts = SECTION_PROMPTS[documentType] as Record<string, { initial: string; followUp: (input: string) => string }> | undefined
    const sectionGuide = prompts?.[currentSection]
    if (sectionGuide) {
      systemPrompt += `\n\nSection Guidance:\n${sectionGuide.initial}`
    }

    // Add action-specific context
    if (action === 'regenerate') {
      systemPrompt += '\n\nThe user wants you to regenerate your previous draft. Create a new version with a different approach.'
    } else if (action === 'edit') {
      systemPrompt += '\n\nThe user wants to edit the current draft. Apply their requested changes.'
    }

    // Build message array from conversation history + new input
    const messages = [
      ...safeHistory,
      { role: 'user' as const, content: sanitizedInput },
    ]

    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages,
      maxTokens: 2048,
    })

    // Return the raw AI text — the client hook reads it with response.text()
    // and parses it as JSON (the AI is instructed to return structured JSON).
    return new NextResponse(result.text, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in guided creation:', error)
    return NextResponse.json(
      { error: 'Failed to process guided creation request' },
      { status: 500 }
    )
  }
}
