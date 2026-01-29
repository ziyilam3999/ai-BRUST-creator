'use client'

import { useUserStoryWizardStore } from '@/stores/user-story-wizard-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserStoryPriority } from '@/types/user-story'

export function USBasicInfoStep() {
  const { data, updateData } = useUserStoryWizardStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="storyId">Story ID</Label>
          <Input
            id="storyId"
            placeholder="US-AUTH-001"
            value={data.storyId}
            onChange={(e) => updateData({ storyId: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Format: US-[Epic]-[Number]
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="epic">Epic</Label>
          <Input
            id="epic"
            placeholder="Authentication"
            value={data.epic}
            onChange={(e) => updateData({ epic: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Story Title</Label>
        <Input
          id="title"
          placeholder="User Login with GitHub OAuth"
          value={data.title}
          onChange={(e) => updateData({ title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority (MoSCoW)</Label>
        <Select
          value={data.priority}
          onValueChange={(value: UserStoryPriority) => updateData({ priority: value })}
        >
          <SelectTrigger id="priority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="must">Must Have</SelectItem>
            <SelectItem value="should">Should Have</SelectItem>
            <SelectItem value="could">Could Have</SelectItem>
            <SelectItem value="wont">Won&apos;t Have (this time)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
