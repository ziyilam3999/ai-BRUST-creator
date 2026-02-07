import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: mockFrom }),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  atlassianConnections: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col, val) => val),
}))

// Mock atlassian-oauth
vi.mock('@/lib/auth/atlassian-oauth', () => ({
  decryptToken: vi.fn((token: string) => `decrypted-${token}`),
  getAccessibleResources: vi.fn(),
}))

import { checkAtlassianConnection } from '@/lib/guided/atlassian-connection'
import { getAccessibleResources } from '@/lib/auth/atlassian-oauth'

describe('checkAtlassianConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit })
  })

  it('should return not connected when no connection record exists', async () => {
    mockLimit.mockResolvedValue([])

    const result = await checkAtlassianConnection('user-123')

    expect(result.isConnected).toBe(false)
    expect(result.hasValidToken).toBe(false)
    expect(result.availableResources).toEqual([])
  })

  it('should return connected with valid token when not expired', async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString()
    mockLimit.mockResolvedValue([{
      id: 'conn-1',
      userId: 'user-123',
      cloudId: 'cloud-1',
      accessToken: 'encrypted-token',
      refreshToken: 'encrypted-refresh',
      tokenExpiresAt: futureDate,
      scopes: 'read:confluence-content.all',
    }])

    vi.mocked(getAccessibleResources).mockResolvedValue([
      { id: 'res-1', name: 'My Site', url: 'https://mysite.atlassian.net', scopes: [] },
    ])

    const result = await checkAtlassianConnection('user-123')

    expect(result.isConnected).toBe(true)
    expect(result.hasValidToken).toBe(true)
    expect(result.availableResources).toHaveLength(1)
    expect(result.availableResources[0].name).toBe('My Site')
  })

  it('should return connected but invalid token when expired', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString()
    mockLimit.mockResolvedValue([{
      id: 'conn-1',
      userId: 'user-123',
      cloudId: 'cloud-1',
      accessToken: 'encrypted-token',
      refreshToken: 'encrypted-refresh',
      tokenExpiresAt: pastDate,
      scopes: 'read:confluence-content.all',
    }])

    const result = await checkAtlassianConnection('user-123')

    expect(result.isConnected).toBe(true)
    expect(result.hasValidToken).toBe(false)
  })

  it('should handle errors gracefully and return not connected', async () => {
    mockLimit.mockRejectedValue(new Error('DB error'))

    const result = await checkAtlassianConnection('user-123')

    expect(result.isConnected).toBe(false)
    expect(result.hasValidToken).toBe(false)
  })
})
