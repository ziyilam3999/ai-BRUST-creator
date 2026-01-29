'use client'

import { useWizardStore } from '@/stores/wizard-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function BasicInfoStep() {
  const { data, updateData } = useWizardStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ruleId">Rule ID</Label>
          <Input
            id="ruleId"
            placeholder="BR-VAL-001"
            value={data.ruleId}
            onChange={(e) => updateData({ ruleId: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Format: BR-[Category]-[Number]
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruleName">Rule Name</Label>
          <Input
            id="ruleName"
            placeholder="Email Validation Rule"
            value={data.ruleName}
            onChange={(e) => updateData({ ruleName: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={data.category}
            onValueChange={(value) =>
              updateData({ category: value as 'validation' | 'calculation' | 'authorization' })
            }
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="validation">Validation</SelectItem>
              <SelectItem value="calculation">Calculation</SelectItem>
              <SelectItem value="authorization">Authorization</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={data.priority}
            onValueChange={(value) =>
              updateData({ priority: value as 'critical' | 'high' | 'medium' | 'low' })
            }
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
