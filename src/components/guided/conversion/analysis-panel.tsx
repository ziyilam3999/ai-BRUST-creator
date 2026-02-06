'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, GitBranch, Minus } from 'lucide-react'
import type { ConversionAnalysis } from '@/stores/guided-creator-store'

interface Props {
  recommendation: ConversionAnalysis
  onAccept: (count: number) => void
  isAnalyzing: boolean
}

export function AnalysisPanel({ recommendation, onAccept, isAnalyzing }: Props) {
  const [storyCount, setStoryCount] = useState(recommendation.suggestedCount)

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Brain className="w-8 h-8 mx-auto mb-3 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">
            AI is analyzing your Business Rule...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI Recommendation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommendation Badge */}
        <div className="flex items-center gap-2">
          {recommendation.shouldSplit ? (
            <Badge variant="secondary" className="gap-1">
              <GitBranch className="w-3 h-3" />
              Split into {recommendation.suggestedCount} User Stories
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Minus className="w-3 h-3" />
              Single User Story
            </Badge>
          )}
        </div>

        {/* Reasoning */}
        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">Why?</p>
          <ul className="space-y-1 text-muted-foreground">
            {recommendation.reasoning.map((reason, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-primary mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Story Count Override */}
        {recommendation.shouldSplit && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Number of User Stories:</span>
              <span className="font-medium">{storyCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={Math.max(5, recommendation.suggestedCount + 2)}
              value={storyCount}
              onChange={(e) => setStoryCount(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Adjust if you want more or fewer stories
            </p>
          </div>
        )}

        {/* Proposed Stories Preview */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Proposed Stories:</p>
          {recommendation.proposedStories.slice(0, storyCount).map((story, i) => (
            <div key={i} className="p-2 bg-muted rounded text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{i + 1}. {story.title}</span>
                <Badge variant="outline" className="text-xs">
                  {story.estimatedSize}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {story.rationale}
              </p>
            </div>
          ))}
        </div>

        <Button onClick={() => onAccept(storyCount)} className="w-full">
          Generate {storyCount} User {storyCount === 1 ? 'Story' : 'Stories'}
        </Button>
      </CardContent>
    </Card>
  )
}
