'use client'

import { useState } from 'react'
import { useUserStoryWizardStore } from '@/stores/user-story-wizard-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'

export function USRelatedItemsStep() {
  const { data, updateData } = useUserStoryWizardStore()
  const [newItem, setNewItem] = useState('')

  const handleAddItem = () => {
    if (newItem.trim() && !data.relatedItems.includes(newItem.trim())) {
      updateData({
        relatedItems: [...data.relatedItems, newItem.trim()],
      })
      setNewItem('')
    }
  }

  const handleRemoveItem = (itemToRemove: string) => {
    updateData({
      relatedItems: data.relatedItems.filter((item) => item !== itemToRemove),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Related Items</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Link to related Business Rules, User Stories, or external resources.
          </p>

          <div className="flex gap-2 mb-3">
            <Input
              placeholder="BR-AUTH-001, US-DASH-002, or URL..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleAddItem} disabled={!newItem.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {data.relatedItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.relatedItems.map((item) => (
                <Badge key={item} variant="secondary" className="pl-3 pr-1 py-1">
                  {item}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-2 hover:bg-destructive/20"
                    onClick={() => handleRemoveItem(item)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No related items added yet
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional context, references, or notes for this story..."
          value={data.notes}
          onChange={(e) => updateData({ notes: e.target.value })}
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          Include any context that doesn&apos;t fit elsewhere, such as design references,
          technical constraints, or stakeholder feedback.
        </p>
      </div>
    </div>
  )
}
