'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { useGuidedChat } from '@/hooks/use-guided-chat'
import { ConversationPanel } from './conversation-panel'
import { DocumentPanel } from './document-panel'
import { GuidedErrorBoundary } from './guided-error-boundary'
import { Button } from '@/components/ui/button'
import { Save, X, Loader2 } from 'lucide-react'
import { startAutoSave, stopAutoSave, checkForUnsavedDraft, clearDraft } from '@/lib/guided/auto-save'

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
  const {
    initSession,
    restoreFromAutoSave,
    overallCompletion,
    canSaveDraft,
    publishSuggestion,
    showPublishSuggestion,
    undoLastChange,
    redoLastChange,
  } = useGuidedCreatorStore()
  const { saveDraft } = useGuidedChat()
  const [isSaving, setIsSaving] = useState(false)
  // Track last completion that triggered suggestion to avoid re-firing on each render
  const suggestionFiredAt = useRef<number | null>(null)

  useEffect(() => {
    // B2: Check for unsaved draft on mount — show Sonner toast with recovery option
    const draft = checkForUnsavedDraft()
    if (draft) {
      const savedDate = new Date(draft.savedAt)
      const timeStr = savedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      toast('Unsaved draft found', {
        description: `Draft from ${timeStr} — resume where you left off?`,
        action: {
          label: 'Resume',
          onClick: () => {
            restoreFromAutoSave(draft.state)
            clearDraft()
          },
        },
        cancel: { label: 'Dismiss', onClick: clearDraft },
        duration: 10_000,
      })
    }

    // B2: Start auto-save loop; stop it on unmount
    startAutoSave(() => useGuidedCreatorStore.getState() as unknown as Record<string, unknown>)
    return () => stopAutoSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // D1: Global keyboard shortcuts for undo (Ctrl+Z / Meta+Z) and redo (Ctrl+Y / Meta+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoLastChange()
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redoLastChange()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoLastChange, redoLastChange])

  useEffect(() => {
    initSession(documentType)
  }, [documentType, initSession])

  // A2: Fire publish suggestion trigger when completion reaches ≥80%
  // Guard: not dismissed, and remindLater respected with timestamp comparison
  useEffect(() => {
    const { dismissed, remindLater, remindAt } = publishSuggestion
    if (overallCompletion < 80) return
    if (dismissed) return
    if (remindLater) {
      if (!remindAt || Date.now() <= new Date(remindAt).getTime()) return
    }
    // Only fire once per completion threshold crossing
    if (suggestionFiredAt.current === overallCompletion) return
    suggestionFiredAt.current = overallCompletion
    showPublishSuggestion()
  }, [overallCompletion, publishSuggestion, showPublishSuggestion])

  return (
    <div className="flex flex-col h-full">
      {/* C4: Skip navigation links for keyboard users */}
      <a
        href="#conversation-panel"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-background focus:text-foreground focus:underline"
      >
        Skip to conversation
      </a>
      <a
        href="#document-panel"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-background focus:text-foreground focus:underline focus:top-8"
      >
        Skip to document
      </a>
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

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div id="conversation-panel" className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r">
          <GuidedErrorBoundary panelName="Conversation Panel">
            <ConversationPanel />
          </GuidedErrorBoundary>
        </div>
        <div id="document-panel" className="w-full lg:w-1/2">
          <GuidedErrorBoundary panelName="Document Panel">
            <DocumentPanel />
          </GuidedErrorBoundary>
        </div>
      </div>
    </div>
  )
}
