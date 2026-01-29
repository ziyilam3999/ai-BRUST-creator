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

describe('JIRA Publishing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('JIRA_PROJECT_KEY', 'PROJ')
    vi.stubEnv('JIRA_ISSUE_TYPE', 'Story')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('POST /api/publish/jira', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const { POST } = await import('@/app/api/publish/jira/route')
      const request = new Request('http://localhost:3000/api/publish/jira', {
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

      const { POST } = await import('@/app/api/publish/jira/route')
      const request = new Request('http://localhost:3000/api/publish/jira', {
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

      const { POST } = await import('@/app/api/publish/jira/route')
      const request = new Request('http://localhost:3000/api/publish/jira', {
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
              tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
            }]),
          }),
        } as never)
        // Document not found
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        } as never)

      const { POST } = await import('@/app/api/publish/jira/route')
      const request = new Request('http://localhost:3000/api/publish/jira', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Document not found')
    })

    it('should return 400 if document is not a user story', async () => {
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
              tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
            }]),
          }),
        } as never)
        // Document is a business rule, not user story
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'doc-1',
              title: 'Test BR',
              content: JSON.stringify({}),
              documentType: 'business_rule',
              status: 'draft',
              version: 1,
            }]),
          }),
        } as never)

      const { POST } = await import('@/app/api/publish/jira/route')
      const request = new Request('http://localhost:3000/api/publish/jira', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Only User Stories can be published to JIRA')
    })

    it('should create new JIRA issue for unpublished user story', async () => {
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
              tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
            }]),
          }),
        } as never)
        // Document exists - user story
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'doc-1',
              title: 'Test US',
              content: JSON.stringify({
                storyId: 'US-001',
                epic: 'Authentication',
                priority: 'must',
                storyStatement: {
                  role: 'user',
                  feature: 'login with email',
                  benefit: 'access my account',
                },
                acceptanceCriteria: [{
                  id: 'ac-1',
                  scenario: 'Valid login',
                  given: 'I am on the login page',
                  when: 'I enter valid credentials',
                  then: 'I am logged in',
                }],
                definitionOfDone: [
                  { id: 'dod-1', text: 'Code complete', completed: false },
                ],
              }),
              documentType: 'user_story',
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

      // Mock JIRA API call
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: '10001',
          key: 'PROJ-123',
          self: 'https://mysite.atlassian.net/rest/api/3/issue/10001',
        }),
      })

      const { POST } = await import('@/app/api/publish/jira/route')
      const request = new Request('http://localhost:3000/api/publish/jira', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.issueKey).toBe('PROJ-123')
      expect(data.issueUrl).toContain('atlassian.net')
    })

    it('should update existing JIRA issue for republish', async () => {
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
              tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
            }]),
          }),
        } as never)
        // Document exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'doc-1',
              title: 'Test US',
              content: JSON.stringify({
                storyId: 'US-001',
                epic: 'Authentication',
                priority: 'must',
                storyStatement: {
                  role: 'user',
                  feature: 'login with email',
                  benefit: 'access my account',
                },
                acceptanceCriteria: [],
                definitionOfDone: [],
              }),
              documentType: 'user_story',
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
              targetId: 'PROJ-123',
              targetUrl: 'https://mysite.atlassian.net/browse/PROJ-123',
            }]),
          }),
        } as never)

      // Mock JIRA API - update issue
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { POST } = await import('@/app/api/publish/jira/route')
      const request = new Request('http://localhost:3000/api/publish/jira', {
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
              tokenExpiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
            }]),
          }),
        } as never)
        // Document exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{
              id: 'doc-1',
              title: 'Test US',
              content: JSON.stringify({
                storyId: 'US-001',
                epic: 'Authentication',
                priority: 'must',
                storyStatement: {
                  role: 'user',
                  feature: 'login',
                  benefit: 'access',
                },
                acceptanceCriteria: [],
                definitionOfDone: [],
              }),
              documentType: 'user_story',
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

      // Mock JIRA API call
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: '10001',
          key: 'PROJ-123',
          self: 'https://mysite.atlassian.net/rest/api/3/issue/10001',
        }),
      })

      const { refreshAccessToken } = await import('@/lib/auth/atlassian-oauth')

      const { POST } = await import('@/app/api/publish/jira/route')
      const request = new Request('http://localhost:3000/api/publish/jira', {
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(refreshAccessToken).toHaveBeenCalled()
    })
  })
})

describe('JIRA API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a JIRA issue', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: '10001',
        key: 'PROJ-123',
        self: 'https://site.atlassian.net/rest/api/3/issue/10001',
      }),
    })

    const { createJiraIssue } = await import('@/lib/api/jira')
    const result = await createJiraIssue({
      cloudId: 'cloud-123',
      accessToken: 'token',
      projectKey: 'PROJ',
      issueType: 'Story',
      summary: 'US-001: Test Story',
      description: 'Test description',
    })

    expect(result.key).toBe('PROJ-123')
    expect(result.id).toBe('10001')
  })

  it('should update a JIRA issue', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const { updateJiraIssue } = await import('@/lib/api/jira')
    await updateJiraIssue({
      cloudId: 'cloud-123',
      accessToken: 'token',
      issueKey: 'PROJ-123',
      summary: 'Updated Story',
      description: 'Updated description',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('PROJ-123'),
      expect.objectContaining({ method: 'PUT' })
    )
  })

  it('should convert user story to JIRA description', async () => {
    const { userStoryToJiraDescription } = await import('@/lib/api/jira')
    const usData = {
      storyId: 'US-001',
      epic: 'Auth',
      priority: 'must',
      storyStatement: {
        role: 'user',
        feature: 'login with email',
        benefit: 'access my account',
      },
      acceptanceCriteria: [{
        id: 'ac-1',
        scenario: 'Valid login',
        given: 'I am on login page',
        when: 'I enter valid credentials',
        then: 'I am logged in',
      }],
      definitionOfDone: [
        { id: 'dod-1', text: 'Code complete', completed: true },
        { id: 'dod-2', text: 'Tests pass', completed: false },
      ],
    }

    const description = userStoryToJiraDescription(usData)

    expect(description).toContain('US-001')
    expect(description).toContain('user')
    expect(description).toContain('login with email')
    expect(description).toContain('Valid login')
    expect(description).toContain('Given')
    expect(description).toContain('Code complete')
  })
})
