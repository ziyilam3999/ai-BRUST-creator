'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { GeneratedStory } from '@/stores/guided-creator-store'
import type { UserStoryData } from '@/types/user-story'

interface Props {
  story: GeneratedStory
  open: boolean
  onSave: (data: UserStoryData) => void
  onCancel: () => void
}

export function StoryEditorModal({ story, open, onSave, onCancel }: Props) {
  const [formData, setFormData] = useState<UserStoryData>(story.data)

  const handleStatementChange = (field: 'role' | 'feature' | 'benefit', value: string) => {
    setFormData((prev) => ({
      ...prev,
      storyStatement: { ...prev.storyStatement, [field]: value },
    }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storyId">Story ID</Label>
              <Input
                id="storyId"
                value={formData.storyId}
                onChange={(e) => setFormData((prev) => ({ ...prev, storyId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
          </div>

          {/* Story Statement */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Story Statement</p>
            <div>
              <Label htmlFor="role">As a...</Label>
              <Input
                id="role"
                value={formData.storyStatement.role}
                onChange={(e) => handleStatementChange('role', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="feature">I want...</Label>
              <Input
                id="feature"
                value={formData.storyStatement.feature}
                onChange={(e) => handleStatementChange('feature', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="benefit">So that...</Label>
              <Input
                id="benefit"
                value={formData.storyStatement.benefit}
                onChange={(e) => handleStatementChange('benefit', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
