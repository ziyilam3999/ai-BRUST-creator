import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock AI SDK
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-model'),
}))

import { getServerSession } from 'next-auth'

describe('AI Chat API', () => {
  const mockSession = {
    user: { id: 'user_123', name: 'Test User', email: 'test@example.com' },
    expires: '2026-02-28',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/ai/chat', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import('@/app/api/ai/chat/route')
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 if messages are missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/ai/chat/route')
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 if messages is empty array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/ai/chat/route')
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should call streamText with correct parameters', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { streamText } = await import('ai')
      const mockResult = {
        toDataStreamResponse: vi.fn(() => new Response('stream')),
      }
      vi.mocked(streamText).mockResolvedValue(mockResult as never)

      const { POST } = await import('@/app/api/ai/chat/route')
      const messages = [{ role: 'user', content: 'Help me write a business rule' }]
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Help me write a business rule' }),
          ]),
        })
      )
    })

    it('should include system prompt for business rule assistance', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { streamText } = await import('ai')
      const mockResult = {
        toDataStreamResponse: vi.fn(() => new Response('stream')),
      }
      vi.mocked(streamText).mockResolvedValue(mockResult as never)

      const { POST } = await import('@/app/api/ai/chat/route')
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          context: { documentType: 'business_rule' },
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request)

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('business rule'),
        })
      )
    })

    it('should return streaming response', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { streamText } = await import('ai')
      const mockStreamResponse = new Response('data: test\n\n')
      const mockResult = {
        toDataStreamResponse: vi.fn(() => mockStreamResponse),
      }
      vi.mocked(streamText).mockResolvedValue(mockResult as never)

      const { POST } = await import('@/app/api/ai/chat/route')
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(mockResult.toDataStreamResponse).toHaveBeenCalled()
      expect(response).toBe(mockStreamResponse)
    })
  })
})

describe('AI Generate API', () => {
  const mockSession = {
    user: { id: 'user_123', name: 'Test User', email: 'test@example.com' },
    expires: '2026-02-28',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/ai/generate', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import('@/app/api/ai/generate/route')
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ wizardData: {} }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 if wizardData is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/ai/generate/route')
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should generate business rule content from wizard data', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { generateText } = await import('ai')
      vi.mocked(generateText).mockResolvedValue({
        text: 'Generated business rule content',
      } as never)

      const { POST } = await import('@/app/api/ai/generate/route')
      const wizardData = {
        ruleId: 'BR-VAL-001',
        ruleName: 'Test Rule',
        category: 'validation',
        description: 'Test description',
        ruleStatement: { if: 'condition', then: 'action' },
      }
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ wizardData, documentType: 'business_rule' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.content).toBeDefined()
    })
  })
})
