'use client'

import { useState } from 'react'
import { useUserStoryWizardStore } from '@/stores/user-story-wizard-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Plus } from 'lucide-react'

export function USDefinitionOfDoneStep() {
  const { data, toggleDoDItem, addDoDItem, removeDoDItem } = useUserStoryWizardStore()
  const [newItem, setNewItem] = useState('')

  const handleAddItem = () => {
    if (newItem.trim()) {
      addDoDItem(newItem.trim())
      setNewItem('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Define what needs to be true for this story to be considered &quot;done&quot;.
        Check items as they are completed during development.
      </p>

      <div className="space-y-3">
        {data.definitionOfDone.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              id={`dod-${item.id}`}
              checked={item.completed}
              onCheckedChange={() => toggleDoDItem(item.id)}
            />
            <Label
              htmlFor={`dod-${item.id}`}
              className={`flex-1 cursor-pointer ${
                item.completed ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {item.description}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeDoDItem(item.id)}
              className="text-destructive hover:text-destructive opacity-50 hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add custom requirement..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button onClick={handleAddItem} disabled={!newItem.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <p className="text-sm text-green-800">
          <strong>Tip:</strong> Common DoD items include code review, testing, documentation,
          and deployment verification. Add any project-specific requirements as needed.
        </p>
      </div>
    </div>
  )
}
