'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { GeneratedStory } from '@/stores/guided-creator-store'
import type { AcceptanceCriterion, UserStoryData } from '@/types/user-story'

interface Props {
  story: GeneratedStory
  open: boolean
  onSave: (data: UserStoryData) => void
  onCancel: () => void
}

export function StoryEditorModal({ story, open, onSave, onCancel }: Props) {
  const [formData, setFormData] = useState<UserStoryData>(story.data)
  const [notesOpen, setNotesOpen] = useState(false)

  const handleStatementChange = (field: 'role' | 'feature' | 'benefit', value: string) => {
    setFormData((prev) => ({
      ...prev,
      storyStatement: { ...prev.storyStatement, [field]: value },
    }))
  }

  const handleACChange = (index: number, field: keyof AcceptanceCriterion, value: string) => {
    setFormData((prev) => {
      const updated = prev.acceptanceCriteria.map((ac, i) =>
        i === index ? { ...ac, [field]: value } : ac
      )
      return { ...prev, acceptanceCriteria: updated }
    })
  }

  const handleACAdd = () => {
    const newAC: AcceptanceCriterion = {
      id: String(Date.now()),
      scenario: '',
      given: '',
      when: '',
      then: '',
    }
    setFormData((prev) => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, newAC],
    }))
  }

  const handleACRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index),
    }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* ── Basic Info ───────────────────────────────────── */}
          <div className="grid grid-cols-[160px_1fr] gap-4">
            <div>
              <Label htmlFor="storyId">Story ID</Label>
              <Input
                id="storyId"
                value={formData.storyId}
                onChange={(e) => setFormData((prev) => ({ ...prev, storyId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Textarea
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* ── Story Statement ──────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Story Statement</p>
            <div>
              <Label htmlFor="role">As a...</Label>
              <Input
                id="role"
                value={formData.storyStatement.role}
                onChange={(e) => handleStatementChange('role', e.target.value)}
                placeholder="persona or user type"
              />
            </div>
            <div>
              <Label htmlFor="feature">I want...</Label>
              <Textarea
                id="feature"
                value={formData.storyStatement.feature}
                onChange={(e) => handleStatementChange('feature', e.target.value)}
                rows={3}
                className="resize-y"
                placeholder="describe the capability or action"
              />
            </div>
            <div>
              <Label htmlFor="benefit">So that...</Label>
              <Textarea
                id="benefit"
                value={formData.storyStatement.benefit}
                onChange={(e) => handleStatementChange('benefit', e.target.value)}
                rows={2}
                className="resize-y"
                placeholder="describe the value or outcome"
              />
            </div>
          </div>

          {/* ── Acceptance Criteria ──────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Acceptance Criteria
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({formData.acceptanceCriteria.length})
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleACAdd}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add Criterion
              </Button>
            </div>

            {formData.acceptanceCriteria.length === 0 && (
              <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No acceptance criteria yet. Click &ldquo;Add Criterion&rdquo; to add one.
              </p>
            )}

            {formData.acceptanceCriteria.map((ac, index) => (
              <div
                key={ac.id}
                className="relative rounded-lg border bg-muted/30 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`ac-scenario-${index}`} className="text-xs text-muted-foreground">
                      Scenario
                    </Label>
                    <Input
                      id={`ac-scenario-${index}`}
                      value={ac.scenario}
                      onChange={(e) => handleACChange(index, 'scenario', e.target.value)}
                      placeholder="e.g. Balance below threshold"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleACRemove(index)}
                    className="mt-5 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove criterion"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`ac-given-${index}`} className="text-xs text-muted-foreground">
                      Given
                    </Label>
                    <Textarea
                      id={`ac-given-${index}`}
                      value={ac.given}
                      onChange={(e) => handleACChange(index, 'given', e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                      placeholder="initial context"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`ac-when-${index}`} className="text-xs text-muted-foreground">
                      When
                    </Label>
                    <Textarea
                      id={`ac-when-${index}`}
                      value={ac.when}
                      onChange={(e) => handleACChange(index, 'when', e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                      placeholder="action or event"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`ac-then-${index}`} className="text-xs text-muted-foreground">
                      Then
                    </Label>
                    <Textarea
                      id={`ac-then-${index}`}
                      value={ac.then}
                      onChange={(e) => handleACChange(index, 'then', e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                      placeholder="expected outcome"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Internal Notes (collapsible) ─────────────────── */}
          <div className="rounded-md border">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
              onClick={() => setNotesOpen((v) => !v)}
              aria-expanded={notesOpen}
            >
              <span>Internal Notes</span>
              {notesOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {notesOpen && (
              <div className="px-4 pb-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Traceability info or additional context (e.g. source business rule). Not visible on user-facing outputs.
                </p>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="resize-y"
                  placeholder="e.g. Generated from Business Rule: Account Balance Withdrawal Rule"
                />
              </div>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
