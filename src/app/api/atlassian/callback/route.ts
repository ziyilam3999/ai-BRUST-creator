import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { db } from '@/lib/db'
import { atlassianConnections } from '@/lib/db/schema'
import {
  exchangeCodeForTokens,
  getAccessibleResources,
  encryptToken,
  validateState,
} from '@/lib/auth/atlassian-oauth'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }

    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || 'Unknown error'
      console.error('Atlassian OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/settings?atlassian=error&message=${encodeURIComponent(errorDescription)}`, request.url)
      )
    }

    // Validate code
    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    // Validate state for CSRF protection
    if (!state || !validateState(state, session.user.id)) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get accessible resources (cloud IDs)
    const resources = await getAccessibleResources(tokens.access_token)

    if (resources.length === 0) {
      return NextResponse.redirect(
        new URL('/settings?atlassian=error&message=No+accessible+Atlassian+sites+found', request.url)
      )
    }

    // Use the first accessible resource (most users have one)
    const site = resources[0]

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.access_token)
    const encryptedRefreshToken = encryptToken(tokens.refresh_token)

    // Store or update connection in database
    await db
      .insert(atlassianConnections)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        cloudId: site.id,
        siteName: site.name,
        siteUrl: site.url,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: expiresAt.toISOString(),
        scopes: tokens.scope,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: atlassianConnections.userId,
        set: {
          cloudId: site.id,
          siteName: site.name,
          siteUrl: site.url,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt.toISOString(),
          scopes: tokens.scope,
          updatedAt: new Date().toISOString(),
        },
      })

    // Redirect to settings with success
    return NextResponse.redirect(new URL('/settings?atlassian=connected', request.url))
  } catch (error) {
    console.error('Atlassian callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/settings?atlassian=error&message=${encodeURIComponent(errorMessage)}`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    )
  }
}
