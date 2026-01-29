'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStoryWizardStore } from '@/stores/user-story-wizard-store'
import { US_WIZARD_STEPS } from '@/types/user-story'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WizardProgress } from './wizard-progress'
import { USBasicInfoStep } from './user-story/basic-info-step'
import { USStoryStatementStep } from './user-story/story-statement-step'
import { USAcceptanceCriteriaStep } from './user-story/acceptance-criteria-step'
import { USDefinitionOfDoneStep } from './user-story/definition-of-done-step'
import { USRelatedItemsStep } from './user-story/related-items-step'
import { USReviewStep } from './user-story/review-step'
import { ChatPanel } from '@/components/chat/chat-panel'
import { Loader2 } from 'lucide-react'

export function UserStoryWizardContainer() {
  const router = useRouter()
  const { currentStep, nextStep, prevStep, isStepComplete, data, reset, markSaved } = useUserStoryWizardStore()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepInfo = US_WIZARD_STEPS[currentStep - 1]
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === US_WIZARD_STEPS.length
  const canProceed = isStepComplete(currentStep)

  const handleNext = () => {
    if (canProceed) {
      nextStep()
    }
  }

  const handlePrevious = () => {
    prevStep()
  }

  const saveDocument = async (status: 'draft' | 'review') => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'user_story',
          title: data.title || 'Untitled User Story',
          content: {
            ...data,
            status,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to save document')
      }

      const result = await response.json()
      markSaved()
      reset()
      router.push(`/user-story/${result.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDraft = () => {
    saveDocument('draft')
  }

  const handleSubmit = () => {
    saveDocument('review')
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <USBasicInfoStep />
      case 2:
        return <USStoryStatementStep />
      case 3:
        return <USAcceptanceCriteriaStep />
      case 4:
        return <USDefinitionOfDoneStep />
      case 5:
        return <USRelatedItemsStep />
      case 6:
        return <USReviewStep />
      default:
        return null
    }
  }

  return (
    <main className="container mx-auto py-8 px-4 relative">
      {/* AI Chat Panel - Fixed position */}
      <div className="fixed bottom-4 right-4 z-50">
        <ChatPanel
          documentType="user_story"
          currentStep={currentStep}
          wizardData={data}
        />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Create User Story</CardTitle>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {US_WIZARD_STEPS.length}
            </span>
          </div>
          <WizardProgress currentStep={currentStep} totalSteps={US_WIZARD_STEPS.length} />
          <div className="mt-4">
            <h2 className="text-lg font-semibold">{currentStepInfo.name}</h2>
            <p className="text-sm text-muted-foreground">{currentStepInfo.description}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[300px]">
            {renderStep()}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-4 border-t">
            <div>
              {!isFirstStep && (
                <Button variant="outline" onClick={handlePrevious} disabled={isSaving}>
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Draft'
                )}
              </Button>

              {isLastStep ? (
                <Button onClick={handleSubmit} disabled={!canProceed || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed || isSaving}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
