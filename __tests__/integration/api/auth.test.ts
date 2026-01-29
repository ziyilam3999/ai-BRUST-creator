import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getServerSession } from 'next-auth'

// Mock next-auth before importing auth-options
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}))

vi.mock('next-auth/providers/github', () => ({
  default: vi.fn(() => ({
    id: 'github',
    name: 'GitHub',
    type: 'oauth',
  })),
}))

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Auth Options Configuration', () => {
    it('should have GitHub provider configured', async () => {
      const { authOptions } = await import('@/lib/auth/auth-options')

      expect(authOptions).toBeDefined()
      expect(authOptions.providers).toBeDefined()
      expect(Array.isArray(authOptions.providers)).toBe(true)
      expect(authOptions.providers.length).toBeGreaterThan(0)
    })

    it('should use JWT session strategy', async () => {
      const { authOptions } = await import('@/lib/auth/auth-options')

      expect(authOptions.session?.strategy).toBe('jwt')
    })

    it('should have session callback configured', async () => {
      const { authOptions } = await import('@/lib/auth/auth-options')

      expect(authOptions.callbacks).toBeDefined()
      expect(authOptions.callbacks?.session).toBeDefined()
      expect(authOptions.callbacks?.jwt).toBeDefined()
    })

    it('should have custom sign in page', async () => {
      const { authOptions } = await import('@/lib/auth/auth-options')

      expect(authOptions.pages?.signIn).toBe('/login')
    })

    it('should set 30 day session max age', async () => {
      const { authOptions } = await import('@/lib/auth/auth-options')

      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60)
    })
  })

  describe('getCurrentUser', () => {
    it('should return null when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { getCurrentUser } = await import('@/lib/auth/auth-options')
      const user = await getCurrentUser()

      expect(user).toBeNull()
    })

    it('should return user when authenticated', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2026-02-28',
      }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { getCurrentUser } = await import('@/lib/auth/auth-options')
      const user = await getCurrentUser()

      expect(user).toEqual(mockSession.user)
      expect(user?.id).toBe('user-123')
    })
  })

  describe('requireAuth', () => {
    it('should throw error when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { requireAuth } = await import('@/lib/auth/auth-options')

      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })

    it('should return user when authenticated', async () => {
      const mockSession = {
        user: {
          id: 'user-456',
          name: 'Auth User',
          email: 'auth@example.com',
        },
        expires: '2026-02-28',
      }
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { requireAuth } = await import('@/lib/auth/auth-options')
      const user = await requireAuth()

      expect(user).toEqual(mockSession.user)
    })
  })

  describe('JWT Callback', () => {
    it('should add user id to token on sign in', async () => {
      const { authOptions } = await import('@/lib/auth/auth-options')

      const token = { sub: 'token-sub' }
      const user = { id: 'user-789', name: 'New User', email: 'new@example.com' }
      const account = { access_token: 'github-token', provider: 'github', type: 'oauth' as const, providerAccountId: '123' }

      const result = await authOptions.callbacks?.jwt?.({
        token,
        user,
        account,
        trigger: 'signIn',
      })

      expect(result?.id).toBe('user-789')
      expect(result?.accessToken).toBe('github-token')
    })
  })

  describe('Session Callback', () => {
    it('should add user id to session', async () => {
      const { authOptions } = await import('@/lib/auth/auth-options')

      const session = {
        user: { id: '', name: 'Session User', email: 'session@example.com' },
        expires: '2026-02-28',
      }
      const token = { id: 'token-user-id', sub: 'sub' }

      // @ts-expect-error - simplified test mock
      const result = await authOptions.callbacks?.session?.({
        session,
        token,
      })

      expect((result?.user as { id: string })?.id).toBe('token-user-id')
    })
  })
})
