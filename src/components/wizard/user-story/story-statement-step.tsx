'use client'

import { useUserStoryWizardStore } from '@/stores/user-story-wizard-store'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export function USStoryStatementStep() {
  const { data, updateData } = useUserStoryWizardStore()

  const updateStoryStatement = (field: 'role' | 'feature' | 'benefit', value: string) => {
    updateData({
      storyStatement: {
        ...data.storyStatement,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Write your user story in the standard &quot;As a... I want... So that...&quot; format.
      </p>

      <Card className="bg-muted/50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary whitespace-nowrap">As a</span>
            <div className="flex-1">
              <Input
                id="role"
                placeholder="registered user"
                value={data.storyStatement.role}
                onChange={(e) => updateStoryStatement('role', e.target.value)}
              />
            </div>
            <span className="text-muted-foreground">,</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary whitespace-nowrap">I want</span>
            <div className="flex-1">
              <Input
                id="feature"
                placeholder="to log into my account using GitHub"
                value={data.storyStatement.feature}
                onChange={(e) => updateStoryStatement('feature', e.target.value)}
              />
            </div>
            <span className="text-muted-foreground">,</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary whitespace-nowrap">So that</span>
            <div className="flex-1">
              <Input
                id="benefit"
                placeholder="I can access my personalized dashboard"
                value={data.storyStatement.benefit}
                onChange={(e) => updateStoryStatement('benefit', e.target.value)}
              />
            </div>
            <span className="text-muted-foreground">.</span>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> A good user story focuses on the <em>value</em> to the user,
          not the technical implementation. Keep the role specific, the feature actionable,
          and the benefit measurable.
        </p>
      </div>
    </div>
  )
}
