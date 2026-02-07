'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  title: string
  spaceName: string
  onConfirm: () => void
  onCancel: () => void
  isPublishing: boolean
}

export function PublishPreviewConfluence({ title, spaceName, onConfirm, onCancel, isPublishing }: Props) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Publish to Confluence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted p-3 rounded-md text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Page Title:</span>
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Space:</span>
            <span>{spaceName}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isPublishing}
            aria-label={isPublishing ? 'Publishing...' : 'Publish to Confluence'}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish'
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
