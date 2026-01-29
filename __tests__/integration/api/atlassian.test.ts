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
        onConflictDoUpdate: vi.fn(() => Promise.resolve()),
        returning: vi.fn(() => Promise.resolve([{ id: 'conn-1' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}))

import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

describe('Atlassian OAuth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ATLASSIAN_CLIENT_ID', 'test-client-id')
    vi.stubEnv('ATLASSIAN_CLIENT_SECRET', 'test-client-secret')
    vi.stubEnv('ATLASSIAN_ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('GET /api/atlassian/connect', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const { GET } = await import('@/app/api/atlassian/connect/route')
      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return authorization URL for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      const { GET } = await import('@/app/api/atlassian/connect/route')
      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.authUrl).toContain('https://auth.atlassian.com/authorize')
      expect(data.authUrl).toContain('client_id=test-client-id')
      expect(data.authUrl).toContain('redirect_uri=')
      expect(data.authUrl).toContain('state=')
    })

    it('should include required scopes in authorization URL', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      const { GET } = await import('@/app/api/atlassian/connect/route')
      const response = await GET()

      const data = await response.json()
      expect(data.authUrl).toContain('scope=')
      // Should include offline_access for refresh tokens
      expect(data.authUrl).toContain('offline_access')
    })
  })

  describe('GET /api/atlassian/callback', () => {
    it('should return 400 if code is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      const { GET } = await import('@/app/api/atlassian/callback/route')
      const request = new Request('http://localhost:3000/api/atlassian/callback')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing authorization code')
    })

    it('should return 400 if state is invalid', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      const { GET } = await import('@/app/api/atlassian/callback/route')
      const request = new Request('http://localhost:3000/api/atlassian/callback?code=test-code&state=invalid')
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid state parameter')
    })

    it('should exchange code for tokens and redirect on success', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      // Mock fetch for token exchange and resources
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            scope: 'read:confluence write:confluence',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { id: 'cloud-123', name: 'My Site', url: 'https://mysite.atlassian.net' },
          ]),
        })

      const { GET } = await import('@/app/api/atlassian/callback/route')
      const request = new Request('http://localhost:3000/api/atlassian/callback?code=test-code&state=user-1')
      const response = await GET(request)

      // Next.js uses 307 for temporary redirects
      expect(response.status).toBe(307)
      expect(response.headers.get('Location')).toContain('/settings?atlassian=connected')
    })
  })

  describe('GET /api/atlassian/status', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null)

      const { GET } = await import('@/app/api/atlassian/status/route')
      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('should return not connected if no connection exists', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as never)

      const { GET } = await import('@/app/api/atlassian/status/route')
      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.connected).toBe(false)
    })

    it('should return connected status with site info', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 'conn-1',
            userId: 'user-1',
            cloudId: 'cloud-123',
            siteName: 'My Site',
            siteUrl: 'https://mysite.atlassian.net',
            expiresAt: new Date(Date.now() + 3600000),
          }]),
        }),
      } as never)

      const { GET } = await import('@/app/api/atlassian/status/route')
      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.connected).toBe(true)
      expect(data.siteName).toBe('My Site')
      expect(data.siteUrl).toBe('https://mysite.atlassian.net')
    })

    it('should indicate when token needs refresh', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 'conn-1',
            userId: 'user-1',
            cloudId: 'cloud-123',
            siteName: 'My Site',
            siteUrl: 'https://mysite.atlassian.net',
            expiresAt: new Date(Date.now() - 1000), // Expired
          }]),
        }),
      } as never)

      const { GET } = await import('@/app/api/atlassian/status/route')
      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.connected).toBe(true)
      expect(data.needsRefresh).toBe(true)
    })
  })

  describe('DELETE /api/atlassian/status', () => {
    it('should disconnect Atlassian account', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
      })

      const { DELETE } = await import('@/app/api/atlassian/status/route')
      const response = await DELETE()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(db.delete).toHaveBeenCalled()
    })
  })
})

describe('Atlassian OAuth Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ATLASSIAN_CLIENT_ID', 'test-client-id')
    vi.stubEnv('ATLASSIAN_CLIENT_SECRET', 'test-client-secret')
    vi.stubEnv('ATLASSIAN_ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should encrypt and decrypt tokens correctly', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/auth/atlassian-oauth')
    const original = 'my-secret-token-12345'
    const encrypted = encryptToken(original)

    expect(encrypted).toBeDefined()
    expect(encrypted).not.toBe(original)
    expect(encrypted.length).toBeGreaterThan(32)

    const decrypted = decryptToken(encrypted)
    expect(decrypted).toBe(original)
  })

  it('should generate authorization URL with correct parameters', async () => {
    const { getAuthorizationUrl } = await import('@/lib/auth/atlassian-oauth')
    const url = getAuthorizationUrl('user-123')

    expect(url).toContain('https://auth.atlassian.com/authorize')
    expect(url).toContain('response_type=code')
    expect(url).toContain('prompt=consent')
    expect(url).toContain('state=user-123')
    expect(url).toContain('client_id=test-client-id')
  })

  it('should exchange code for tokens', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'access-123',
        refresh_token: 'refresh-123',
        expires_in: 3600,
        scope: 'read:confluence',
      }),
    })

    const { exchangeCodeForTokens } = await import('@/lib/auth/atlassian-oauth')
    const tokens = await exchangeCodeForTokens('test-code')

    expect(tokens.access_token).toBe('access-123')
    expect(tokens.refresh_token).toBe('refresh-123')
    expect(tokens.expires_in).toBe(3600)
  })

  it('should refresh expired tokens', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'new-access-123',
        refresh_token: 'new-refresh-123',
        expires_in: 3600,
      }),
    })

    const { refreshAccessToken } = await import('@/lib/auth/atlassian-oauth')
    const tokens = await refreshAccessToken('old-refresh-token')

    expect(tokens.access_token).toBe('new-access-123')
    expect(tokens.refresh_token).toBe('new-refresh-123')
  })

  it('should get accessible resources (cloud IDs)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: 'cloud-1', name: 'Site 1', url: 'https://site1.atlassian.net' },
        { id: 'cloud-2', name: 'Site 2', url: 'https://site2.atlassian.net' },
      ]),
    })

    const { getAccessibleResources } = await import('@/lib/auth/atlassian-oauth')
    const resources = await getAccessibleResources('access-token')

    expect(resources).toHaveLength(2)
    expect(resources[0].id).toBe('cloud-1')
    expect(resources[1].name).toBe('Site 2')
  })

  it('should validate state parameter correctly', async () => {
    const { validateState } = await import('@/lib/auth/atlassian-oauth')

    expect(validateState('user-123', 'user-123')).toBe(true)
    expect(validateState('user-456', 'user-123')).toBe(false)
    expect(validateState('', 'user-123')).toBe(false)
  })
})
