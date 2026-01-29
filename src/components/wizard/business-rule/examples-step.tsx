'use client'

import { useState } from 'react'
import { useWizardStore } from '@/stores/wizard-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'
import type { RuleExample } from '@/types/business-rule'

export function ExamplesStep() {
  const { data, updateData } = useWizardStore()
  const [newExample, setNewExample] = useState<RuleExample>({
    scenario: '',
    isValid: true,
    description: '',
  })

  const addExample = () => {
    if (newExample.scenario.trim() && newExample.description.trim()) {
      updateData({
        examples: [...data.examples, newExample],
      })
      setNewExample({ scenario: '', isValid: true, description: '' })
    }
  }

  const removeExample = (index: number) => {
    updateData({
      examples: data.examples.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 border rounded-md">
        <h3 className="font-medium">Add Example</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="scenario">Scenario Name</Label>
            <Input
              id="scenario"
              placeholder="Valid email format"
              value={newExample.scenario}
              onChange={(e) =>
                setNewExample({ ...newExample, scenario: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validity">Is Valid?</Label>
            <Select
              value={newExample.isValid ? 'valid' : 'invalid'}
              onValueChange={(value) =>
                setNewExample({ ...newExample, isValid: value === 'valid' })
              }
            >
              <SelectTrigger id="validity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="example-description">Description</Label>
          <Input
            id="example-description"
            placeholder="user@example.com"
            value={newExample.description}
            onChange={(e) =>
              setNewExample({ ...newExample, description: e.target.value })
            }
          />
        </div>

        <Button type="button" onClick={addExample}>
          Add Example
        </Button>
      </div>

      {data.examples.length > 0 && (
        <div className="space-y-2">
          <Label>Examples List</Label>
          <ul className="space-y-2">
            {data.examples.map((example, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-md"
              >
                <div>
                  <span className="font-medium">{example.scenario}</span>
                  <span
                    className={`ml-2 text-xs px-2 py-1 rounded ${
                      example.isValid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {example.isValid ? 'Valid' : 'Invalid'}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {example.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExample(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.examples.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No examples added yet. This step is optional.
        </p>
      )}
    </div>
  )
}
