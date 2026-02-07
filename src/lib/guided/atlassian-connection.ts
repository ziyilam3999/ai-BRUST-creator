import { db } from '@/lib/db'
import { atlassianConnections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decryptToken, getAccessibleResources } from '@/lib/auth/atlassian-oauth'

export interface AtlassianResource {
  id: string
  name: string
  type: 'confluence-space' | 'jira-project'
  url: string
  avatarUrl?: string
}

export interface AtlassianConnectionState {
  isConnected: boolean
  hasValidToken: boolean
  tokenExpiresAt: string | null
  availableResources: AtlassianResource[]
  lastRefreshed: string | null
}

export async function checkAtlassianConnection(userId: string): Promise<AtlassianConnectionState> {
  if (!userId?.trim()) {
    return {
      isConnected: false,
      hasValidToken: false,
      tokenExpiresAt: null,
      availableResources: [],
      lastRefreshed: null,
    }
  }

  try {
    const connections = await db
      .select()
      .from(atlassianConnections)
      .where(eq(atlassianConnections.userId, userId))
      .limit(1)

    if (connections.length === 0) {
      return {
        isConnected: false,
        hasValidToken: false,
        tokenExpiresAt: null,
        availableResources: [],
        lastRefreshed: null,
      }
    }

    const connection = connections[0]
    const now = new Date()
    const expiresAt = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) : null
    const hasValidToken = expiresAt ? expiresAt > now : false

    let resources: AtlassianResource[] = []
    if (hasValidToken) {
      try {
        const accessToken = decryptToken(connection.accessToken)
        const rawResources = await getAccessibleResources(accessToken)
        resources = rawResources.map((r) => ({
          id: r.id,
          name: r.name,
          type: (r.url?.includes('jira') ? 'jira-project' : 'confluence-space') as AtlassianResource['type'],
          url: r.url,
          avatarUrl: r.avatarUrl,
        }))
      } catch {
        // Token might be invalid despite not being expired
      }
    }

    return {
      isConnected: true,
      hasValidToken,
      tokenExpiresAt: connection.tokenExpiresAt,
      availableResources: resources,
      lastRefreshed: connection.updatedAt,
    }
  } catch {
    return {
      isConnected: false,
      hasValidToken: false,
      tokenExpiresAt: null,
      availableResources: [],
      lastRefreshed: null,
    }
  }
}
