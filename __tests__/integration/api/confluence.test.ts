import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'publish-1' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}))

// Mock Atlassian OAuth
vi.mock('@/lib/auth/atlassian-oauth', () => ({
  decryptToken: vi.fn((token: string) => `decrypted-${token}`),
  refreshAccessToken: vi.fn(() => Promise.resolve({
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    expires_in: 3600,
  })),
  encryptToken: vi.fn((token: string) => `encrypted-${token}`),
}))

import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

describe('Confluence Publishing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CONFLUENCE_SPACE_KEY', 'BRUST')
    vi.stubEnv('CONFLUENCE_PARENT_PAGE_ID', 'parent-123')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('POST /api/publish/confluence', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const { POST } = await import('@/app/api/publish/confluence/route')
      const request = new Request('http://localhost:3000/api/publish/confluence', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if documentId is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      const { POST } = await import('@/app/api/publish/confluence/route')
      const request = new Request('http://localhost:3000/api/publish/confluence', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Document ID is required')
    })

    it('should return 400 if Atlassian not connected', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      // No Atlassian connection
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never)

      const { POST } = await import('@/app/api/publish/confluence/route')
      const request = new Request('http://localhost:3000/api/publish/confluence', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Atlassian not connected')
    })

    it('should return 404 if document not found', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      // Atlassian connection exists
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'conn-1',
              cloudId: 'cloud-123',
              accessToken: 'encrypted-token',
              refreshToken: 'encrypted-refresh',
              expiresAt: new Date(Date.now() + 3600000),
            }]),
          }),
        } as never)
        // Document not found
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        } as never)

      const { POST } = await import('@/app/api/publish/confluence/route')
      const request = new Request('http://localhost:3000/api/publish/confluence', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Document not found')
    })

    it('should create new Confluence page for unpublished document', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      // Atlassian connection
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'conn-1',
              cloudId: 'cloud-123',
              accessToken: 'encrypted-token',
              refreshToken: 'encrypted-refresh',
              expiresAt: new Date(Date.now() + 3600000),
            }]),
          }),
        } as never)
        // Document exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'doc-1',
              title: 'Test BR',
              content: JSON.stringify({
                ruleId: 'BR-001',
                ruleName: 'Test Rule',
                category: 'validation',
                priority: 'high',
                description: 'Test description',
                ruleStatement: { if: 'condition', then: 'action' },
              }),
              documentType: 'business_rule',
              status: 'draft',
              version: 1,
            }]),
          }),
        } as never)
        // No existing publish record
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        } as never)

      // Mock Confluence API call
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'page-123',
          title: 'BR-001: Test Rule',
          _links: {
            webui: '/wiki/spaces/BRUST/pages/page-123',
            base: 'https://mysite.atlassian.net',
          },
        }),
      })

      const { POST } = await import('@/app/api/publish/confluence/route')
      const request = new Request('http://localhost:3000/api/publish/confluence', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.pageId).toBe('page-123')
      expect(data.pageUrl).toContain('atlassian.net')
    })

    it('should update existing Confluence page for republish', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      // Atlassian connection
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'conn-1',
              cloudId: 'cloud-123',
              accessToken: 'encrypted-token',
              refreshToken: 'encrypted-refresh',
              expiresAt: new Date(Date.now() + 3600000),
            }]),
          }),
        } as never)
        // Document exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'doc-1',
              title: 'Test BR',
              content: JSON.stringify({
                ruleId: 'BR-001',
                ruleName: 'Test Rule',
                category: 'validation',
                priority: 'high',
                description: 'Test description',
                ruleStatement: { if: 'condition', then: 'action' },
              }),
              documentType: 'business_rule',
              status: 'draft',
              version: 1,
            }]),
          }),
        } as never)
        // Existing publish record
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'publish-1',
              externalId: 'page-123',
              externalUrl: 'https://mysite.atlassian.net/wiki/spaces/BRUST/pages/page-123',
            }]),
          }),
        } as never)

      // Mock Confluence API - get current version
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            version: { number: 2 },
          }),
        })
        // Update page
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'page-123',
            title: 'BR-001: Test Rule',
            _links: {
              webui: '/wiki/spaces/BRUST/pages/page-123',
              base: 'https://mysite.atlassian.net',
            },
          }),
        })

      const { POST } = await import('@/app/api/publish/confluence/route')
      const request = new Request('http://localhost:3000/api/publish/confluence', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.updated).toBe(true)
    })

    it('should refresh token if expired before publishing', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      // Atlassian connection with expired token
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'conn-1',
              cloudId: 'cloud-123',
              accessToken: 'encrypted-token',
              refreshToken: 'encrypted-refresh',
              expiresAt: new Date(Date.now() - 1000), // Expired
            }]),
          }),
        } as never)
        // Document exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'doc-1',
              title: 'Test BR',
              content: JSON.stringify({
                ruleId: 'BR-001',
                ruleName: 'Test Rule',
                category: 'validation',
                priority: 'high',
                description: 'Test description',
                ruleStatement: { if: 'condition', then: 'action' },
              }),
              documentType: 'business_rule',
              status: 'draft',
              version: 1,
            }]),
          }),
        } as never)
        // No existing publish record
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        } as never)

      // Mock Confluence API call
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'page-123',
          title: 'BR-001: Test Rule',
          _links: {
            webui: '/wiki/spaces/BRUST/pages/page-123',
            base: 'https://mysite.atlassian.net',
          },
        }),
      })

      const { refreshAccessToken } = await import('@/lib/auth/atlassian-oauth')

      const { POST } = await import('@/app/api/publish/confluence/route')
      const request = new Request('http://localhost:3000/api/publish/confluence', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(refreshAccessToken).toHaveBeenCalled()
    })
  })
})

