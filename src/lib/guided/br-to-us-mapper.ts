/**
 * BR-to-US Mapper
 *
 * Maps BusinessRule documents to UserStory format.
 * Transforms rule statements, exceptions, and examples into user story components.
 *
 * @module lib/guided/br-to-us-mapper
 */

import type { BusinessRuleData, RuleStatement } from '@/types/business-rule'
import type {
  UserStoryData,
  UserStoryPriority,
  AcceptanceCriterion,
  DefinitionOfDoneItem,
} from '@/types/user-story'

// ============================================================================
// Types
// ============================================================================

type BusinessRulePriority = 'critical' | 'high' | 'medium' | 'low'

// ============================================================================
// Constants
// ============================================================================

/**
 * Category to Epic mapping
 */
const CATEGORY_TO_EPIC: Record<string, string> = {
  validation: 'Data Validation',
  authorization: 'Access Control',
  calculation: 'Business Calculations',
  workflow: 'Process Workflow',
  integration: 'System Integration',
  reporting: 'Reporting & Analytics',
  notification: 'Notifications',
  data: 'Data Management',
}

/**
 * Default Definition of Done items
 */
const DEFAULT_DOD_ITEMS: Omit<DefinitionOfDoneItem, 'id'>[] = [
  { description: 'Code complete and reviewed', completed: false },
  { description: 'Unit tests passing', completed: false },
  { description: 'Acceptance criteria verified', completed: false },
  { description: 'Documentation updated', completed: false },
]

/**
 * Known persona keywords for extraction
 */
const PERSONA_PATTERNS = [
  { pattern: /\badmin(istrator)?\b/i, persona: 'Administrator' },
  { pattern: /\bmanager\b/i, persona: 'Manager' },
  { pattern: /\bcustomer\b/i, persona: 'Customer' },
  { pattern: /\bclient\b/i, persona: 'Client' },
  { pattern: /\buser\b/i, persona: 'User' },
  { pattern: /\bemployee\b/i, persona: 'Employee' },
  { pattern: /\boperator\b/i, persona: 'Operator' },
  { pattern: /\banalyst\b/i, persona: 'Analyst' },
  { pattern: /\breviewer\b/i, persona: 'Reviewer' },
  { pattern: /\bapprover\b/i, persona: 'Approver' },
]

// ============================================================================
// Main Mapping Function
// ============================================================================

/**
 * Map a BusinessRule to a UserStory.
 *
 * @param br - BusinessRule data to convert
 * @param storyIndex - Index when generating multiple stories (0-based)
 * @param totalStories - Total number of stories being generated
 * @returns UserStory data
 */
export function mapBRtoUS(
  br: BusinessRuleData,
  storyIndex: number = 0,
  totalStories: number = 1
): UserStoryData {
  const storyId = generateStoryId(br.ruleId, storyIndex, totalStories)
  const title = generateTitle(br.ruleName, storyIndex, totalStories)
  const epic = mapCategoryToEpic(br.category)
  const priority = mapPriority(br.priority as BusinessRulePriority)

  const storyStatement = {
    role: extractPersonaFromRule(br.ruleStatement),
    feature: extractActionFromRule(br.ruleStatement),
    benefit: extractBenefitFromRule(br.ruleStatement),
  }

  const acceptanceCriteria = generateAcceptanceCriteria(br)
  const definitionOfDone = generateDefinitionOfDone()

  return {
    storyId,
    epic,
    title,
    priority,
    storyStatement,
    acceptanceCriteria,
    definitionOfDone,
    relatedItems: [br.ruleId],
    notes: `Generated from Business Rule: ${br.ruleId}`,
    version: '1.0',
    status: 'draft',
  }
}

// ============================================================================
// Extraction Functions (Exported for testing)
// ============================================================================

/**
 * Extract persona/role from rule statement.
 * Looks for actor keywords in the IF condition.
 *
 * @param rule - Rule statement object
 * @returns Persona string (defaults to 'User')
 */
export function extractPersonaFromRule(rule: RuleStatement): string {
  const ifStatement = rule.if || ''

  for (const { pattern, persona } of PERSONA_PATTERNS) {
    if (pattern.test(ifStatement)) {
      return persona
    }
  }

  // Check for "as a [persona]" pattern
  const asAMatch = ifStatement.match(/\bas an?\s+(\w+)/i)
  if (asAMatch) {
    return capitalize(asAMatch[1])
  }

  return 'User'
}

/**
 * Extract action/feature from rule statement.
 * Transforms THEN statement into user-facing action.
 *
 * @param rule - Rule statement object
 * @returns Action string describing the feature
 */
export function extractActionFromRule(rule: RuleStatement): string {
  const thenStatement = rule.then || ''

  if (!thenStatement) {
    return 'perform the required action'
  }

  // Clean up and transform the statement
  let action = thenStatement.trim()

  // Remove leading verbs that are system-focused
  action = action.replace(/^(the system should|system will|must|shall)\s+/i, '')

  // Ensure it starts with a verb for "I want to..."
  if (!startsWithVerb(action)) {
    action = `have ${action}`
  }

  return action.toLowerCase()
}

/**
 * Extract benefit from rule statement.
 * Generates a benefit statement from the rule context.
 *
 * @param rule - Rule statement object
 * @returns Benefit string
 */
