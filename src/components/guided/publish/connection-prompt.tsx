'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link2, ArrowRight } from 'lucide-react'

interface Props {
  onConnect: () => void
  onSkip: () => void
}

export function ConnectionPrompt({ onConnect, onSkip }: Props) {
  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Connect to Atlassian
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect your Atlassian account to publish documents directly to Confluence and JIRA.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onConnect} aria-label="Connect Atlassian">
            <ArrowRight className="w-3 h-3 mr-1" />
            Connect
          </Button>
          <Button size="sm" variant="ghost" onClick={onSkip} aria-label="Skip for later">
            Skip for Now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
