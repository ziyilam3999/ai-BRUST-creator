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
  createJiraIssue,
  updateJiraIssue,
  userStoryToJiraDescription,
} from '@/lib/api/jira'

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
    const tokenExpiresAt = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) : null

    if (tokenExpiresAt && tokenExpiresAt < now) {
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

    // Verify it's a user story
    if (doc.documentType !== 'user_story') {
      return NextResponse.json(
        { error: 'Only User Stories can be published to JIRA' },
        { status: 400 }
      )
    }

    // Parse document content
    const usData = typeof doc.content === 'string'
      ? JSON.parse(doc.content || '{}')
      : (doc.content || {})

    // Convert to JIRA description
    const description = userStoryToJiraDescription({
      ...usData,
      storyId: usData.storyId || doc.title,
    })

    // Check for existing publish record
    const existingPublish = await db
      .select()
      .from(publishRecords)
      .where(
        and(
          eq(publishRecords.documentId, documentId),
          eq(publishRecords.target, 'jira')
        )
      )

    const projectKey = process.env.JIRA_PROJECT_KEY || 'PROJ'
    const issueType = process.env.JIRA_ISSUE_TYPE || 'Story'

    let issueKey: string
    let issueUrl: string
    let isUpdate = false

    if (existingPublish.length > 0 && existingPublish[0].targetId) {
      // Update existing issue
      isUpdate = true
      issueKey = existingPublish[0].targetId
      issueUrl = existingPublish[0].targetUrl || ''

      await updateJiraIssue({
        cloudId: connection.cloudId,
        accessToken,
        issueKey,
        summary: `${usData.storyId || 'US'}: ${usData.storyStatement?.feature || doc.title}`,
        description,
      })

      // Update publish record
      await db
        .update(publishRecords)
        .set({
          publishedAt: new Date().toISOString(),
        })
        .where(eq(publishRecords.id, existingPublish[0].id))
    } else {
      // Create new issue
      const summary = `${usData.storyId || 'US'}: ${usData.storyStatement?.feature || doc.title}`

      const issueResponse = await createJiraIssue({
        cloudId: connection.cloudId,
        accessToken,
        projectKey,
        issueType,
        summary,
        description,
        labels: ['brust-creator'],
      })

      issueKey = issueResponse.key
      // Build browse URL using cloud ID
      issueUrl = `https://${connection.cloudId}.atlassian.net/browse/${issueKey}`

      // Create publish record
      await db.insert(publishRecords).values({
        id: crypto.randomUUID(),
        documentId,
        userId: session.user.id,
        target: 'jira',
        targetId: issueKey,
        targetUrl: issueUrl,
        status: 'success',
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
      issueKey,
      issueUrl,
    })
  } catch (error) {
    console.error('JIRA publish error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to publish: ${message}` },
      { status: 500 }
    )
  }
}
