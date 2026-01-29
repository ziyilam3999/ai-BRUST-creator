'use client'

import { useWizardStore } from '@/stores/wizard-store'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function RuleStatementStep() {
  const { data, updateData } = useWizardStore()

  const handleUpdate = (field: 'if' | 'then' | 'else', value: string) => {
    updateData({
      ruleStatement: {
        ...data.ruleStatement,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="if-condition">IF (Condition)</Label>
        <Textarea
          id="if-condition"
          placeholder="The condition that triggers this rule..."
          value={data.ruleStatement.if}
          onChange={(e) => handleUpdate('if', e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="then-action">THEN (Action)</Label>
        <Textarea
          id="then-action"
          placeholder="The action to take when condition is met..."
          value={data.ruleStatement.then}
          onChange={(e) => handleUpdate('then', e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="else-action">ELSE (Alternative Action) - Optional</Label>
        <Textarea
          id="else-action"
          placeholder="The action to take when condition is NOT met..."
          value={data.ruleStatement.else || ''}
          onChange={(e) => handleUpdate('else', e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )
}
