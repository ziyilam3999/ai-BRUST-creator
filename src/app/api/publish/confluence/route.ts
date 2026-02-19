import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { db } from '@/lib/db'
import { atlassianConnections, documents, publishRecords } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  decryptToken,
  refreshAccessToken,
  encryptToken,
} from '@/lib/auth/atlassian-oauth'
import {
  createConfluencePage,
  updateConfluencePage,
  businessRuleToConfluenceContent,
  buildPageUrl,
} from '@/lib/api/confluence'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get Atlassian connection
    const connections = await db
      .select()
      .from(atlassianConnections)
      .where(eq(atlassianConnections.userId, session.user.id))

    if (connections.length === 0) {
      return NextResponse.json({ error: 'Atlassian not connected' }, { status: 400 })
    }

    const connection = connections[0]

    // Get access token, refresh if expired
    let accessToken = decryptToken(connection.accessToken)
    const now = new Date()

    if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < now) {
      // Token expired, refresh it
      const refreshToken = decryptToken(connection.refreshToken)
      const newTokens = await refreshAccessToken(refreshToken)

      accessToken = newTokens.access_token
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

      // Update stored tokens
      await db
        .update(atlassianConnections)
        .set({
          accessToken: encryptToken(newTokens.access_token),
          refreshToken: encryptToken(newTokens.refresh_token),
          tokenExpiresAt: newExpiresAt.toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(atlassianConnections.id, connection.id))
    }

    // Get document
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))

    if (docs.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const doc = docs[0]

    // Parse document content
    const brData = JSON.parse((doc.content as string) || '{}')

    // Convert to Confluence format
    const confluenceContent = businessRuleToConfluenceContent({
      ...brData,
      version: doc.version?.toString() || '1',
      status: doc.status || 'draft',
    })

    // Check for existing publish record
    const existingPublish = await db
      .select()
      .from(publishRecords)
      .where(
        and(
          eq(publishRecords.documentId, documentId),
          eq(publishRecords.target, 'confluence')
        )
      )

    const spaceKey = process.env.CONFLUENCE_SPACE_KEY || 'BRUST'
    const parentPageId = process.env.CONFLUENCE_PARENT_PAGE_ID

    let pageResponse
    let isUpdate = false

    if (existingPublish.length > 0 && existingPublish[0].targetId) {
      // Update existing page
      isUpdate = true
      pageResponse = await updateConfluencePage({
        cloudId: connection.cloudId,
        accessToken,
        pageId: existingPublish[0].targetId,
        title: `${brData.ruleId}: ${brData.ruleName}`,
        content: confluenceContent,
      })

      // Update publish record
      await db
        .update(publishRecords)
        .set({
          publishedAt: new Date().toISOString(),
        })
        .where(eq(publishRecords.id, existingPublish[0].id))
    } else {
      // Create new page
      pageResponse = await createConfluencePage({
        cloudId: connection.cloudId,
        accessToken,
        spaceKey,
        parentPageId,
        title: `${brData.ruleId}: ${brData.ruleName}`,
        content: confluenceContent,
      })

      // Create publish record
      await db.insert(publishRecords).values({
        id: crypto.randomUUID(),
        documentId,
        userId: session.user.id,
        target: 'confluence',
        targetId: pageResponse.id,
        targetUrl: buildPageUrl(pageResponse),
        publishedAt: new Date().toISOString(),
      })

      // Update document published_at
      await db
        .update(documents)
        .set({
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(documents.id, documentId))
    }

    return NextResponse.json({
      success: true,
      updated: isUpdate,
      pageId: pageResponse.id,
      pageUrl: buildPageUrl(pageResponse),
    })
  } catch (error) {
    console.error('Confluence publish error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to publish: ${message}` },
      { status: 500 }
    )
  }
}
