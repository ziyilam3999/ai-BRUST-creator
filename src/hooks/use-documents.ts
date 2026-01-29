'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Document } from '@/lib/db/schema'

interface UseDocumentsOptions {
  type?: 'business_rule' | 'user_story'
  status?: 'draft' | 'review' | 'approved' | 'deprecated'
}

interface UseDocumentsReturn {
  documents: Document[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createDocument: (data: CreateDocumentInput) => Promise<Document>
  updateDocument: (id: string, data: UpdateDocumentInput) => Promise<Document>
  deleteDocument: (id: string) => Promise<void>
}

interface CreateDocumentInput {
  documentType: 'business_rule' | 'user_story'
  title: string
  content: Record<string, unknown>
}

interface UpdateDocumentInput {
  title?: string
  content?: Record<string, unknown>
  status?: 'draft' | 'review' | 'approved' | 'deprecated'
}

export function useDocuments(options: UseDocumentsOptions = {}): UseDocumentsReturn {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.type) params.set('type', options.type)
      if (options.status) params.set('status', options.status)

      const url = `/api/documents${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to fetch documents')
      }

      const data = await response.json()
      setDocuments(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [options.type, options.status])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const createDocument = async (input: CreateDocumentInput): Promise<Document> => {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error?.message || 'Failed to create document')
    }

    const data = await response.json()
    await fetchDocuments() // Refetch to update list
    return data.data
  }

  const updateDocument = async (id: string, input: UpdateDocumentInput): Promise<Document> => {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error?.message || 'Failed to update document')
    }

    const data = await response.json()
    await fetchDocuments() // Refetch to update list
    return data.data
  }

  const deleteDocument = async (id: string): Promise<void> => {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error?.message || 'Failed to delete document')
    }

    await fetchDocuments() // Refetch to update list
  }

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
  }
}
