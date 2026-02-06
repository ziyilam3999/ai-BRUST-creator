'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, FileText, X } from 'lucide-react'

interface Props {
  onConvert: () => void
  onSkip: () => void
  brTitle: string
}

export function ConversionPrompt({ onConvert, onSkip, brTitle }: Props) {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Business Rule Complete!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your Business Rule <strong>&quot;{brTitle}&quot;</strong> is ready.
          Would you like to convert it into User Stories?
        </p>

        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">What happens next:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>AI analyzes your BR structure and complexity</li>
            <li>Suggests whether to create single or multiple User Stories</li>
            <li>Generates draft User Stories for your review</li>
            <li>You can iterate and refine each story</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button onClick={onConvert} className="flex-1">
            <ArrowRight className="w-4 h-4 mr-2" />
            Yes, Convert to User Stories
          </Button>
          <Button variant="outline" onClick={onSkip}>
            <X className="w-4 h-4 mr-2" />
            No, Just Save BR
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