describe('Confluence API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a Confluence page', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'page-123',
        title: 'Test Page',
        _links: { webui: '/wiki/page', base: 'https://site.atlassian.net' },
      }),
    })

    const { createConfluencePage } = await import('@/lib/api/confluence')
    const result = await createConfluencePage({
      cloudId: 'cloud-123',
      accessToken: 'token',
      spaceKey: 'BRUST',
      parentPageId: 'parent-123',
      title: 'Test Page',
      content: '<p>Test content</p>',
    })

    expect(result.id).toBe('page-123')
    expect(result.title).toBe('Test Page')
  })

  it('should update a Confluence page', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: { number: 3 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'page-123',
          title: 'Updated Page',
          _links: { webui: '/wiki/page', base: 'https://site.atlassian.net' },
        }),
      })

    const { updateConfluencePage } = await import('@/lib/api/confluence')
    const result = await updateConfluencePage({
      cloudId: 'cloud-123',
      accessToken: 'token',
      pageId: 'page-123',
      title: 'Updated Page',
      content: '<p>Updated content</p>',
    })

    expect(result.id).toBe('page-123')
    expect(result.title).toBe('Updated Page')
  })

  it('should convert business rule to Confluence format', async () => {
    const { businessRuleToConfluenceContent } = await import('@/lib/api/confluence')
    const brData = {
      ruleId: 'BR-001',
      ruleName: 'Test Rule',
      version: '1.0',
      status: 'draft',
      category: 'validation',
      priority: 'high',
      description: 'A test rule',
      ruleStatement: {
        if: 'condition',
        then: 'action',
        else: 'alternative',
      },
      exceptions: ['Exception 1'],
      examples: [{ scenario: 'valid', input: 'x', output: 'y', valid: true }],
      relatedRules: ['BR-002'],
      source: 'Business',
      owner: 'Team',
      effectiveDate: '2026-01-01',
    }

    const content = businessRuleToConfluenceContent(brData)

    expect(content).toContain('BR-001')
    expect(content).toContain('Test Rule')
    expect(content).toContain('condition')
    expect(content).toContain('action')
    expect(content).toContain('<ac:structured-macro') // Confluence macro
  })
})
