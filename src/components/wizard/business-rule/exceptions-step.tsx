'use client'

import { useState } from 'react'
import { useWizardStore } from '@/stores/wizard-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

export function ExceptionsStep() {
  const { data, updateData } = useWizardStore()
  const [newException, setNewException] = useState('')

  const addException = () => {
    if (newException.trim()) {
      updateData({
        exceptions: [...data.exceptions, newException.trim()],
      })
      setNewException('')
    }
  }

  const removeException = (index: number) => {
    updateData({
      exceptions: data.exceptions.filter((_, i) => i !== index),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addException()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="exception">Add Exception</Label>
        <div className="flex gap-2">
          <Input
            id="exception"
            placeholder="Describe an exception case..."
            value={newException}
            onChange={(e) => setNewException(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button type="button" onClick={addException}>
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Press Enter or click Add to add an exception
        </p>
      </div>

      {data.exceptions.length > 0 && (
        <div className="space-y-2">
          <Label>Exceptions List</Label>
          <ul className="space-y-2">
            {data.exceptions.map((exception, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-md"
              >
                <span>{exception}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeException(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.exceptions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No exceptions added yet. This step is optional.
        </p>
      )}
    </div>
  )
}
