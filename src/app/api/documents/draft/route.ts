import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// The sentinel documentId used to identify in-progress auto-save drafts.
// One per user; always overwritten on upsert.
const DRAFT_DOCUMENT_ID = '__autosave_draft__'

// POST /api/documents/draft — upsert the in-progress draft for the current user
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { sections, conversationHistory, documentType } = body as {
      sections?: Record<string, unknown>
      conversationHistory?: unknown[]
      documentType?: string
    }

    const userId = session.user.id
    const now = new Date().toISOString()
    const content = { sections: sections ?? {}, conversationHistory: conversationHistory ?? [] }

    // Check for existing draft row
    const existing = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          eq(documents.documentId, DRAFT_DOCUMENT_ID)
        )
      )
      .limit(1)

    let draftId: string

    if (existing.length > 0) {
      // Update existing draft
      draftId = existing[0].id
      await db
        .update(documents)
        .set({
          content: content as Parameters<(typeof documents)['$inferInsert']['content']>[0],
          documentType: (documentType as 'business_rule' | 'user_story') ?? 'business_rule',
          updatedAt: now,
        })
        .where(eq(documents.id, draftId))
    } else {
      // Create new draft row
      draftId = randomUUID()
      await db.insert(documents).values({
        id: draftId,
        userId,
        documentType: (documentType as 'business_rule' | 'user_story') ?? 'business_rule',
        documentId: DRAFT_DOCUMENT_ID,
        title: 'Auto-save draft',
        content: content as Parameters<(typeof documents)['$inferInsert']['content']>[0],
        status: 'draft',
        updatedAt: now,
      })
    }

    return NextResponse.json({ draftId, updatedAt: now })
  } catch (error) {
    console.error('[draft] POST error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to save draft' } },
      { status: 500 }
    )
  }
}

// GET /api/documents/draft — retrieve the in-progress draft for the current user
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const rows = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.userId, session.user.id),
          eq(documents.documentId, DRAFT_DOCUMENT_ID)
        )
      )
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No draft found' } },
        { status: 404 }
      )
    }

    const row = rows[0]
    return NextResponse.json({
      draftId: row.id,
      updatedAt: row.updatedAt,
      documentType: row.documentType,
      content: row.content,
    })
  } catch (error) {
    console.error('[draft] GET error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch draft' } },
      { status: 500 }
    )
  }
}
