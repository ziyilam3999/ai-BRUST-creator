'use client'

import { useWizardStore } from '@/stores/wizard-store'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function DescriptionStep() {
  const { data, updateData } = useWizardStore()

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what this rule accomplishes..."
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          Provide a clear description of the business rule&apos;s purpose and behavior.
        </p>
      </div>
    </div>
  )
}
