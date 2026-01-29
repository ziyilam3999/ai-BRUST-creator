'use client'

import { useUserStoryWizardStore } from '@/stores/user-story-wizard-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus } from 'lucide-react'

export function USAcceptanceCriteriaStep() {
  const {
    data,
    addAcceptanceCriterion,
    removeAcceptanceCriterion,
    updateAcceptanceCriterion,
  } = useUserStoryWizardStore()

  const handleAddCriterion = () => {
    addAcceptanceCriterion({
      scenario: '',
      given: '',
      when: '',
      then: '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define acceptance criteria using Gherkin syntax (Given/When/Then).
        </p>
        <Button onClick={handleAddCriterion} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Scenario
        </Button>
      </div>

      {data.acceptanceCriteria.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No acceptance criteria yet</p>
          <Button onClick={handleAddCriterion} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add First Scenario
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.acceptanceCriteria.map((criterion, index) => (
            <Card key={criterion.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Scenario {index + 1}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAcceptanceCriterion(criterion.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`scenario-${criterion.id}`}>Scenario Name</Label>
                  <Input
                    id={`scenario-${criterion.id}`}
                    placeholder="Successful login with valid credentials"
                    value={criterion.scenario}
                    onChange={(e) =>
                      updateAcceptanceCriterion(criterion.id, { scenario: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-green-600 w-16">Given</span>
                    <Input
                      placeholder="I am on the login page"
                      value={criterion.given}
                      onChange={(e) =>
                        updateAcceptanceCriterion(criterion.id, { given: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-blue-600 w-16">When</span>
                    <Input
                      placeholder="I click the GitHub login button"
                      value={criterion.when}
                      onChange={(e) =>
                        updateAcceptanceCriterion(criterion.id, { when: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-purple-600 w-16">Then</span>
                    <Input
                      placeholder="I should be redirected to the dashboard"
                      value={criterion.then}
                      onChange={(e) =>
                        updateAcceptanceCriterion(criterion.id, { then: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> At least one complete acceptance criterion is required
          to proceed. Each scenario should have all Given/When/Then fields filled.
        </p>
      </div>
    </div>
  )
}
