import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { db } from '@/lib/db'
import { atlassianConnections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for existing connection
    const connections = await db
      .select()
      .from(atlassianConnections)
      .where(eq(atlassianConnections.userId, session.user.id))

    if (connections.length === 0) {
      return NextResponse.json({
        connected: false,
      })
    }

    const connection = connections[0]
    const now = new Date()
    const needsRefresh = connection.tokenExpiresAt
      ? new Date(connection.tokenExpiresAt) < now
      : false

    return NextResponse.json({
      connected: true,
      siteName: connection.siteName,
      siteUrl: connection.siteUrl,
      needsRefresh,
      connectedAt: connection.createdAt,
    })
  } catch (error) {
    console.error('Atlassian status error:', error)
    return NextResponse.json(
      { error: 'Failed to get connection status' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the connection
    await db
      .delete(atlassianConnections)
      .where(eq(atlassianConnections.userId, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Atlassian disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
