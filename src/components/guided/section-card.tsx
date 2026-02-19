'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { DocumentSection, SectionState } from '@/stores/guided-creator-store'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { cn } from '@/lib/utils'
import { CheckCircle, Circle, Pencil, Save, X } from 'lucide-react'

interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'date' | 'list'
  placeholder?: string
  options?: string[]
}

const BR_SECTION_FIELDS: Record<string, FieldConfig[]> = {
  basicInfo: [
    { key: 'ruleId', label: 'Rule ID', type: 'text', placeholder: 'BR-001' },
    { key: 'ruleName', label: 'Rule Name', type: 'text', placeholder: 'Enter rule name' },
    { key: 'category', label: 'Category', type: 'select', options: ['Data Validation', 'Authorization', 'Calculation', 'Workflow', 'Integration'] },
    { key: 'priority', label: 'Priority', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
  ],
  description: [
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe what this rule does...' },
  ],
  ruleStatement: [
    { key: 'if', label: 'IF (Condition)', type: 'textarea', placeholder: 'When this condition is true...' },
    { key: 'then', label: 'THEN (Action)', type: 'textarea', placeholder: 'Do this action...' },
    { key: 'else', label: 'ELSE (Alternative)', type: 'textarea', placeholder: 'Otherwise do this... (optional)' },
  ],
  exceptions: [
    { key: 'exceptions', label: 'Exceptions', type: 'list', placeholder: 'Add exception...' },
  ],
  examples: [
    { key: 'examples', label: 'Examples', type: 'list', placeholder: 'Describe scenario...' },
  ],
  metadata: [
    { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Person or team' },
    { key: 'source', label: 'Source', type: 'text', placeholder: 'Where this requirement came from' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date' },
  ],
}

const US_SECTION_FIELDS: Record<string, FieldConfig[]> = {
  basicInfo: [
    { key: 'storyId', label: 'Story ID', type: 'text', placeholder: 'US-001' },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'Enter story title' },
    { key: 'epic', label: 'Epic', type: 'text', placeholder: 'Parent epic (optional)' },
    { key: 'priority', label: 'Priority', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
  ],
  storyStatement: [
    { key: 'asA', label: 'As a...', type: 'text', placeholder: 'type of user' },
    { key: 'iWant', label: 'I want...', type: 'textarea', placeholder: 'some goal or action' },
    { key: 'soThat', label: 'So that...', type: 'textarea', placeholder: 'benefit or value' },
  ],
  acceptanceCriteria: [
    { key: 'criteria', label: 'Acceptance Criteria', type: 'list', placeholder: 'Given/When/Then...' },
  ],
  definitionOfDone: [
    { key: 'items', label: 'Definition of Done', type: 'list', placeholder: 'Add checklist item...' },
  ],
  relatedItems: [
    { key: 'businessRules', label: 'Related Business Rules', type: 'list', placeholder: 'Add related BR...' },
    { key: 'userStories', label: 'Related User Stories', type: 'list', placeholder: 'Add related US...' },
  ],
}

const SECTION_LABELS: Record<string, string> = {
  basicInfo: 'Basic Information',
  description: 'Description',
  ruleStatement: 'Rule Statement',
  exceptions: 'Exceptions',
  examples: 'Examples',
  metadata: 'Metadata',
  storyStatement: 'Story Statement',
  acceptanceCriteria: 'Acceptance Criteria',
  definitionOfDone: 'Definition of Done',
  relatedItems: 'Related Items',
}

interface Props {
  section: DocumentSection
  state: SectionState
  isActive: boolean
}

export function SectionCard({ section, state, isActive }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, unknown>>(state.content)
  const { updateSection, isManualEditBlocked, documentType } = useGuidedCreatorStore()

  const fieldMap = documentType === 'business_rule' ? BR_SECTION_FIELDS : US_SECTION_FIELDS
  const fields = fieldMap[section] || []

  const handleSave = () => {
    updateSection(section, { content: editValues, userAccepted: true })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValues(state.content)
    setIsEditing(false)
  }

  const statusIcon = {
    not_started: <Circle className="w-4 h-4 text-muted-foreground" />,
    in_progress: <Pencil className="w-4 h-4 text-blue-500" />,
    draft: <CheckCircle className="w-4 h-4 text-yellow-500" />,
    complete: <CheckCircle className="w-4 h-4 text-green-500" />,
  }

  return (
    <Card
      role="region"
      aria-label={SECTION_LABELS[section] || section}
      className={cn(
        'transition-all',
        isActive && 'ring-2 ring-primary',
        state.status === 'not_started' && 'opacity-60'
      )}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusIcon[state.status]}
            <CardTitle className="text-sm font-medium">
              {SECTION_LABELS[section] || section}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {state.completionPercent}%
            </span>
            <Progress value={state.completionPercent} className="w-16 h-2" />
            {state.status !== 'not_started' && !isEditing && !isManualEditBlocked && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setEditValues(state.content)
                  setIsEditing(true)
                }}
                aria-label={`Edit ${SECTION_LABELS[section] || section}`}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {state.status !== 'not_started' && (
        <CardContent className="py-2 px-4 border-t bg-muted/30 space-y-3">
          {isEditing ? (
            <>
              {fields.map((field) => (
                <FieldEditor
                  key={field.key}
                  field={field}
                  value={editValues[field.key]}
                  onChange={(value) => setEditValues({ ...editValues, [field.key]: value })}
                />
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
            </>
          ) : (
            <SectionDisplay section={section} content={state.content} />
          )}
        </CardContent>
      )}
    </Card>
  )
}

function FieldEditor({ field, value, onChange }: {
  field: FieldConfig
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (field.type) {
    case 'text':
      return (
        <div>
          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="mt-1"
            aria-label={field.label}
          />
        </div>
      )
    case 'textarea':
      return (
        <div>
          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="mt-1 min-h-[60px]"
            aria-label={field.label}
          />
        </div>
      )
    case 'select':
      return (
        <div>
          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 w-full rounded-md border p-2 text-sm"
            aria-label={field.label}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    case 'date':
      return (
        <div>
          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1"
            aria-label={field.label}
          />
        </div>
      )
    case 'list': {
      const items = (value as string[]) || []
      return (
        <div>
          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
          <div className="mt-1 space-y-1">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{item}</span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground">No items yet</p>
            )}
          </div>
        </div>
      )
    }
    default:
      return null
  }
}

function SectionDisplay({ section, content }: { section: string; content: Record<string, unknown> }) {
  if (Object.keys(content).length === 0) {
    return <p className="text-sm text-muted-foreground">No content yet</p>
  }

  switch (section) {
    case 'ruleStatement': {
      const c = content as { if?: string; then?: string; else?: string }
      return (
        <div className="space-y-2 text-sm" role="region" aria-label="Rule Statement">
          {c.if && (
            <div><span className="font-semibold text-blue-600">IF:</span> {c.if}</div>
          )}
          {c.then && (
            <div><span className="font-semibold text-green-600">THEN:</span> {c.then}</div>
          )}
          {c.else && (
            <div><span className="font-semibold text-orange-600">ELSE:</span> {c.else}</div>
          )}
        </div>
      )
    }
    case 'storyStatement': {
      const c = content as { asA?: string; iWant?: string; soThat?: string }
      return (
        <div className="space-y-1 text-sm">
          {c.asA && <div><span className="font-semibold">As a</span> {c.asA}</div>}
          {c.iWant && <div><span className="font-semibold">I want</span> {c.iWant}</div>}
          {c.soThat && <div><span className="font-semibold">So that</span> {c.soThat}</div>}
        </div>
      )
    }
    case 'exceptions':
    case 'examples':
    case 'acceptanceCriteria':
    case 'definitionOfDone': {
      const listKey = Object.keys(content)[0]
      const items = (content[listKey] as string[]) || []
      return (
        <ul className="list-disc list-inside text-sm space-y-1">
          {items.map((item, i) => <li key={i}>{item}</li>)}
          {items.length === 0 && <li className="text-muted-foreground">None defined</li>}
        </ul>
      )
    }
    case 'basicInfo':
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(content).map(([key, value]) => (
            <div key={key}>
              <span className="text-muted-foreground">{key}:</span> {value as string}
            </div>
          ))}
        </div>
      )
    default:
      return (
        <div className="text-sm">
          {Object.entries(content).map(([key, value]) => (
            <div key={key}>{typeof value === 'string' ? value : JSON.stringify(value)}</div>
          ))}
        </div>
      )
  }
}
