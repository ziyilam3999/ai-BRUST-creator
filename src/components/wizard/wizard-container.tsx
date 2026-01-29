'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizardStore } from '@/stores/wizard-store'
import { WIZARD_STEPS } from '@/types/business-rule'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WizardProgress } from './wizard-progress'
import { BasicInfoStep } from './business-rule/basic-info-step'
import { DescriptionStep } from './business-rule/description-step'
import { RuleStatementStep } from './business-rule/rule-statement-step'
import { ExceptionsStep } from './business-rule/exceptions-step'
import { ExamplesStep } from './business-rule/examples-step'
import { MetadataStep } from './business-rule/metadata-step'
import { ReviewStep } from './business-rule/review-step'
import { ChatPanel } from '@/components/chat/chat-panel'
import { Loader2 } from 'lucide-react'

export function WizardContainer() {
  const router = useRouter()
  const { currentStep, nextStep, prevStep, isStepComplete, data, reset, markSaved } = useWizardStore()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepInfo = WIZARD_STEPS[currentStep - 1]
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === WIZARD_STEPS.length
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
          documentType: 'business_rule',
          title: data.ruleName || 'Untitled Business Rule',
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
      router.push(`/business-rule/${result.data.id}`)
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
        return <BasicInfoStep />
      case 2:
        return <DescriptionStep />
      case 3:
        return <RuleStatementStep />
      case 4:
        return <ExceptionsStep />
      case 5:
        return <ExamplesStep />
      case 6:
        return <MetadataStep />
      case 7:
        return <ReviewStep />
      default:
        return null
    }
  }

  return (
    <main className="container mx-auto py-8 px-4 relative">
      {/* AI Chat Panel - Fixed position */}
      <div className="fixed bottom-4 right-4 z-50">
        <ChatPanel
          documentType="business_rule"
          currentStep={currentStep}
          wizardData={data}
        />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Create Business Rule</CardTitle>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {WIZARD_STEPS.length}
            </span>
          </div>
          <WizardProgress currentStep={currentStep} totalSteps={WIZARD_STEPS.length} />
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