export function extractBenefitFromRule(rule: RuleStatement): string {
  const thenStatement = rule.then || ''
  const ifStatement = rule.if || ''

  // Try to infer benefit from the action
  const benefitKeywords: Record<string, string> = {
    validate: 'I can ensure data accuracy and integrity',
    submit: 'I can complete my task efficiently',
    process: 'the workflow proceeds correctly',
    save: 'my data is preserved',
    update: 'I have the most current information',
    create: 'I can add new entries to the system',
    delete: 'I can remove unwanted items',
    approve: 'I can authorize pending requests',
    reject: 'I can decline inappropriate requests',
    notify: 'relevant parties are informed',
    calculate: 'accurate results are computed',
    order: 'my purchase is properly handled',
  }

  const combinedText = `${ifStatement} ${thenStatement}`.toLowerCase()

  for (const [keyword, benefit] of Object.entries(benefitKeywords)) {
    if (combinedText.includes(keyword)) {
      return benefit
    }
  }

  // Default benefit based on successful completion
  return 'the business requirement is satisfied'
}

/**
 * Map BR priority to UserStory MoSCoW priority.
 *
 * Mapping:
 * - critical → must
 * - high → should
 * - medium → could
 * - low → wont
 *
 * @param brPriority - Business rule priority
 * @returns MoSCoW priority
 */
export function mapPriority(brPriority: BusinessRulePriority | string): UserStoryPriority {
  const mapping: Record<string, UserStoryPriority> = {
    critical: 'must',
    high: 'should',
    medium: 'could',
    low: 'wont',
  }

  return mapping[brPriority?.toLowerCase()] || 'should'
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique story ID from BR ID
 */
function generateStoryId(
  brId: string,
  index: number,
  total: number
): string {
  const baseId = brId.replace('BR-', 'US-')

  if (total <= 1) {
    return baseId
  }

  return `${baseId}-${index + 1}`
}

/**
 * Generate story title from rule name
 */
function generateTitle(
  ruleName: string,
  index: number,
  total: number
): string {
  if (total <= 1) {
    return ruleName
  }

  return `${ruleName} (${index + 1}/${total})`
}

/**
 * Map category to Epic name
 */
function mapCategoryToEpic(category: string): string {
  return CATEGORY_TO_EPIC[category?.toLowerCase()] || category || 'General'
}

/**
 * Generate acceptance criteria from BR
 */
function generateAcceptanceCriteria(br: BusinessRuleData): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = []
  let idCounter = 1

  // Main flow from rule statement
  if (br.ruleStatement.if && br.ruleStatement.then) {
    criteria.push({
      id: String(idCounter++),
      scenario: 'Main flow - Success',
      given: extractGiven(br.ruleStatement.if),
      when: 'the action is triggered',
      then: br.ruleStatement.then,
    })
  }

  // Else path (if exists)
  if (br.ruleStatement.else) {
    criteria.push({
      id: String(idCounter++),
      scenario: 'Alternative flow - Condition not met',
      given: `the condition is not satisfied: ${br.ruleStatement.if}`,
      when: 'the action is triggered',
      then: br.ruleStatement.else,
    })
  }

  // Convert exceptions to AC
  const exceptions = br.exceptions || []
  for (const exception of exceptions) {
    criteria.push({
      id: String(idCounter++),
      scenario: `Exception - ${exception.slice(0, 30)}...`,
      given: exception,
      when: 'the exception condition occurs',
      then: 'the system handles the exception appropriately',
    })
  }

  // Convert examples to AC
  const examples = br.examples || []
  for (const example of examples) {
    const isValid = example.isValid
    criteria.push({
      id: String(idCounter++),
      scenario: example.scenario || (isValid ? 'Valid input' : 'Invalid input'),
      given: example.description || 'the described scenario',
      when: 'the input is processed',
      then: isValid
        ? 'the system accepts and processes the input successfully'
        : 'the system rejects the input with appropriate error message',
    })
  }

  return criteria
}

/**
 * Extract GIVEN clause from IF statement
 */
function extractGiven(ifStatement: string): string {
  // Clean up the IF statement for GIVEN context
  let given = ifStatement.trim()

  // Remove leading "if" or "when"
  given = given.replace(/^(if|when)\s+/i, '')

  return given
}

/**
 * Generate default DoD items
 */
function generateDefinitionOfDone(): DefinitionOfDoneItem[] {
  return DEFAULT_DOD_ITEMS.map((item, index) => ({
    id: String(index + 1),
    ...item,
  }))
}

/**
 * Check if text starts with a verb
 */
function startsWithVerb(text: string): boolean {
  const commonVerbs = [
    'accept', 'add', 'allow', 'apply', 'approve', 'calculate', 'cancel',
    'check', 'create', 'delete', 'display', 'edit', 'enable', 'execute',
    'generate', 'get', 'have', 'import', 'load', 'manage', 'modify',
    'notify', 'perform', 'process', 'receive', 'reject', 'remove', 'retrieve',
    'save', 'search', 'select', 'send', 'set', 'show', 'submit', 'update',
    'upload', 'validate', 'verify', 'view',
  ]

  const firstWord = text.split(/\s+/)[0]?.toLowerCase() || ''
  return commonVerbs.includes(firstWord)
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
