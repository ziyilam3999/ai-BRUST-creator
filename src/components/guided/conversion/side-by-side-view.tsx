'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StoryPreviewList } from './story-preview-list'
import type { BusinessRuleData } from '@/types/business-rule'
import type { GeneratedStory } from '@/stores/guided-creator-store'

interface Props {
  businessRule: BusinessRuleData
  stories: GeneratedStory[]
  onAccept: (storyId: string) => void
  onEdit: (storyId: string) => void
  onRegenerate: (storyId: string) => void
  onDelete: (storyId: string) => void
  onChat: (storyId: string) => void
}

export function SideBySideView({
  businessRule,
  stories,
  onAccept,
  onEdit,
  onRegenerate,
  onDelete,
  onChat,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Source Business Rule */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Source Business Rule</h3>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{businessRule.ruleName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground font-medium">Description:</span>
              <p className="mt-1">{businessRule.description || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Rule Statement:</span>
              <div className="mt-1 ml-2 space-y-1">
                <p><strong>IF:</strong> {businessRule.ruleStatement?.if || '-'}</p>
                <p><strong>THEN:</strong> {businessRule.ruleStatement?.then || '-'}</p>
                {businessRule.ruleStatement?.else && (
                  <p><strong>ELSE:</strong> {businessRule.ruleStatement.else}</p>
                )}
              </div>
            </div>
            {businessRule.exceptions && businessRule.exceptions.length > 0 && (
              <div>
                <span className="text-muted-foreground font-medium">Exceptions:</span>
                <ul className="mt-1 ml-2 list-disc list-inside">
                  {businessRule.exceptions.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Generated User Stories */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Generated User Stories</h3>
        <StoryPreviewList
          stories={stories}
          onAccept={onAccept}
          onEdit={onEdit}
          onRegenerate={onRegenerate}
          onDelete={onDelete}
          onChat={onChat}
        />
      </div>
    </div>
  )
}
