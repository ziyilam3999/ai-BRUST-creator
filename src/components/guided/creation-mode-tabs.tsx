'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { GuidedCreatorContainer } from './guided-creator-container'
import { WizardContainer } from '@/components/wizard/wizard-container'
import { UserStoryWizardContainer } from '@/components/wizard/user-story-wizard-container'

type CreationMode = 'guided' | 'expert'

interface Props {
  documentType: 'business_rule' | 'user_story'
  /** Optional callback returning whether the active mode has unsaved work */
  getHasUnsavedWork?: () => boolean
}

const STORAGE_KEY = 'brust-creation-mode'

export function CreationModeTabs({ documentType, getHasUnsavedWork }: Props) {
  const [activeTab, setActiveTab] = useState<CreationMode>(() => {
    if (typeof window === 'undefined') return 'guided'
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'expert' || stored === 'guided' ? stored : 'guided'
  })
  const [pendingTab, setPendingTab] = useState<CreationMode | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const applyTabChange = (tab: CreationMode) => {
    setActiveTab(tab)
    localStorage.setItem(STORAGE_KEY, tab)
  }

  const handleModeSwitch = (tab: CreationMode) => {
    if (tab === activeTab) return
    if (getHasUnsavedWork?.()) {
      setPendingTab(tab)
      setShowConfirmDialog(true)
    } else {
      applyTabChange(tab)
    }
  }

  const handleConfirmSwitch = () => {
    if (pendingTab) {
      applyTabChange(pendingTab)
      setPendingTab(null)
    }
    setShowConfirmDialog(false)
  }

  const handleCancelSwitch = () => {
    setPendingTab(null)
    setShowConfirmDialog(false)
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header bar */}
      <div className="border-b px-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1"
          >
            ← Home
          </Link>
        </div>
        <div className="flex items-center justify-between pb-2">
          <p className="text-xs text-muted-foreground">
            {activeTab === 'guided'
              ? 'AI asks questions and builds your document'
              : 'Traditional form-based entry'}
          </p>
          <button
            onClick={() => handleModeSwitch(activeTab === 'guided' ? 'expert' : 'guided')}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            {activeTab === 'guided'
              ? 'Prefer filling out a form? Switch to Expert Mode →'
              : '← Back to AI Guided'}
          </button>
        </div>
      </div>

      {/* Active panel — conditionally rendered to prevent side-effect leakage */}
      <div data-testid="tab-content-wrapper" className="flex-1 overflow-hidden">
        {activeTab === 'guided' ? (
          <div role="tabpanel" data-testid="guided-tab-panel" className="h-full">
            <GuidedCreatorContainer documentType={documentType} />
          </div>
        ) : (
          <div role="tabpanel" data-testid="expert-tab-panel" className="h-full">
            {documentType === 'business_rule' ? (
              <WizardContainer />
            ) : (
              <UserStoryWizardContainer />
            )}
          </div>
        )}
      </div>

      {/* Unsaved work confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch modes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved work in the current mode. Switching modes will keep your progress
              but you may lose your place in the conversation. You can switch back at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>Switch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
