import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/documents/[id] - Get document by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.userId, session.user.id),
          isNull(documents.deletedAt)
        )
      )

    if (!doc) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: doc })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch document' } },
      { status: 500 }
    )
  }
}

// PUT /api/documents/[id] - Update document
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    // Check if document exists and belongs to user
    const [existing] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.userId, session.user.id),
          isNull(documents.deletedAt)
        )
      )

    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { title, content, status } = body

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }

    if (title !== undefined) {
      updates.title = title.trim()
    }

    if (content !== undefined) {
      updates.content = content
    }

    if (status !== undefined && ['draft', 'review', 'approved', 'deprecated'].includes(status)) {
      updates.status = status
    }

    const [updated] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning()

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update document' } },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/[id] - Soft delete document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    // Check if document exists and belongs to user
    const [existing] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.userId, session.user.id),
          isNull(documents.deletedAt)
        )
      )

    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      )
    }

    // Soft delete by setting deletedAt
    await db
      .update(documents)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(documents.id, id))

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete document' } },
      { status: 500 }
    )
  }
}
