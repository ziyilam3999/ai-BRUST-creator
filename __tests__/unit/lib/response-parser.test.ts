import { describe, it, expect, vi } from 'vitest'

describe('AI Response Parser', () => {
  describe('parseAIResponse', () => {
    it('should parse valid JSON draft_proposal response', async () => {
      const { parseAIResponse } = await import('@/lib/ai/response-parser')
      const raw = JSON.stringify({
        type: 'draft_proposal',
        section: 'basicInfo',
        content: { ruleId: 'BR-001', ruleName: 'Validation Rule' },
        display: 'Here is a draft for Basic Information.',
        actions: ['accept', 'edit', 'regenerate'],
      })

      const result = parseAIResponse(raw)
      expect(result.type).toBe('draft_proposal')
      expect(result.section).toBe('basicInfo')
      expect(result.content).toEqual({ ruleId: 'BR-001', ruleName: 'Validation Rule' })
      expect(result.display).toBe('Here is a draft for Basic Information.')
      expect(result.actions).toEqual(['accept', 'edit', 'regenerate'])
    })

    it('should parse valid JSON question response', async () => {
      const { parseAIResponse } = await import('@/lib/ai/response-parser')
      const raw = JSON.stringify({
        type: 'question',
        display: 'What category does this rule belong to?',
        hints: ['Data Validation', 'Authorization', 'Calculation'],
      })

      const result = parseAIResponse(raw)
      expect(result.type).toBe('question')
      expect(result.display).toBe('What category does this rule belong to?')
      expect(result.hints).toEqual(['Data Validation', 'Authorization', 'Calculation'])
    })

    it('should parse advice response with suggestedAction', async () => {
      const { parseAIResponse } = await import('@/lib/ai/response-parser')
      const raw = JSON.stringify({
        type: 'advice',
        display: 'Your rule is looking good!',
        suggestedAction: 'next_section',
      })

      const result = parseAIResponse(raw)
      expect(result.type).toBe('advice')
      expect(result.suggestedAction).toBe('next_section')
    })

    it('should extract JSON embedded in surrounding text', async () => {
      const { parseAIResponse } = await import('@/lib/ai/response-parser')
      const raw = 'Here is my response:\n{"type":"question","display":"What is the rule name?"}\nLet me know!'

      const result = parseAIResponse(raw)
      expect(result.type).toBe('question')
      expect(result.display).toBe('What is the rule name?')
    })

    it('should fallback to plain text when no JSON found', async () => {
      const { parseAIResponse } = await import('@/lib/ai/response-parser')
      const raw = 'This is a plain text response without any JSON.'

      const result = parseAIResponse(raw)
      expect(result.type).toBe('question')
      expect(result.display).toBe(raw)
    })

    it('should fallback to plain text on malformed JSON', async () => {
      const { parseAIResponse } = await import('@/lib/ai/response-parser')
      const raw = '{"type": "question", "display": "broken...'

      const result = parseAIResponse(raw)
      expect(result.type).toBe('question')
      expect(result.display).toBe(raw)
    })

    it('should default type to question when type is missing', async () => {
      const { parseAIResponse } = await import('@/lib/ai/response-parser')
      const raw = JSON.stringify({ display: 'No type field here' })

      const result = parseAIResponse(raw)
      expect(result.type).toBe('question')
    })
  })

  describe('validateParsedResponse', () => {
    it('should validate draft_proposal requires section, content, display', async () => {
      const { validateParsedResponse } = await import('@/lib/ai/response-parser')

      expect(validateParsedResponse({
        type: 'draft_proposal',
        section: 'basicInfo',
        content: { ruleId: 'BR-001' },
        display: 'Draft ready',
      })).toBe(true)

      expect(validateParsedResponse({
        type: 'draft_proposal',
        display: 'Missing section and content',
      })).toBe(false)
    })

    it('should validate question requires display', async () => {
      const { validateParsedResponse } = await import('@/lib/ai/response-parser')

      expect(validateParsedResponse({
        type: 'question',
        display: 'What is the rule?',
      })).toBe(true)

      expect(validateParsedResponse({
        type: 'question',
        display: '',
      })).toBe(false)
    })

    it('should validate advice requires display and suggestedAction', async () => {
      const { validateParsedResponse } = await import('@/lib/ai/response-parser')

      expect(validateParsedResponse({
        type: 'advice',
        display: 'Good progress!',
        suggestedAction: 'next_section',
      })).toBe(true)

      expect(validateParsedResponse({
        type: 'advice',
        display: 'Missing suggested action',
      })).toBe(false)
    })

    it('should accept error type with any display', async () => {
      const { validateParsedResponse } = await import('@/lib/ai/response-parser')

      expect(validateParsedResponse({
        type: 'error',
        display: 'Something went wrong',
      })).toBe(true)
    })
  })

  describe('parseAIResponseWithRetry', () => {
    it('should return parsed response on first success', async () => {
      const { parseAIResponseWithRetry } = await import('@/lib/ai/response-parser')
      const raw = JSON.stringify({
        type: 'question',
        display: 'What category?',
      })

      const regenerateFn = vi.fn()
      const result = await parseAIResponseWithRetry(raw, regenerateFn)

      expect(result.type).toBe('question')
      expect(result.display).toBe('What category?')
      expect(regenerateFn).not.toHaveBeenCalled()
    })

    it('should retry on invalid response and succeed', async () => {
      const { parseAIResponseWithRetry } = await import('@/lib/ai/response-parser')

      // First response is invalid draft_proposal (missing section/content)
      const badRaw = JSON.stringify({ type: 'draft_proposal', display: 'Incomplete' })

      // Retry returns valid response
      const goodResponse = JSON.stringify({
        type: 'question',
        display: 'Let me ask again: what is the rule?',
      })

      const regenerateFn = vi.fn().mockResolvedValue(goodResponse)
      const result = await parseAIResponseWithRetry(badRaw, regenerateFn, {
        maxAttempts: 3,
        delayMs: 10,
        backoffMultiplier: 1,
      })

      expect(result.type).toBe('question')
      expect(result.display).toBe('Let me ask again: what is the rule?')
      expect(regenerateFn).toHaveBeenCalledTimes(1)
    })

    it('should return error fallback after all retries fail', async () => {
      const { parseAIResponseWithRetry } = await import('@/lib/ai/response-parser')

      // All responses are invalid draft_proposals
      const badRaw = JSON.stringify({ type: 'draft_proposal', display: 'Incomplete' })
      const regenerateFn = vi.fn().mockResolvedValue(badRaw)

      const result = await parseAIResponseWithRetry(badRaw, regenerateFn, {
        maxAttempts: 2,
        delayMs: 10,
        backoffMultiplier: 1,
      })

      expect(result.type).toBe('error')
      expect(result.display).toContain('trouble processing')
      expect(result.actions).toContain('regenerate')
    })

    it('should pass stricter prompts on each retry', async () => {
      const { parseAIResponseWithRetry } = await import('@/lib/ai/response-parser')

      const badRaw = JSON.stringify({ type: 'draft_proposal', display: 'Incomplete' })
      const regenerateFn = vi.fn().mockResolvedValue(badRaw)

      await parseAIResponseWithRetry(badRaw, regenerateFn, {
        maxAttempts: 3,
        delayMs: 10,
        backoffMultiplier: 1,
      })

      expect(regenerateFn).toHaveBeenCalledTimes(2)
      // Each retry should receive a stricter prompt string
      const firstPrompt = regenerateFn.mock.calls[0][0]
      const secondPrompt = regenerateFn.mock.calls[1][0]
      expect(typeof firstPrompt).toBe('string')
      expect(typeof secondPrompt).toBe('string')
      expect(firstPrompt).toContain('JSON')
    })
  })
})
