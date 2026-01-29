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
import { ArrowLeft, Edit, Trash2, Loader2, CheckCircle2, Circle, Upload } from 'lucide-react'
import { PublishDialog } from '@/components/publish/publish-dialog'
import type { Document } from '@/lib/db/schema'
import type { UserStoryData } from '@/types/user-story'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  deprecated: 'bg-gray-100 text-gray-800',
}

const PRIORITY_LABELS: Record<string, string> = {
  must: 'Must Have',
  should: 'Should Have',
  could: 'Could Have',
  wont: "Won't Have",
}

const PRIORITY_COLORS: Record<string, string> = {
  must: 'bg-red-100 text-red-800',
  should: 'bg-orange-100 text-orange-800',
  could: 'bg-yellow-100 text-yellow-800',
  wont: 'bg-gray-100 text-gray-800',
}

export default function UserStoryDetailPage() {
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

  const content = document.content as UserStoryData

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
            <PublishDialog
              documentId={id}
              documentTitle={document.title}
              platform="jira"
            >
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Publish to JIRA
              </Button>
            </PublishDialog>
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
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{content?.storyId || document.documentId}</Badge>
                  <Badge className={PRIORITY_COLORS[content?.priority || 'should']}>
                    {PRIORITY_LABELS[content?.priority || 'should']}
                  </Badge>
                  <Badge variant="secondary">{content?.epic || 'No Epic'}</Badge>
                </div>
                <CardTitle className="text-2xl">{document.title}</CardTitle>
              </div>
              <Badge className={STATUS_COLORS[document.status]} variant="secondary">
                {document.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Story Statement */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-lg">
                <span className="font-semibold">As a</span>{' '}
                {content?.storyStatement?.role || '___'},
              </p>
              <p className="text-lg">
                <span className="font-semibold">I want</span>{' '}
                {content?.storyStatement?.feature || '___'},
              </p>
              <p className="text-lg">
                <span className="font-semibold">So that</span>{' '}
                {content?.storyStatement?.benefit || '___'}.
              </p>
            </div>

            {/* Acceptance Criteria */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Acceptance Criteria</h3>
              {content?.acceptanceCriteria && content.acceptanceCriteria.length > 0 ? (
                <div className="space-y-4">
                  {content.acceptanceCriteria.map((ac, index) => (
                    <div key={ac.id || index} className="pl-4 border-l-2 border-primary/30">
                      <p className="font-medium mb-2">
                        Scenario {index + 1}: {ac.scenario || 'Unnamed'}
                      </p>
                      <div className="text-sm space-y-1 text-muted-foreground font-mono">
                        <p>
                          <span className="text-green-600 font-semibold">Given</span> {ac.given || '...'}
                        </p>
                        <p>
                          <span className="text-blue-600 font-semibold">When</span> {ac.when || '...'}
                        </p>
                        <p>
                          <span className="text-purple-600 font-semibold">Then</span> {ac.then || '...'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No acceptance criteria defined</p>
              )}
            </div>

            {/* Definition of Done */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Definition of Done</h3>
              {content?.definitionOfDone && content.definitionOfDone.length > 0 ? (
                <div className="space-y-2">
                  {content.definitionOfDone.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No definition of done items</p>
              )}
            </div>

            {/* Related Items */}
            {content?.relatedItems && content.relatedItems.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Related Items</h3>
                <div className="flex flex-wrap gap-2">
                  {content.relatedItems.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {content?.notes && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.notes}</p>
              </div>
            )}

            {/* Metadata Footer */}
            <div className="pt-4 border-t text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Version: {content?.version || document.version}</span>
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
