'use client'

import { useUserStoryWizardStore } from '@/stores/user-story-wizard-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle } from 'lucide-react'

export function USReviewStep() {
  const { data } = useUserStoryWizardStore()

  const priorityLabels: Record<string, string> = {
    must: 'Must Have',
    should: 'Should Have',
    could: 'Could Have',
    wont: "Won't Have",
  }

  const priorityColors: Record<string, string> = {
    must: 'bg-red-100 text-red-800',
    should: 'bg-orange-100 text-orange-800',
    could: 'bg-yellow-100 text-yellow-800',
    wont: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your user story before submitting. You can go back to any step to make changes.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline">{data.storyId || 'No ID'}</Badge>
              <Badge className={priorityColors[data.priority]}>
                {priorityLabels[data.priority]}
              </Badge>
            </div>
            <Badge variant="secondary">{data.epic || 'No Epic'}</Badge>
          </div>
          <CardTitle className="mt-2">{data.title || 'Untitled Story'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Story Statement */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-lg">
              <span className="font-semibold">As a</span> {data.storyStatement.role || '___'},
            </p>
            <p className="text-lg">
              <span className="font-semibold">I want</span> {data.storyStatement.feature || '___'},
            </p>
            <p className="text-lg">
              <span className="font-semibold">So that</span> {data.storyStatement.benefit || '___'}.
            </p>
          </div>

          {/* Acceptance Criteria */}
          <div>
            <h4 className="font-semibold mb-3">Acceptance Criteria</h4>
            {data.acceptanceCriteria.length > 0 ? (
              <div className="space-y-4">
                {data.acceptanceCriteria.map((ac, index) => (
                  <div key={ac.id} className="pl-4 border-l-2 border-primary/30">
                    <p className="font-medium mb-2">
                      Scenario {index + 1}: {ac.scenario || 'Unnamed'}
                    </p>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p>
                        <span className="text-green-600 font-medium">Given</span> {ac.given || '...'}
                      </p>
                      <p>
                        <span className="text-blue-600 font-medium">When</span> {ac.when || '...'}
                      </p>
                      <p>
                        <span className="text-purple-600 font-medium">Then</span> {ac.then || '...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No acceptance criteria defined</p>
            )}
          </div>

          {/* Definition of Done */}
          <div>
            <h4 className="font-semibold mb-3">Definition of Done</h4>
            <div className="space-y-2">
              {data.definitionOfDone.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                    {item.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Related Items */}
          {data.relatedItems.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Related Items</h4>
              <div className="flex flex-wrap gap-2">
                {data.relatedItems.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div>
              <h4 className="font-semibold mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Version: {data.version}</span>
              <span>Status: {data.status}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
