'use client'

import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { Button } from '@/components/ui/button'
import { Check, Pencil, RefreshCw, SkipForward } from 'lucide-react'
import type { DocumentSection } from '@/stores/guided-creator-store'

interface Props {
  section: DocumentSection
  onAccept?: () => void
  onEdit?: () => void
  onRegenerate?: () => void
  onSkip?: () => void
}

export function ActionBar({ section, onAccept, onEdit, onRegenerate, onSkip }: Props) {
  const { acceptDraft, editSection } = useGuidedCreatorStore()

  return (
    <div className="border-t border-b bg-muted/50 px-4 py-3">
      <p className="text-sm text-muted-foreground mb-2">
        Review the proposed draft above:
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onAccept ?? (() => acceptDraft(section))}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit ?? (() => editSection(section))}
          className="flex-1"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRegenerate}
          aria-label="Regenerate"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onSkip}
          aria-label="Skip section"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
