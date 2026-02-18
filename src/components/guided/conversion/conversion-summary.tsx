'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Plus, Save } from 'lucide-react'
import { useGuidedCreatorStore, type GeneratedStory } from '@/stores/guided-creator-store'

interface Props {
  stories: GeneratedStory[]
  onSaveAll: () => void
  onAddManual: () => void
  isSaving?: boolean
}

export function ConversionSummary({ stories, onSaveAll, onAddManual, isSaving }: Props) {
  const { showPublishSuggestion } = useGuidedCreatorStore()
  const acceptedCount = stories.filter((s) => s.status === 'accepted').length
  const totalCount = stories.length

  // A3: After successful save, trigger the publish suggestion
  const handleSaveAll = () => {
    onSaveAll()
    if (totalCount > 0) {
      showPublishSuggestion()
    }
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Conversion Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {acceptedCount} of {totalCount} accepted
          </span>
          <Badge variant={acceptedCount === totalCount ? 'default' : 'secondary'}>
            {acceptedCount === totalCount ? 'All Accepted' : 'In Progress'}
          </Badge>
        </div>

        {/* Story Status List */}
        <div className="space-y-1">
          {stories.map((story, i) => (
            <div key={story.id} className="flex items-center justify-between text-sm py-1">
              <span>
                #{i + 1} {story.data.title || story.data.storyId || `Story ${i + 1}`}
              </span>
              <Badge
                variant="outline"
                className={
                  story.status === 'accepted'
                    ? 'text-green-600 border-green-600'
                    : story.status === 'editing'
                    ? 'text-blue-600 border-blue-600'
                    : ''
                }
              >
                {story.status}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleSaveAll} className="flex-1" disabled={isSaving || totalCount === 0}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save All Stories'}
          </Button>
          <Button variant="outline" onClick={onAddManual}>
            <Plus className="w-4 h-4 mr-2" />
            Add Manual Story
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
