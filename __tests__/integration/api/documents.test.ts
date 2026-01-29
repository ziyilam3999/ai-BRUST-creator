import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock database - create chainable mock that is also awaitable
const createChainableMock = (result: unknown) => {
  const mock: Record<string, unknown> = {
    // Make the mock itself awaitable (thenable)
    then: <T>(resolve?: ((value: unknown) => T) | null) =>
      Promise.resolve(result).then(resolve ?? ((v) => v as T)),
  }
  const methods = ['from', 'where', 'orderBy', 'values', 'set', 'returning']
  methods.forEach((method) => {
    mock[method] = vi.fn(() => mock)
  })
  return mock
}

const mockDb = {
  select: vi.fn(() => createChainableMock([])),
  insert: vi.fn(() =>
    createChainableMock([
      {
        id: 'doc_123',
        documentId: 'BR-VAL-ABC123',
        documentType: 'business_rule',
        title: 'Test',
        status: 'draft',
        version: 1,
      },
    ])
  ),
  update: vi.fn(() => createChainableMock([{ id: 'doc_123' }])),
  delete: vi.fn(() => createChainableMock(undefined)),
}

vi.mock('@/lib/db', () => ({
  db: mockDb,
  documents: { userId: 'userId', deletedAt: 'deletedAt', id: 'id' },
}))

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()
  return {
    ...actual,
    eq: vi.fn((a, b) => ({ field: a, value: b })),
    and: vi.fn((...args) => args),
    desc: vi.fn((field) => ({ desc: field })),
    isNull: vi.fn((field) => ({ isNull: field })),
  }
})

import { getServerSession } from 'next-auth'

describe('Documents API', () => {
  const mockSession = {
    user: { id: 'user_123', name: 'Test User', email: 'test@example.com' },
    expires: '2026-02-28',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/documents', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import('@/app/api/documents/route')
      const request = new NextRequest('http://localhost:3000/api/documents')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return documents for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { GET } = await import('@/app/api/documents/route')
      const request = new NextRequest('http://localhost:3000/api/documents')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toBeDefined()
      expect(Array.isArray(json.data)).toBe(true)
    })

    it('should filter by document type', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { GET } = await import('@/app/api/documents/route')
      const request = new NextRequest(
        'http://localhost:3000/api/documents?type=business_rule'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should filter by status', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { GET } = await import('@/app/api/documents/route')
      const request = new NextRequest(
        'http://localhost:3000/api/documents?status=draft'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/documents', () => {
    const validDocument = {
      documentType: 'business_rule',
      title: 'Test Business Rule',
      content: {
        ruleId: 'BR-VAL-001',
        ruleName: 'Test Rule',
        category: 'validation',
        priority: 'high',
        description: 'Test description',
        ruleStatement: {
          if: 'condition',
          then: 'action',
        },
        exceptions: [],
        examples: [],
        relatedRules: [],
        source: '',
        owner: '',
        effectiveDate: '',
        version: '1.0',
        status: 'draft',
      },
    }

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import('@/app/api/documents/route')
      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify(validDocument),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create document for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/documents/route')
      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify(validDocument),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.data.id).toBeDefined()
    })

    it('should return 400 for invalid document type', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/documents/route')
      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify({ ...validDocument, documentType: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for missing title', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/documents/route')
      const { title, ...docWithoutTitle } = validDocument
      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify(docWithoutTitle),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should generate document ID for new documents', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/documents/route')
      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify(validDocument),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.data.documentId).toMatch(/^BR-/)
    })
  })
})

describe('Document by ID API', () => {
  const mockSession = {
    user: { id: 'user_123', name: 'Test User', email: 'test@example.com' },
    expires: '2026-02-28',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/documents/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import('@/app/api/documents/[id]/route')
      const request = new NextRequest(
        'http://localhost:3000/api/documents/doc_123'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'doc_123' }) })

      expect(response.status).toBe(401)
    })

    it('should return 404 for non-existent document', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { GET } = await import('@/app/api/documents/[id]/route')
      const request = new NextRequest(
        'http://localhost:3000/api/documents/nonexistent'
      )
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/documents/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { PUT } = await import('@/app/api/documents/[id]/route')
      const request = new NextRequest(
        'http://localhost:3000/api/documents/doc_123',
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated Title' }),
          headers: { 'Content-Type': 'application/json' },
        }
      )
      const response = await PUT(request, { params: Promise.resolve({ id: 'doc_123' }) })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/documents/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { DELETE } = await import('@/app/api/documents/[id]/route')
      const request = new NextRequest(
        'http://localhost:3000/api/documents/doc_123',
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc_123' }) })

      expect(response.status).toBe(401)
    })

    it('should soft delete document for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      // Mock select to return existing document for existence check
      const existingDoc = { id: 'doc_123', userId: 'user_123', title: 'Test' }
      mockDb.select.mockReturnValueOnce(createChainableMock([existingDoc]))

      const { DELETE } = await import('@/app/api/documents/[id]/route')
      const request = new NextRequest(
        'http://localhost:3000/api/documents/doc_123',
        { method: 'DELETE' }
      )
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc_123' }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.deleted).toBe(true)
    })
  })
})
