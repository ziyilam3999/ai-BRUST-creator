// Business Rule type definitions

export type BusinessRuleCategory = 'validation' | 'calculation' | 'authorization'
export type BusinessRulePriority = 'critical' | 'high' | 'medium' | 'low'
export type BusinessRuleStatus = 'draft' | 'review' | 'approved' | 'deprecated'

export interface RuleStatement {
  if: string
  then: string
  else?: string
}

export interface RuleExample {
  scenario: string
  isValid: boolean
  description: string
}

export interface BusinessRuleData {
  // Step 1: Basic Info
  ruleId: string
  ruleName: string
  category: BusinessRuleCategory
  priority: BusinessRulePriority

  // Step 2: Description
  description: string

  // Step 3: Rule Statement
  ruleStatement: RuleStatement

  // Step 4: Exceptions
  exceptions: string[]

  // Step 5: Examples
  examples: RuleExample[]

  // Step 6: Metadata
  relatedRules: string[]
  source: string
  owner: string
  effectiveDate: string

  // System fields
  version: string
  status: BusinessRuleStatus
}

export const WIZARD_STEPS = [
  { id: 1, name: 'Basic Info', description: 'Rule ID, Name, Category, Priority' },
  { id: 2, name: 'Description', description: 'What this rule accomplishes' },
  { id: 3, name: 'Rule Statement', description: 'IF/THEN/ELSE conditions' },
  { id: 4, name: 'Exceptions', description: 'Exception cases' },
  { id: 5, name: 'Examples', description: 'Valid/Invalid scenarios' },
  { id: 6, name: 'Metadata', description: 'Related rules, source, owner' },
  { id: 7, name: 'Review', description: 'Preview and confirm' },
] as const

export const INITIAL_BUSINESS_RULE: BusinessRuleData = {
  ruleId: '',
  ruleName: '',
  category: 'validation',
  priority: 'medium',
  description: '',
  ruleStatement: { if: '', then: '', else: '' },
  exceptions: [],
  examples: [],
  relatedRules: [],
  source: '',
  owner: '',
  effectiveDate: '',
  version: '1.0',
  status: 'draft',
}
