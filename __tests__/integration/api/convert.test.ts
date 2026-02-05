import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { BusinessRuleData } from '@/types/business-rule'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Test data factory
function createTestBR(overrides: Partial<BusinessRuleData> = {}): BusinessRuleData {
  return {
    ruleId: 'BR-001',
    ruleName: 'Order Validation Rule',
    category: 'validation',
    priority: 'high',
    description: 'Validates order data before processing',
    ruleStatement: {
      if: 'customer submits order',
      then: 'validate order items and calculate total',
      else: 'reject order with error message',
    },
    exceptions: [],
    examples: [],
    relatedRules: [],
    source: 'Product Requirements',
    owner: 'Order Team',
    effectiveDate: '2026-01-01',
    version: '1.0',
    status: 'approved',
    ...overrides,
  }
}

describe('Convert API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/ai/convert', () => {
    it('should return 401 if not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import('@/app/api/ai/convert/route')

      const request = new NextRequest('http://localhost/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessRule: createTestBR() }),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 400 if business rule is missing', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'test-user' },
        expires: '2026-12-31',
      })

      const { POST } = await import('@/app/api/ai/convert/route')

      const request = new NextRequest('http://localhost/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return analysis when no forceSplit option', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'test-user' },
        expires: '2026-12-31',
      })

      const { POST } = await import('@/app/api/ai/convert/route')

      const request = new NextRequest('http://localhost/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessRule: createTestBR() }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.type).toBe('analysis')
      expect(data.analysis).toBeDefined()
      expect(data.analysis.shouldSplit).toBeDefined()
      expect(data.analysis.suggestedCount).toBeDefined()
      expect(data.analysis.reasoning).toBeInstanceOf(Array)
    })

    it('should return converted stories when forceSplit is true', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'test-user' },
        expires: '2026-12-31',
      })

      const { POST } = await import('@/app/api/ai/convert/route')

      const request = new NextRequest('http://localhost/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessRule: createTestBR(),
          options: { forceSplit: true },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.type).toBe('conversion')
      expect(data.stories).toBeInstanceOf(Array)
      expect(data.stories.length).toBeGreaterThan(0)
      expect(data.sourceRuleId).toBe('BR-001')
    })

    it('should respect storyCount option', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'test-user' },
        expires: '2026-12-31',
      })

      const { POST } = await import('@/app/api/ai/convert/route')

      const request = new NextRequest('http://localhost/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessRule: createTestBR(),
          options: { forceSplit: true, storyCount: 3 },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.stories).toHaveLength(3)
    })

    it('should link stories back to source BR', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'test-user' },
        expires: '2026-12-31',
      })

      const { POST } = await import('@/app/api/ai/convert/route')

      const request = new NextRequest('http://localhost/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessRule: createTestBR({ ruleId: 'BR-123' }),
          options: { forceSplit: true },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.stories[0].relatedItems).toContain('BR-123')
    })

    it('should generate unique story IDs for multiple stories', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'test-user' },
        expires: '2026-12-31',
      })

      const { POST } = await import('@/app/api/ai/convert/route')

      const request = new NextRequest('http://localhost/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessRule: createTestBR(),
          options: { forceSplit: true, storyCount: 2 },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.stories[0].storyId).not.toBe(data.stories[1].storyId)
    })

    it('should map priority from BR to US', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'test-user' },
        expires: '2026-12-31',
      })

      const { POST } = await import('@/app/api/ai/convert/route')

      const request = new NextRequest('http://localhost/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessRule: createTestBR({ priority: 'critical' }),
          options: { forceSplit: true },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.stories[0].priority).toBe('must')
    })
  })
})
