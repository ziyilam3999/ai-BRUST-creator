'use client'

import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { useUserStoryWizardStore } from '@/stores/user-story-wizard-store'
import { CreationModeTabs } from '@/components/guided/creation-mode-tabs'

// Primary creation entry point — defaults to AI Guided mode.
// Legacy deep-link is preserved at /user-story/guided/new
export default function NewUserStoryPage() {
  const messages = useGuidedCreatorStore((s) => s.messages)
  const wizardIsDirty = useUserStoryWizardStore((s) => s.isDirty)
  return (
    <CreationModeTabs
      documentType="user_story"
      getHasUnsavedWork={() => messages.length > 0 || wizardIsDirty}
    />
  )
}
