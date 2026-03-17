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
import { renderMarkdown } from '@/lib/render-markdown'
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
      if (c.if || c.then || c.else) {
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
      // Fallback: render each top-level key; detect nested condition objects
      return (
        <div className="space-y-2 text-sm" role="region" aria-label="Rule Statement">
          {Object.entries(content).map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
            // Detect object whose values are condition objects (condition1, condition2…)
            if (
              value !== null &&
              typeof value === 'object' &&
              !Array.isArray(value) &&
              Object.keys(value as object).some(k => /^condition\d+$/i.test(k))
            ) {
              return (
                <div key={key}>
                  <span className="font-semibold capitalize">{label}:</span>
                  <div className="mt-1 space-y-1 pl-3 border-l-2 border-muted">
                    {Object.entries(value as Record<string, unknown>).map(([ck, cv]) => {
                      const cond = cv as Record<string, unknown>
                      return (
                        <div key={ck} className="text-xs space-y-0.5">
                          <span className="font-medium capitalize">{ck.replace(/_/g, ' ')}:</span>
                          {cond.if && <div><span className="text-blue-600 font-semibold">IF</span> {String(cond.if)}</div>}
                          {cond.then && (
                            <div><span className="text-green-600 font-semibold">THEN</span>{' '}
                              {Array.isArray(cond.then) ? (cond.then as string[]).join('; ') : String(cond.then)}
                            </div>
                          )}
                          {cond.else && <div><span className="text-orange-600 font-semibold">ELSE</span> {String(cond.else)}</div>}
                          {cond.priority && <div className="text-muted-foreground">Priority: {String(cond.priority)}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }
            return (
              <div key={key}>
                <span className="font-semibold capitalize">{label}:</span>{' '}
                {typeof value === 'string'
                  ? value
                  : Array.isArray(value)
                    ? (() => {
                        const arr = value as unknown[]
                        if (arr.length === 0) return <span className="text-muted-foreground">None</span>
                        if (typeof arr[0] !== 'object') return <span>{(arr as string[]).join(', ')}</span>
                        // Array of objects — render as indented sub-field blocks
                        return (
                          <div className="mt-1 pl-3 border-l-2 border-muted space-y-1">
                            {(arr as Record<string, unknown>[]).map((item, idx) => (
                              <div key={idx} className="text-xs space-y-0.5">
                                {Object.entries(item).map(([k, v]) => (
                                  <div key={k}>
                                    <span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                                    {Array.isArray(v) ? (v as string[]).join('; ') : String(v)}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    : JSON.stringify(value)}
              </div>
            )
          })}
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
      // Find the first array value in content; AI may use any key name
      let rawItems: unknown[] = []
      for (const val of Object.values(content)) {
        if (Array.isArray(val)) {
          rawItems = val
          break
        }
      }
      // Escape-hatch: content was captured as { text: "..." } — render as formatted markdown
      if (rawItems.length === 0 && typeof content.text === 'string') {
        return (
          <div className="text-sm">{renderMarkdown(content.text)}</div>
        )
      }
      // If no array found, treat all content values as bullet items
      if (rawItems.length === 0) {
        rawItems = Object.entries(content).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      }
      return (
        <div className="space-y-2 text-sm">
          {rawItems.map((item, i) => {
            if (typeof item === 'string') {
              return <div key={i} className="flex gap-2"><span className="text-muted-foreground mt-0.5">•</span><span>{item}</span></div>
            }
            // Object item — render as a labeled card
            const obj = item as Record<string, unknown>
            return (
              <div key={i} className="pl-3 border-l-2 border-muted space-y-0.5">
                {Object.entries(obj).map(([k, v]) => (
                  <div key={k}>
                    <span className="font-semibold capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                    <span>{typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join(', ') : JSON.stringify(v)}</span>
                  </div>
                ))}
              </div>
            )
          })}
          {rawItems.length === 0 && <span className="text-muted-foreground">None defined</span>}
        </div>
      )
    }
    case 'basicInfo':
      return (
        <div className="space-y-2 text-sm">
          {Object.entries(content).map(([key, value]) => (
            <div key={key}>
              <span className="font-semibold capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
              </span>{' '}
              {typeof value === 'string'
                ? value
                : typeof value === 'number' || typeof value === 'boolean'
                  ? String(value)
                  : Array.isArray(value)
                    ? (value as unknown[]).map(i => typeof i === 'string' ? i : JSON.stringify(i)).join(', ')
                    : value !== null && typeof value === 'object'
                      ? JSON.stringify(value)
                      : ''}
            </div>
          ))}
        </div>
      )
    case 'description': {
      return (
        <div className="space-y-2 text-sm">
          {Object.entries(content).map(([key, value]) => (
            <div key={key}>
              <span className="font-semibold capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
              </span>{' '}
              <span className="text-foreground">
                {typeof value === 'string'
                  ? value
                  : Array.isArray(value)
                    ? (value as unknown[]).map(i => typeof i === 'string' ? i : JSON.stringify(i)).join(', ')
                    : value !== null && typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value ?? '')}
              </span>
            </div>
          ))}
        </div>
      )
    }
    case 'metadata': {
      // Escape-hatch: captured as { text } blob
      if (typeof content.text === 'string') {
        return <div className="text-sm">{renderMarkdown(content.text)}</div>
      }
      return (
        <div className="space-y-3 text-sm">
          {Object.entries(content).map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
            // Owners / array of objects — render as role cards
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
              return (
                <div key={key}>
                  <span className="font-semibold capitalize">{label}:</span>
                  <div className="mt-1 space-y-1 pl-3 border-l-2 border-muted">
                    {(value as Record<string, unknown>[]).map((item, idx) => (
                      <div key={idx} className="text-xs space-y-0.5">
                        {Object.entries(item).map(([k, v]) => (
                          <div key={k}>
                            <span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                            {typeof v === 'string' ? v : String(v)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <div key={key}>
                <span className="font-semibold capitalize">{label}:</span>{' '}
                {typeof value === 'string'
                  ? value
                  : Array.isArray(value)
                    ? (value as string[]).join(', ')
                    : value !== null && typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value ?? '')}
              </div>
            )
          })}
        </div>
      )
    }
    default:
      // Escape-hatch: { text } payload — render with markdown
      if (typeof content.text === 'string') {
        return <div className="text-sm">{renderMarkdown(content.text)}</div>
      }
      return (
        <div className="space-y-1 text-sm">
          {Object.entries(content).map(([key, value]) => (
            <div key={key}>
              <span className="font-semibold capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
              </span>{' '}
              <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      )
  }
}
