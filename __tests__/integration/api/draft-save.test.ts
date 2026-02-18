/**
 * draft-save.test.ts
 * D3: Integration tests for POST + GET /api/documents/draft
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock the DB
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelect }) }) }),
    update: () => ({ set: () => ({ where: mockUpdate }) }),
    insert: () => ({ values: mockInsert }),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  documents: { userId: 'userId', documentId: 'documentId', id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => `eq(${String(_col)},${String(_val)})`),
  and: vi.fn((...args: unknown[]) => args.join('&&')),
}))

describe('Draft Save API (D3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/documents/draft', () => {
    it('returns 401 when not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import('@/app/api/documents/draft/route')
      const req = new NextRequest('http://localhost/api/documents/draft', {
        method: 'POST',
        body: JSON.stringify({ sections: {}, conversationHistory: [] }),
      })

      const response = await POST(req)
      expect(response.status).toBe(401)
    })

    it('creates a new draft when none exists for the user', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-001', name: 'Test', email: 't@test.com' },
        expires: '2099',
      })

      // No existing draft
      mockSelect.mockResolvedValue([])
      mockInsert.mockResolvedValue(undefined)

      const { POST } = await import('@/app/api/documents/draft/route')
      const req = new NextRequest('http://localhost/api/documents/draft', {
        method: 'POST',
        body: JSON.stringify({
          sections: { basicInfo: { status: 'draft' } },
          conversationHistory: [],
          documentType: 'business_rule',
        }),
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const body = await response.json() as { draftId: string; updatedAt: string }
      expect(typeof body.draftId).toBe('string')
      expect(typeof body.updatedAt).toBe('string')
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('updates existing draft when one already exists for the user', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-001', name: 'Test', email: 't@test.com' },
        expires: '2099',
      })

      // Existing draft
      mockSelect.mockResolvedValue([{ id: 'existing-draft-id' }])
      mockUpdate.mockResolvedValue(undefined)

      const { POST } = await import('@/app/api/documents/draft/route')
      const req = new NextRequest('http://localhost/api/documents/draft', {
        method: 'POST',
        body: JSON.stringify({
          sections: { basicInfo: { status: 'complete' } },
          conversationHistory: [],
          documentType: 'business_rule',
        }),
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      const body = await response.json() as { draftId: string }
      expect(body.draftId).toBe('existing-draft-id')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/documents/draft', () => {
    it('returns 401 when not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import('@/app/api/documents/draft/route')
      const req = new NextRequest('http://localhost/api/documents/draft')

      const response = await GET(req)
      expect(response.status).toBe(401)
    })

    it('returns 404 when no draft exists', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-001', name: 'Test', email: 't@test.com' },
        expires: '2099',
      })

      mockSelect.mockResolvedValue([])

      const { GET } = await import('@/app/api/documents/draft/route')
      const req = new NextRequest('http://localhost/api/documents/draft')

      const response = await GET(req)
      expect(response.status).toBe(404)
    })
  })
})
