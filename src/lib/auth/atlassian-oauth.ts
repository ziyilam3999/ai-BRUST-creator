import crypto from 'crypto'

const ATLASSIAN_AUTH_URL = 'https://auth.atlassian.com/authorize'
const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token'
const ATLASSIAN_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources'

// Scopes for Confluence and JIRA access
const SCOPES = [
  'read:confluence-content.all',
  'write:confluence-content',
  'read:confluence-space.summary',
  'read:jira-work',
  'write:jira-work',
  'read:jira-user',
  'offline_access', // Required for refresh tokens
].join(' ')

/**
 * Encrypts a token using AES-256-GCM
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Return IV + AuthTag + Ciphertext as base64
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Decrypts a token encrypted with AES-256-GCM
 */
export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey()
  const data = Buffer.from(encryptedToken, 'base64')

  // Extract IV (16 bytes), AuthTag (16 bytes), and Ciphertext
  const iv = data.subarray(0, 16)
  const authTag = data.subarray(16, 32)
  const ciphertext = data.subarray(32)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Gets the encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ATLASSIAN_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ATLASSIAN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * Generates the Atlassian OAuth authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const clientId = process.env.ATLASSIAN_CLIENT_ID
  if (!clientId) {
    throw new Error('ATLASSIAN_CLIENT_ID is not configured')
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/atlassian/callback`

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state: state,
    response_type: 'code',
    prompt: 'consent',
  })

  return `${ATLASSIAN_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}> {
  const clientId = process.env.ATLASSIAN_CLIENT_ID
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/atlassian/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Atlassian OAuth credentials not configured')
  }

  const response = await fetch(ATLASSIAN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const clientId = process.env.ATLASSIAN_CLIENT_ID
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Atlassian OAuth credentials not configured')
  }

  const response = await fetch(ATLASSIAN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}

/**
 * Get accessible Atlassian resources (cloud IDs) for the user
 */
export async function getAccessibleResources(accessToken: string): Promise<Array<{
  id: string
  name: string
  url: string
  scopes: string[]
  avatarUrl?: string
}>> {
  const response = await fetch(ATLASSIAN_RESOURCES_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get accessible resources: ${error}`)
  }

  return response.json()
}

/**
 * Validates the state parameter to prevent CSRF
 */
export function validateState(state: string, userId: string): boolean {
  // Simple validation: state should match user ID
  // In production, use a cryptographically secure token stored in session
  return state === userId
}

export interface AtlassianTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  cloudId: string
  siteName: string
  siteUrl: string
}
