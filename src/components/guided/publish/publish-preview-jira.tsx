'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SquareKanban, Loader2, AlertCircle, Clock } from 'lucide-react'

interface Props {
  title: string
  projectName: string
  issueType: string
  onConfirm: () => void
  onCancel: () => void
  isPublishing: boolean
  /** B4: Queue status — shown when a previous attempt was queued for retry */
  queueStatus?: 'pending' | 'failed' | null
  queueAttempts?: number
}

export function PublishPreviewJira({ title, projectName, issueType, onConfirm, onCancel, isPublishing, queueStatus, queueAttempts }: Props) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <SquareKanban className="w-4 h-4" />
          Create JIRA Issue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* B4: Queue status banner */}
        {queueStatus === 'pending' && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            <Clock className="w-3 h-3 flex-shrink-0" />
            Queued for retry (attempt {queueAttempts ?? 0} of 3)
          </div>
        )}
        {queueStatus === 'failed' && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded px-2 py-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            Publish failed after 3 attempts. Try again manually.
          </div>
        )}
        <div className="bg-muted p-3 rounded-md text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issue Title:</span>
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Project:</span>
            <span>{projectName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span>{issueType}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isPublishing}
            aria-label={isPublishing ? 'Creating...' : 'Create JIRA issue'}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Issue'
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isPublishing}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
