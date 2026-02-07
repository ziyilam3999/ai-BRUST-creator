'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, ExternalLink } from 'lucide-react'

interface Props {
  platform: 'confluence' | 'jira'
  url: string
  title: string
}

export function PublishSuccessMessage({ platform, url, title }: Props) {
  const platformName = platform === 'confluence' ? 'Confluence' : 'JIRA'

  return (
    <Card className="border-2 border-green-200 bg-green-50/50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Published successfully to {platformName}!
            </p>
            <p className="text-sm text-muted-foreground">
              &quot;{title}&quot; is now available in {platformName}.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              View in {platformName}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
