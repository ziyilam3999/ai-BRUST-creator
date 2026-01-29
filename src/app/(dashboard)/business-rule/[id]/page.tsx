'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react'
import type { Document } from '@/lib/db/schema'
import type { BusinessRuleData } from '@/types/business-rule'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  deprecated: 'bg-gray-100 text-gray-800',
}

export default function BusinessRuleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const id = params.id as string

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Document not found')
          }
          throw new Error('Failed to fetch document')
        }
        const data = await response.json()
        setDocument(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [id])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete document')
      }
      router.push('/history')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    )
  }

  if (error || !document) {
    return (
      <main className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-8 text-center">
            <p className="text-red-500 mb-4">{error || 'Document not found'}</p>
            <Link href="/history">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const content = document.content as BusinessRuleData

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <Edit className="w-4 h-4 mr-2" />
              Edit (Coming Soon)
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{document.title}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {document.documentId} · Version {document.version}
                </p>
              </div>
              <Badge className={STATUS_COLORS[document.status]} variant="secondary">
                {document.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-6 rounded-lg font-mono text-sm space-y-4">
              {/* Header */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Rule ID:</span>{' '}
                  <span className="font-semibold">{content?.ruleId || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rule Name:</span>{' '}
                  <span>{content?.ruleName || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>{' '}
                  <span className="capitalize">{content?.category || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>{' '}
                  <span className="capitalize">{content?.priority || '-'}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-muted-foreground font-bold mb-1">DESCRIPTION:</div>
                <p className="whitespace-pre-wrap">{content?.description || '-'}</p>
              </div>

              {/* Rule Statement */}
              <div>
                <div className="text-muted-foreground font-bold mb-1">RULE STATEMENT:</div>
                <div className="ml-4 space-y-1">
                  <div>
                    <span className="text-muted-foreground">IF:</span>{' '}
                    {content?.ruleStatement?.if || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">THEN:</span>{' '}
                    {content?.ruleStatement?.then || '-'}
                  </div>
                  {content?.ruleStatement?.else && (
                    <div>
                      <span className="text-muted-foreground">ELSE:</span>{' '}
                      {content.ruleStatement.else}
                    </div>
                  )}
                </div>
              </div>

              {/* Exceptions */}
              <div>
                <div className="text-muted-foreground font-bold mb-1">EXCEPTIONS:</div>
                {content?.exceptions && content.exceptions.length > 0 ? (
                  <ul className="ml-4 list-disc">
                    {content.exceptions.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="ml-4">None</span>
                )}
              </div>

              {/* Examples */}
              <div>
                <div className="text-muted-foreground font-bold mb-1">EXAMPLES:</div>
                {content?.examples && content.examples.length > 0 ? (
                  <div className="ml-4 space-y-2">
                    {content.examples.map((ex, i) => (
                      <div key={i}>
                        <span className={ex.isValid ? 'text-green-600' : 'text-red-600'}>
                          [{ex.isValid ? 'Valid' : 'Invalid'}]
                        </span>{' '}
                        {ex.scenario}: {ex.description}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="ml-4">None</span>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Related Rules:</span>{' '}
                  {content?.relatedRules && content.relatedRules.length > 0
                    ? content.relatedRules.join(', ')
                    : 'None'}
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>{' '}
                  {content?.source || '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">Owner:</span>{' '}
                  {content?.owner || '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">Effective:</span>{' '}
                  {content?.effectiveDate || '-'}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Created: {new Date(document.createdAt!).toLocaleString()}</span>
                <span>Updated: {new Date(document.updatedAt!).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
