'use client'

import { useEffect } from 'react'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { ConversationPanel } from './conversation-panel'
import { DocumentPanel } from './document-panel'
import { Button } from '@/components/ui/button'
import { Save, X } from 'lucide-react'

interface Props {
  documentType: 'business_rule' | 'user_story'
  onClose?: () => void
  onSave?: () => void
}

const TYPE_LABELS = {
  business_rule: 'Business Rule',
  user_story: 'User Story',
}

export function GuidedCreatorContainer({ documentType, onClose, onSave }: Props) {
  const { initSession, overallCompletion, canSaveDraft } = useGuidedCreatorStore()

  useEffect(() => {
    initSession(documentType)
  }, [documentType, initSession])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            {TYPE_LABELS[documentType]}
          </h1>
          <span className="text-sm text-muted-foreground">
            {overallCompletion}% Complete
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!canSaveDraft}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r">
          <ConversationPanel />
        </div>
        <div className="w-1/2">
          <DocumentPanel />
        </div>
      </div>
    </div>
  )
}
