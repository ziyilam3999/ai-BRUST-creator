import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// GET /api/documents - List user's documents
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')

  try {
    // Build query conditions
    const conditions = [
      eq(documents.userId, session.user.id),
      isNull(documents.deletedAt), // Exclude soft-deleted
    ]

    if (type && (type === 'business_rule' || type === 'user_story')) {
      conditions.push(eq(documents.documentType, type))
    }

    if (status && ['draft', 'review', 'approved', 'deprecated'].includes(status)) {
      conditions.push(eq(documents.status, status as 'draft' | 'review' | 'approved' | 'deprecated'))
    }

    const docs = await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.updatedAt))

    return NextResponse.json({ data: docs })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch documents' } },
      { status: 500 }
    )
  }
}

// POST /api/documents - Create new document
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
    const { documentType, title, content } = body

    // Validation
    if (!documentType || !['business_rule', 'user_story'].includes(documentType)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid document type',
            details: { documentType: ['Must be business_rule or user_story'] },
          },
        },
        { status: 400 }
      )
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title is required',
            details: { title: ['Title is required'] },
          },
        },
        { status: 400 }
      )
    }

    // Generate document ID based on type and category
    const prefix = documentType === 'business_rule' ? 'BR' : 'US'
    const category = content?.category?.toUpperCase().substring(0, 3) || 'GEN'
    const timestamp = Date.now().toString(36).toUpperCase()
    const documentId = `${prefix}-${category}-${timestamp}`

    const id = randomUUID()
    const now = new Date().toISOString()

    const [newDoc] = await db
      .insert(documents)
      .values({
        id,
        userId: session.user.id,
        documentType,
        documentId,
        title: title.trim(),
        content: content || {},
        status: 'draft',
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return NextResponse.json({ data: newDoc }, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create document' } },
      { status: 500 }
    )
  }
}
