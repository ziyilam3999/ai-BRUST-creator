'use client'

import { useState } from 'react'
import { useWizardStore } from '@/stores/wizard-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

export function MetadataStep() {
  const { data, updateData } = useWizardStore()
  const [newRelatedRule, setNewRelatedRule] = useState('')

  const addRelatedRule = () => {
    if (newRelatedRule.trim()) {
      updateData({
        relatedRules: [...data.relatedRules, newRelatedRule.trim()],
      })
      setNewRelatedRule('')
    }
  }

  const removeRelatedRule = (index: number) => {
    updateData({
      relatedRules: data.relatedRules.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            placeholder="Security Requirements v2.0"
            value={data.source}
            onChange={(e) => updateData({ source: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Document or regulation this rule comes from
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner">Owner</Label>
          <Input
            id="owner"
            placeholder="Platform Team"
            value={data.owner}
            onChange={(e) => updateData({ owner: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="effectiveDate">Effective Date</Label>
        <Input
          id="effectiveDate"
          type="date"
          value={data.effectiveDate}
          onChange={(e) => updateData({ effectiveDate: e.target.value })}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="relatedRule">Related Rules</Label>
          <div className="flex gap-2">
            <Input
              id="relatedRule"
              placeholder="BR-VAL-002"
              value={newRelatedRule}
              onChange={(e) => setNewRelatedRule(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addRelatedRule()
                }
              }}
            />
            <Button type="button" onClick={addRelatedRule}>
              Add
            </Button>
          </div>
        </div>

        {data.relatedRules.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.relatedRules.map((rule, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full"
              >
                {rule}
                <button
                  type="button"
                  onClick={() => removeRelatedRule(index)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
