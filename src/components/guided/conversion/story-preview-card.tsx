'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check, Pencil, RefreshCw, Trash2,
  ChevronDown, ChevronUp, MessageSquare,
} from 'lucide-react'
import type { GeneratedStory } from '@/stores/guided-creator-store'

interface Props {
  story: GeneratedStory
  index: number
  totalStories: number
  onAccept: () => void
  onEdit: () => void
  onRegenerate: () => void
  onDelete: () => void
  onChat: () => void
}

export function StoryPreviewCard({
  story,
  index,
  totalStories,
  onAccept,
  onEdit,
  onRegenerate,
  onDelete,
  onChat,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const isAccepted = story.status === 'accepted'

  return (
    <Card className={isAccepted ? 'border-green-500/50 bg-green-50/50' : ''}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-muted-foreground">#{index + 1}</span>
            {story.data.title || `Story ${index + 1}`}
            {isAccepted && (
              <Badge variant="default" className="bg-green-600">
                <Check className="w-3 h-3 mr-1" />
                Accepted
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Story Statement */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p><strong>As a</strong> {story.data.storyStatement.role}</p>
            <p><strong>I want</strong> {story.data.storyStatement.feature}</p>
            <p><strong>So that</strong> {story.data.storyStatement.benefit}</p>
          </div>

          {/* Acceptance Criteria Preview */}
          {story.data.acceptanceCriteria.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                Acceptance Criteria ({story.data.acceptanceCriteria.length})
              </p>
              <ul className="text-sm space-y-1">
                {story.data.acceptanceCriteria.slice(0, 3).map((ac) => (
                  <li key={ac.id} className="text-muted-foreground">
                    • {ac.scenario}
                  </li>
                ))}
                {story.data.acceptanceCriteria.length > 3 && (
                  <li className="text-muted-foreground italic">
                    + {story.data.acceptanceCriteria.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            {!isAccepted && (
              <Button size="sm" onClick={onAccept} className="flex-1" aria-label="Accept">
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onEdit} aria-label="Edit">
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={onChat} aria-label="Refine with AI">
              <MessageSquare className="w-4 h-4 mr-1" />
              Refine with AI
            </Button>
            <Button size="sm" variant="ghost" onClick={onRegenerate} aria-label="Regenerate">
              <RefreshCw className="w-4 h-4" />
            </Button>
            {totalStories > 1 && (
              <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
