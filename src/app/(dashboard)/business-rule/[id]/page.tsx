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
import { ArrowLeft, Edit, Trash2, Loader2, ArrowRight } from 'lucide-react'
import type { Document } from '@/lib/db/schema'
import type { BusinessRuleData } from '@/types/business-rule'
import type { UserStoryData } from '@/types/user-story'
import { useConversion } from '@/hooks/use-conversion'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import type { GeneratedStory } from '@/stores/guided-creator-store'
import {
  ConversionPrompt,
  AnalysisPanel,
  SideBySideView,
  StoryEditorModal,
  ConversionSummary,
} from '@/components/guided/conversion'

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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showConversion, setShowConversion] = useState(false)
  const [editingStory, setEditingStory] = useState<GeneratedStory | null>(null)
  const [isSavingStories, setIsSavingStories] = useState(false)

  const { analyze, convert } = useConversion()
  const conversion = useGuidedCreatorStore((state) => state.conversion)
  const { acceptStory, editStory, updateStory, deleteStory, addManualStory, resetConversion } = useGuidedCreatorStore()

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

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) {
        throw new Error('Failed to update status')
      }
      const data = await response.json()
      setDocument(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleStartConversion = async () => {
    if (!document) return
    const content = document.content as BusinessRuleData
    setShowConversion(true)
    await analyze(content)
  }

  const handleAcceptAnalysis = async (count: number) => {
    if (!document) return
    const content = document.content as BusinessRuleData
    await convert(content, { storyCount: count })
  }

  const handleEditStory = (storyId: string) => {
    editStory(storyId)
    const story = conversion.convertedStories.find((s) => s.id === storyId)
    if (story) setEditingStory(story)
  }

  const handleSaveStoryEdit = (data: UserStoryData) => {
    if (editingStory) {
      updateStory(editingStory.id, data)
      acceptStory(editingStory.id)
      setEditingStory(null)
    }
  }

  const handleSaveAllStories = async () => {
    setIsSavingStories(true)
    try {
      const failed: string[] = []
      for (const story of conversion.convertedStories) {
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentType: 'user_story',
            title: story.data.title || story.data.storyId,
            content: story.data,
            status: 'draft',
            relatedItems: [document?.documentId],
          }),
        })
        if (!response.ok) {
          failed.push(story.data.title || story.data.storyId || story.id)
        }
      }
      if (failed.length > 0) {
        setError(`Failed to save ${failed.length} story(ies): ${failed.join(', ')}`)
        return
      }
      resetConversion()
      setShowConversion(false)
      router.push('/history')
    } catch {
      setError('Failed to save stories')
    } finally {
      setIsSavingStories(false)
    }
  }

  const isCompletedBR = document?.status === 'review' || document?.status === 'approved'

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
            {document.status === 'draft' && (
              <Button 
                size="sm" 
                onClick={() => handleStatusChange('review')}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Submitting...' : 'Submit for Review'}
              </Button>
            )}
            {document.status === 'review' && (
              <Button 
                size="sm" 
                onClick={() => handleStatusChange('approved')}
                disabled={isUpdatingStatus}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdatingStatus ? 'Approving...' : 'Approve'}
              </Button>
            )}
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

        {/* BR-to-US Conversion Section */}
        {isCompletedBR && !showConversion && conversion.mode === 'none' && (
          <div className="mt-6">
            <ConversionPrompt
              brTitle={document.title}
              onConvert={handleStartConversion}
              onSkip={() => {/* no-op, user stays on page */}}
            />
          </div>
        )}

        {showConversion && conversion.mode === 'analyzing' && conversion.analysis && (
          <div className="mt-6">
            <AnalysisPanel
              recommendation={conversion.analysis}
              onAccept={handleAcceptAnalysis}
              isAnalyzing={false}
            />
          </div>
        )}

        {showConversion && conversion.mode === 'analyzing' && !conversion.analysis && (
          <div className="mt-6">
            <AnalysisPanel
              recommendation={{ shouldSplit: false, suggestedCount: 1, reasoning: [], proposedStories: [] }}
              onAccept={handleAcceptAnalysis}
              isAnalyzing={true}
            />
          </div>
        )}

        {showConversion && conversion.mode === 'converting' && (
          <div className="mt-6 flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {showConversion && conversion.mode === 'complete' && conversion.convertedStories.length > 0 && (
          <div className="mt-6 space-y-6">
            <SideBySideView
              businessRule={content}
              stories={conversion.convertedStories}
              onAccept={acceptStory}
              onEdit={handleEditStory}
              onRegenerate={() => {/* TODO: regenerate individual story */}}
              onDelete={deleteStory}
              onChat={() => {/* TODO: open chat for story refinement */}}
            />
            <ConversionSummary
              stories={conversion.convertedStories}
              onSaveAll={handleSaveAllStories}
              onAddManual={addManualStory}
              isSaving={isSavingStories}
            />
          </div>
        )}

        {conversion.error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {conversion.error}
          </div>
        )}

        {/* Story Editor Modal */}
        {editingStory && (
          <StoryEditorModal
            story={editingStory}
            open={!!editingStory}
            onSave={handleSaveStoryEdit}
            onCancel={() => setEditingStory(null)}
          />
        )}
      </div>
    </main>
  )
}
