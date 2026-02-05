'use client'

import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { getCompletionAdvice } from '@/lib/guided/advice-engine'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Lightbulb } from 'lucide-react'

export function CompletionSummary() {
  const { overallCompletion } = useGuidedCreatorStore()
  const advice = getCompletionAdvice(overallCompletion)

  const levelColors = {
    minimal: 'text-red-600',
    draft: 'text-yellow-600',
    good: 'text-blue-600',
    comprehensive: 'text-green-600',
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Overall:</span>
        <Progress value={overallCompletion} className="flex-1 h-3" />
        <span className={cn('text-sm font-bold', levelColors[advice.level])}>
          {overallCompletion}%
        </span>
      </div>

      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
        <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm">{advice.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {advice.suggestedAction}
          </p>
        </div>
      </div>
    </div>
  )
}
