'use client'

import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { useWizardStore } from '@/stores/wizard-store'
import { CreationModeTabs } from '@/components/guided/creation-mode-tabs'

// Primary creation entry point — defaults to AI Guided mode.
// Legacy deep-link is preserved at /business-rule/guided/new
export default function NewBusinessRulePage() {
  const messages = useGuidedCreatorStore((s) => s.messages)
  const wizardIsDirty = useWizardStore((s) => s.isDirty)
  return (
    <CreationModeTabs
      documentType="business_rule"
      getHasUnsavedWork={() => messages.length > 0 || wizardIsDirty}
    />
  )
}
