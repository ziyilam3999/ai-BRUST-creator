'use client'

import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { SectionCard } from './section-card'
import { CompletionSummary } from './completion-summary'
import type { DocumentSection } from '@/stores/guided-creator-store'

const BR_SECTIONS: DocumentSection[] = ['basicInfo', 'description', 'ruleStatement', 'exceptions', 'examples', 'metadata']
const US_SECTIONS: DocumentSection[] = ['basicInfo', 'storyStatement', 'acceptanceCriteria', 'definitionOfDone', 'relatedItems']

export function DocumentPanel() {
  const { documentType, sections, currentSection } = useGuidedCreatorStore()

  const sectionList = documentType === 'business_rule' ? BR_SECTIONS : US_SECTIONS

  return (
    <div className="flex flex-col h-full">
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
