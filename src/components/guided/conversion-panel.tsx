'use client'

import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onProceedToConvert?: () => void
  onSelectStory?: (index: number) => void
  className?: string
}

export function ConversionPanel({ onProceedToConvert, onSelectStory, className }: Props) {
  const { conversion, selectConvertedStory } = useGuidedCreatorStore()
  const { mode, analysis, convertedStories, selectedStoryIndex, error } = conversion

  if (mode === 'none' && !analysis && !error) {
    return null
  }

  const handleStorySelect = (index: number) => {
    selectConvertedStory(index)
    onSelectStory?.(index)
  }

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowRight className="w-5 h-5" />
          BR-to-US Conversion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Analyzing State */}
        {mode === 'analyzing' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analyzing business rule...</span>
          </div>
        )}

        {/* Converting State */}
        {mode === 'converting' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Converting to user stories...</span>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && mode !== 'converting' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {analysis.shouldSplit ? (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Split Recommended
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Single Story
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {analysis.suggestedCount} {analysis.suggestedCount === 1 ? 'story' : 'stories'} suggested
              </span>
            </div>

            {/* Reasoning */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Analysis:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {analysis.reasoning.map((reason, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Proposed Stories */}
            {analysis.proposedStories.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Proposed Stories:</p>
                <div className="space-y-1">
                  {analysis.proposedStories.map((story, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs"
                    >
                      <span className="font-medium">{story.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {story.estimatedSize}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proceed Button */}
            {mode === 'analyzing' && onProceedToConvert && (
              <Button onClick={onProceedToConvert} className="w-full mt-2">
                <FileText className="w-4 h-4 mr-2" />
                Convert to User {analysis.suggestedCount === 1 ? 'Story' : 'Stories'}
              </Button>
            )}
          </div>
        )}

        {/* Converted Stories */}
        {mode === 'complete' && convertedStories.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">
                {convertedStories.length} {convertedStories.length === 1 ? 'Story' : 'Stories'} Generated
              </span>
            </div>

            <div className="space-y-1">
              {convertedStories.map((story: unknown, i: number) => {
                const s = story as { storyId?: string; title?: string }
                return (
                  <button
                    key={i}
                    onClick={() => handleStorySelect(i)}
                    className={cn(
                      'w-full flex items-center justify-between p-2 rounded text-left text-sm',
                      'transition-colors hover:bg-muted',
                      selectedStoryIndex === i ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                    )}
                  >
                    <span>{s.storyId || `Story ${i + 1}`}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {s.title || 'Untitled'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
