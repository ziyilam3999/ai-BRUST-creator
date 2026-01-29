'use client'

import { useWizardStore } from '@/stores/wizard-store'

export function ReviewStep() {
  const { data } = useWizardStore()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Review Business Rule</h3>

      <div className="bg-muted p-6 rounded-lg font-mono text-sm space-y-4">
        {/* Header */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted-foreground">Rule ID:</span>{' '}
            <span className="font-semibold">{data.ruleId || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Rule Name:</span>{' '}
            <span>{data.ruleName || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Version:</span>{' '}
            <span>{data.version}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <span className="capitalize">{data.status}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Category:</span>{' '}
            <span className="capitalize">{data.category}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Priority:</span>{' '}
            <span className="capitalize">{data.priority}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="text-muted-foreground font-bold mb-1">DESCRIPTION:</div>
          <p className="whitespace-pre-wrap">{data.description || '-'}</p>
        </div>

        {/* Rule Statement */}
        <div>
          <div className="text-muted-foreground font-bold mb-1">RULE STATEMENT:</div>
          <div className="ml-4 space-y-1">
            <div>
              <span className="text-muted-foreground">IF:</span>{' '}
              {data.ruleStatement.if || '-'}
            </div>
            <div>
              <span className="text-muted-foreground">THEN:</span>{' '}
              {data.ruleStatement.then || '-'}
            </div>
            {data.ruleStatement.else && (
              <div>
                <span className="text-muted-foreground">ELSE:</span>{' '}
                {data.ruleStatement.else}
              </div>
            )}
          </div>
        </div>

        {/* Exceptions */}
        <div>
          <div className="text-muted-foreground font-bold mb-1">EXCEPTIONS:</div>
          {data.exceptions.length > 0 ? (
            <ul className="ml-4 list-disc">
              {data.exceptions.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          ) : (
            <span className="ml-4">None</span>
          )}
        </div>

        {/* Examples */}
        <div>
          <div className="text-muted-foreground font-bold mb-1">EXAMPLES:</div>
          {data.examples.length > 0 ? (
            <div className="ml-4 space-y-2">
              {data.examples.map((ex, i) => (
                <div key={i}>
                  <span className={ex.isValid ? 'text-green-600' : 'text-red-600'}>
                    [{ex.isValid ? 'Valid' : 'Invalid'}]
                  </span>{' '}
                  {ex.scenario}: {ex.description}
                </div>
              ))}
            </div>
          ) : (
            <span className="ml-4">None</span>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted-foreground">Related Rules:</span>{' '}
            {data.relatedRules.length > 0 ? data.relatedRules.join(', ') : 'None'}
          </div>
          <div>
            <span className="text-muted-foreground">Source:</span>{' '}
            {data.source || '-'}
          </div>
          <div>
            <span className="text-muted-foreground">Owner:</span>{' '}
            {data.owner || '-'}
          </div>
          <div>
            <span className="text-muted-foreground">Effective:</span>{' '}
            {data.effectiveDate || '-'}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Review the business rule above. Click Submit to save, or go back to make changes.
      </p>
    </div>
  )
}
