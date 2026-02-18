'use client'

import { AlertCircle, RefreshCw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  /** Optional error details to display; defaults to a generic message */
  message?: string
  /** Called when the user clicks "Try Again" */
  onRetry: () => void
  /** Called when the user clicks "Skip Section" */
  onSkip: () => void
}

/**
 * AIErrorMessage
 * B5: Renders inline in the ConversationPanel message list when an AI stream fails.
 * Provides "Try Again" (retry last request) and "Skip Section" (advance to next section).
 */
export function AIErrorMessage({ message, onRetry, onSkip }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 w-4 h-4 flex-shrink-0 text-destructive" aria-hidden="true" />
        <span className="text-destructive font-medium">
          {message ?? 'Something went wrong. The AI response could not be completed.'}
        </span>
      </div>

      <div className="flex gap-2 pl-6">
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-7 text-xs"
          aria-label="Try again"
        >
          <RefreshCw className="w-3 h-3 mr-1" aria-hidden="true" />
          Try Again
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onSkip}
          className="h-7 text-xs text-muted-foreground"
          aria-label="Skip this section"
        >
          <SkipForward className="w-3 h-3 mr-1" aria-hidden="true" />
          Skip Section
        </Button>
      </div>
    </div>
  )
}
