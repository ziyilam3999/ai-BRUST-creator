'use client'

import { useEffect, useState } from 'react'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { useGuidedChat } from '@/hooks/use-guided-chat'
import { ConversationPanel } from './conversation-panel'
import { DocumentPanel } from './document-panel'
import { Button } from '@/components/ui/button'
import { Save, X, Loader2 } from 'lucide-react'

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
  const { saveDraft } = useGuidedChat()
  const [isSaving, setIsSaving] = useState(false)

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
            onClick={async () => {
              setIsSaving(true)
              try {
                await saveDraft()
                onSave?.()
              } catch {
                // Error handling delegated to parent or toast
              } finally {
                setIsSaving(false)
              }
            }}
            disabled={!canSaveDraft || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Draft'}
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
