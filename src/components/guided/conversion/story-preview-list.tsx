'use client'

import { FileText } from 'lucide-react'
import { StoryPreviewCard } from './story-preview-card'
import type { GeneratedStory } from '@/stores/guided-creator-store'

interface Props {
  stories: GeneratedStory[]
  onAccept: (storyId: string) => void
  onEdit: (storyId: string) => void
  onDelete: (storyId: string) => void
  onChat: (storyId: string) => void
}

export function StoryPreviewList({
  stories,
  onAccept,
  onEdit,
  onDelete,
  onChat,
}: Props) {
  if (stories.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No stories generated yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">
        {stories.length} User {stories.length === 1 ? 'Story' : 'Stories'} Generated
      </p>
      <div className="space-y-3">
        {stories.map((story, index) => (
          <StoryPreviewCard
            key={story.id}
            story={story}
            index={index}
            totalStories={stories.length}
            onAccept={() => onAccept(story.id)}
            onEdit={() => onEdit(story.id)}
            onDelete={() => onDelete(story.id)}
            onChat={() => onChat(story.id)}
          />
        ))}
      </div>
    </div>
  )
}
