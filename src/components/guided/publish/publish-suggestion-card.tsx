'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Clock, X } from 'lucide-react'

interface Props {
  documentType: 'business_rule' | 'user_story'
  documentTitle: string
  onPublish: () => void
  onRemindLater: () => void
  onDismiss: () => void
}

export function PublishSuggestionCard({
  documentType,
  documentTitle,
  onPublish,
  onRemindLater,
  onDismiss,
}: Props) {
  const platform = documentType === 'business_rule' ? 'Confluence' : 'JIRA'
  const action = documentType === 'business_rule' ? 'publish as a page' : 'create as an issue'

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Ready to Publish
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          &quot;{documentTitle}&quot; is ready! Would you like to {action} in {platform}?
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onPublish} aria-label={`Publish to ${platform}`}>
            <Upload className="w-3 h-3 mr-1" />
            Yes, Publish
          </Button>
          <Button size="sm" variant="outline" onClick={onRemindLater} aria-label="Remind me later">
            <Clock className="w-3 h-3 mr-1" />
            Later
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss} aria-label="No thanks">
            <X className="w-3 h-3 mr-1" />
            No Thanks
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
