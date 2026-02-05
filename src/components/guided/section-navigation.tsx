'use client'

import { Button } from '@/components/ui/button'
import type { DocumentSection, SectionState } from '@/stores/guided-creator-store'
import { cn } from '@/lib/utils'
import { CheckCircle, Circle, Pencil } from 'lucide-react'

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
  sections: string[]
  sectionStates: Record<DocumentSection, SectionState>
  currentSection: string
  onNavigate: (section: string) => void
}

export function SectionNavigation({ sections, sectionStates, currentSection, onNavigate }: Props) {
  return (
    <nav className="flex overflow-x-auto p-2 gap-1" aria-label="Document sections">
      {sections.map((section) => {
        const state = sectionStates[section as DocumentSection]
        const isActive = currentSection === section
        const statusIcon = {
          not_started: <Circle className="w-3 h-3" />,
          in_progress: <Pencil className="w-3 h-3" />,
          draft: <CheckCircle className="w-3 h-3 text-yellow-500" />,
          complete: <CheckCircle className="w-3 h-3 text-green-500" />,
        }

        return (
          <Button
            key={section}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'flex items-center gap-1 whitespace-nowrap text-xs',
              isActive && 'bg-primary text-primary-foreground'
            )}
            onClick={() => onNavigate(section)}
          >
            {state ? statusIcon[state.status] : <Circle className="w-3 h-3" />}
            {SECTION_LABELS[section] || section}
          </Button>
        )
      })}
    </nav>
  )
}
