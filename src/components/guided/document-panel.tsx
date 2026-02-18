'use client'

import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { SectionCard } from './section-card'
import { CompletionSummary } from './completion-summary'
import type { DocumentSection } from '@/stores/guided-creator-store'
import { Button } from '@/components/ui/button'
import { Undo2, Redo2 } from 'lucide-react'

const BR_SECTIONS: DocumentSection[] = ['basicInfo', 'description', 'ruleStatement', 'exceptions', 'examples', 'metadata']
const US_SECTIONS: DocumentSection[] = ['basicInfo', 'storyStatement', 'acceptanceCriteria', 'definitionOfDone', 'relatedItems']

export function DocumentPanel() {
  const { documentType, sections, currentSection, canUndo, canRedo, undoLastChange, redoLastChange } = useGuidedCreatorStore()

  const sectionList = documentType === 'business_rule' ? BR_SECTIONS : US_SECTIONS

  return (
    <div className="flex flex-col h-full">
      {/* D1: Undo/Redo toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={undoLastChange}
          disabled={!canUndo}
          aria-label="Undo last change"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redoLastChange}
          disabled={!canRedo}
          aria-label="Redo last change"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sectionList.map((section) => {
          const state = sections[section]
          if (!state) return null
          return (
            <SectionCard
              key={section}
              section={section}
              state={state}
              isActive={currentSection === section}
            />
          )
        })}
      </div>

      <div className="border-t">
        <CompletionSummary />
      </div>
    </div>
  )
}
