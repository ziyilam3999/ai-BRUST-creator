'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StoryPreviewList } from './story-preview-list'
import type { BusinessRuleData } from '@/types/business-rule'
import type { GeneratedStory } from '@/stores/guided-creator-store'
import { renderMarkdown } from '@/lib/render-markdown'

interface Props {
  businessRule: BusinessRuleData
  stories: GeneratedStory[]
  onAccept: (storyId: string) => void
  onEdit: (storyId: string) => void
  onDelete: (storyId: string) => void
  onChat: (storyId: string) => void
}

export function SideBySideView({
  businessRule,
  stories,
  onAccept,
  onEdit,
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
          <CardContent className="space-y-3 text-sm max-h-[600px] overflow-y-auto">
            <div>
              <span className="text-muted-foreground font-medium">Description:</span>
              <p className="mt-1 whitespace-pre-wrap">{businessRule.description || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Rule Statement:</span>
              <div className="mt-1 ml-2 space-y-1">
                {(businessRule.ruleStatement?.if || businessRule.ruleStatement?.then) ? (
                  <>
                    <p><strong>IF:</strong> {businessRule.ruleStatement.if || '-'}</p>
                    <p><strong>THEN:</strong> {businessRule.ruleStatement.then || '-'}</p>
                    {businessRule.ruleStatement?.else && (
                      <p><strong>ELSE:</strong> {businessRule.ruleStatement.else}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground italic">Rule logic could not be parsed into IF/THEN format</p>
                )}
              </div>
            </div>
            {businessRule.exceptions && businessRule.exceptions.length > 0 && (
              <div>
                <span className="text-muted-foreground font-medium">Exceptions:</span>
                <ul className="mt-1 ml-2 space-y-1">
                  {businessRule.exceptions.map((ex, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                      <span>{renderMarkdown(ex)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {businessRule.examples && businessRule.examples.length > 0 && (
              <div>
                <span className="text-muted-foreground font-medium">Examples:</span>
                <ul className="mt-1 ml-2 space-y-1.5">
                  {businessRule.examples.map((ex, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className={ex.isValid ? 'text-green-600 shrink-0' : 'text-red-600 shrink-0'}>
                        {ex.isValid ? '✓' : '✗'}
                      </span>
                      <span><strong>{ex.scenario}</strong>{ex.description ? `: ${ex.description}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(businessRule.owner || businessRule.source || businessRule.effectiveDate) && (
              <div>
                <span className="text-muted-foreground font-medium">Metadata:</span>
                <div className="mt-1 ml-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  {businessRule.owner && (
                    <div><span className="text-muted-foreground">Owner:</span> {businessRule.owner}</div>
                  )}
                  {businessRule.source && (
                    <div><span className="text-muted-foreground">Source:</span> {businessRule.source}</div>
                  )}
                  {businessRule.effectiveDate && (
                    <div><span className="text-muted-foreground">Effective:</span> {businessRule.effectiveDate}</div>
                  )}
                </div>
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
          onDelete={onDelete}
          onChat={onChat}
        />
      </div>
    </div>
  )
}
