import type { DocumentSection } from '@/stores/guided-creator-store'

export interface ParsedAIResponse {
  type: 'draft_proposal' | 'question' | 'advice' | 'error'
  section?: DocumentSection
  content?: Record<string, unknown>
  display: string
  question?: string
  hints?: string[]
  actions?: ('accept' | 'edit' | 'regenerate' | 'skip')[]
  suggestedAction?: 'next_section' | 'save_draft' | 'submit_review'
}

export interface RetryConfig {
  maxAttempts: number
  delayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
}

/**
 * Parse raw AI response text into structured format.
 * Attempts JSON extraction first, falls back to plain text.
 */
export function parseAIResponse(raw: string): ParsedAIResponse {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        type: parsed.type || 'question',
        section: parsed.section,
        content: parsed.content,
        display: parsed.display || parsed.question || raw,
        question: parsed.question,
        hints: parsed.hints,
        actions: parsed.actions,
        suggestedAction: parsed.suggestedAction,
      }
    } catch {
      // Fall through to plain text
    }
  }

  return {
    type: 'question',
    display: raw,
  }
}

/**
 * Validate that a parsed response has all required fields for its type.
 */
export function validateParsedResponse(response: ParsedAIResponse): boolean {
  switch (response.type) {
    case 'draft_proposal':
      return !!response.section && !!response.content && !!response.display
    case 'question':
      return !!response.display
    case 'advice':
      return !!response.display && !!response.suggestedAction
    case 'error':
      return !!response.display
    default:
      return true
  }
}

/**
 * Parse AI response with automatic retry on malformed output.
 * Retries up to maxAttempts with stricter prompts each time.
 */
export async function parseAIResponseWithRetry(
  raw: string,
  regenerateFn: (stricterPrompt: string) => Promise<string>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<ParsedAIResponse> {
  let lastError: Error | null = null
  let attempt = 0
  let currentResponse = raw

  while (attempt < config.maxAttempts) {
    try {
      const parsed = parseAIResponse(currentResponse)

      if (!validateParsedResponse(parsed)) {
        throw new Error('Response missing required fields')
      }

      return parsed
    } catch (error) {
      lastError = error as Error
      attempt++

      if (attempt < config.maxAttempts) {
        await sleep(config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1))

        const stricterPrompt = getStricterPrompt(attempt, lastError.message)
        currentResponse = await regenerateFn(stricterPrompt)
      }
    }
  }

  return {
    type: 'error',
    display: `I had trouble processing that. Here's what I got: "${raw.slice(0, 200)}..."`,
    question: 'Could you rephrase your request?',
    actions: ['regenerate'],
  }
}

function getStricterPrompt(attempt: number, previousError: string): string {
  const prompts = [
    `Your previous response was not valid JSON. Please respond ONLY with a JSON object in this exact format:
{
  "type": "question" | "draft_proposal" | "advice",
  "display": "text to show user",
  "section": "section_name",
  ...
}`,
    `CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.
Previous error: ${previousError}
Start your response with { and end with }`,
  ]

  return prompts[Math.min(attempt - 1, prompts.length - 1)]
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
