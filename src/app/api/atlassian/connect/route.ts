import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { getAuthorizationUrl } from '@/lib/auth/atlassian-oauth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate authorization URL with user ID as state for CSRF protection
    const authUrl = getAuthorizationUrl(session.user.id)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Atlassian connect error:', error)
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}
