/**
 * BR-to-US Analyzer
 *
 * Analyzes BusinessRule documents to determine if they should be split into
 * multiple UserStories based on BABOK 3.0 and INVEST principles.
 *
 * @module lib/guided/br-to-us-analyzer
 */

import type { BusinessRuleData } from '@/types/business-rule'

// ============================================================================
// Types
// ============================================================================

export interface ProposedStory {
  title: string
  rationale: string
  estimatedSize: 'XS' | 'S' | 'M' | 'L' | 'XL'
  mappedFromBR: {
    sections: string[]
    conditions?: string[]
    exceptions?: string[]
  }
}

export interface AnalysisResult {
  shouldSplit: boolean
  suggestedCount: number
  reasoning: string[]
  proposedStories: ProposedStory[]
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Known persona keywords for extraction
 */
const PERSONA_KEYWORDS = [
  'user',
  'admin',
  'administrator',
  'manager',
  'customer',
  'client',
  'employee',
  'guest',
  'member',
  'operator',
  'analyst',
  'developer',
  'reviewer',
  'approver',
  'owner',
  'superuser',
]

/**
 * Complex logic patterns that indicate need for splitting
 */
const COMPLEX_PATTERNS = [
  /\(.*\(/, // Nested opening parentheses
  /\).*\)/, // Nested closing parentheses
  /BETWEEN\s+\w+\s+AND/i, // BETWEEN X AND Y
  /\bIN\s*\(/i, // IN (list)
  />=.*<=/i, // Range comparisons
  /<=.*>=/i, // Range comparisons
]

/**
 * Split threshold based on BABOK 3.0 recommendations
 */
const SPLIT_THRESHOLD = 0.50

// ============================================================================
// Condition Parsing
// ============================================================================

/**
 * Parse IF statement into discrete conditions.
 * Splits on logical operators (AND, OR, &&, ||).
 *
 * @param ifStatement - The IF condition string
 * @returns Array of individual conditions
 */
export function parseConditions(ifStatement: string): string[] {
  if (!ifStatement || ifStatement.trim() === '') {
    return []
  }

  // C3(a): Parenthetical-aware split — only split on AND/OR/&&/|| that are
  // at nesting depth 0 (i.e. not inside parentheses).
  const tokens = _splitTopLevel(ifStatement.trim())
  return tokens.length > 0 ? tokens : [ifStatement.trim()]
}

/**
 * Split `input` on AND / OR / && / || only when at parenthesis-nesting depth 0.
 * C3(a): preserves parenthetical groups like "(A AND B)" as single tokens.
 * C3(b): NOT/UNLESS prefixes are retained as part of their following token.
 * C3(c): Numeric comparators (<, >, <=, >=, !=, ≠) are never treated as separators.
 */
function _splitTopLevel(input: string): string[] {
  const results: string[] = []
  let depth = 0
  let current = ''
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (ch === '(') {
      depth++
      current += ch
      i++
      continue
    }

    if (ch === ')') {
      depth--
      current += ch
      i++
      continue
    }

    // Only attempt to split when not inside parentheses
    if (depth === 0) {
      // Match AND / OR / && / || as a separator (word-boundary aware)
      const rest = input.slice(i)
      const sepMatch = rest.match(/^(\s+(?:AND|OR|&&|\|\|)\s+)/i)
      if (sepMatch) {
        const trimmed = current.trim()
        if (trimmed) results.push(trimmed)
        current = ''
        i += sepMatch[0].length
        continue
      }
    }

    current += ch
    i++
  }

  const last = current.trim()
  if (last) results.push(last)

  return results
}

/**
 * Detect if conditions contain complex logic that suggests splitting.
 *
 * Complex patterns include:
 * - Nested parentheses
 * - BETWEEN clauses
 * - IN clauses
 * - Multiple comparison operators
 *
 * @param conditions - Array of condition strings
 * @returns True if complex logic detected
 */
export function hasComplexLogic(conditions: string[]): boolean {
  return conditions.some(condition =>
    COMPLEX_PATTERNS.some(pattern => pattern.test(condition))
  )
}

// ============================================================================
// Persona Extraction
// ============================================================================

/**
 * Extract persona/actor references from text.
 *
 * Looks for:
 * - Direct persona keywords (user, admin, manager, etc.)
 * - "As a [persona]" patterns
 *
 * @param text - Text to search for personas
 * @returns Array of unique persona strings (lowercased)
 */
export function extractPersonas(text: string): string[] {
  if (!text) return []

  const found = new Set<string>()
  const lowerText = text.toLowerCase()

  // Check for direct persona keywords
  for (const persona of PERSONA_KEYWORDS) {
    const pattern = new RegExp(`\\b${persona}\\b`, 'i')
    if (pattern.test(lowerText)) {
      found.add(persona)
    }
  }

  // Check for "as a [persona]" pattern
  const asAPattern = /\bas an?\s+(\w+)/gi
  let match
  while ((match = asAPattern.exec(text)) !== null) {
    const persona = match[1].toLowerCase()
    if (!['the', 'a', 'an'].includes(persona)) {
      found.add(persona)
    }
  }

  return Array.from(found)
}

// ============================================================================
// Main Analysis
// ============================================================================

/**
 * Analyze a BusinessRule to determine optimal UserStory decomposition.
 *
 * Uses weighted criteria based on BABOK 3.0 and INVEST principles:
 * - Multiple conditions (0.35 weight) - Independence indicator
 * - Multiple personas (0.30 weight) - Different value streams
 * - Many exceptions (0.20 weight) - Hidden complexity
 * - Distinct paths (0.15 weight) - Different business value
 *
 * Any major criterion alone can trigger a split recommendation:
 * - Multiple personas (>1)
 * - Many exceptions (>3)
 * - Complex logic or many conditions (>2)
 *
 * @param br - BusinessRule data to analyze
 * @returns Analysis result with split recommendation
 */
export function analyzeForUserStories(br: BusinessRuleData): AnalysisResult {
  const reasoning: string[] = []
  let splitScore = 0
  let forceSplit = false

  // Parse conditions from IF statement
  const conditions = parseConditions(br.ruleStatement.if || '')
  const hasComplex = hasComplexLogic(conditions)

  // Extract personas from description and rule
  const personas = extractPersonas(
    `${br.description || ''} ${br.ruleStatement.if || ''}`
  )

  // Criteria 1: Multiple conditions (0.35 weight)
  // Force split for complex logic or many conditions
  if (conditions.length > 2 || hasComplex) {
    splitScore += 0.35
    forceSplit = true
    reasoning.push(
      hasComplex
        ? 'Complex logic detected (nested conditions, BETWEEN, or IN clauses)'
        : `Multiple conditions found (${conditions.length} discrete conditions)`
    )
  }

  // Criteria 2: Multiple personas (0.30 weight)
  // Force split when multiple actors involved (per Mike Cohn's "Split by User Type")
  if (personas.length > 1) {
    splitScore += 0.30
    forceSplit = true
    reasoning.push(
      `Multiple personas identified: ${personas.join(', ')} - each may need separate story`
    )
  }

  // Criteria 3: Many exceptions (0.20 weight)
  // Force split when >3 exceptions (hidden complexity)
  const exceptions = br.exceptions || []
  if (exceptions.length > 3) {
    splitScore += 0.20
    forceSplit = true
    reasoning.push(
      `${exceptions.length} exceptions suggest hidden complexity`
    )
  }

  // Criteria 4: Distinct THEN/ELSE paths (0.15 weight)
  if (br.ruleStatement.then && br.ruleStatement.else) {
    const thenPath = br.ruleStatement.then.toLowerCase()
    const elsePath = br.ruleStatement.else.toLowerCase()
    // Simple heuristic: if paths are very different, they may warrant separate stories
    if (thenPath.length > 10 && elsePath.length > 10) {
      const similarity = calculateSimilarity(thenPath, elsePath)
      if (similarity < 0.3) {
        splitScore += 0.15
        reasoning.push('THEN and ELSE paths represent distinct business outcomes')
      }
    }
  }

  // Determine if split is recommended
  // Force split if any major criterion triggered, OR score exceeds threshold
  const shouldSplit = forceSplit || splitScore >= SPLIT_THRESHOLD

  // Calculate suggested story count
  let suggestedCount = 1
  if (shouldSplit) {
    // Base count on primary split factors
    if (personas.length > 1) {
      suggestedCount = Math.max(suggestedCount, personas.length)
    }
    if (conditions.length > 2) {
      suggestedCount = Math.max(suggestedCount, Math.ceil(conditions.length / 2))
    }
    if (exceptions.length > 3) {
      suggestedCount = Math.max(suggestedCount, 2)
    }
  }

  // Add default reasoning if none found
  if (reasoning.length === 0) {
    reasoning.push('Simple rule suitable for a single user story')
  }

  // Generate proposed stories
  const proposedStories = generateProposedStories(
    br,
    suggestedCount,
    conditions,
    personas,
    exceptions
  )

  return {
    shouldSplit,
    suggestedCount,
    reasoning,
    proposedStories,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate simple text similarity (Jaccard index on words)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/))
  const words2 = new Set(text2.split(/\s+/))

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Generate proposed story structures based on analysis
 */
function generateProposedStories(
  br: BusinessRuleData,
  count: number,
  conditions: string[],
  personas: string[],
  exceptions: string[]
): ProposedStory[] {
  const stories: ProposedStory[] = []
  const ruleName = br.ruleName || 'Business Rule'

  if (count === 1) {
    // Single story - map entire BR
    stories.push({
      title: `Implement ${ruleName}`,
      rationale: 'Single cohesive rule maps to one user story',
      estimatedSize: estimateSize(br),
      mappedFromBR: {
        sections: ['ruleStatement', 'exceptions', 'examples'],
        conditions,
        exceptions,
      },
    })
  } else if (personas.length > 1) {
    // Split by persona
    personas.forEach((persona, index) => {
      stories.push({
        title: `${ruleName} - ${capitalize(persona)} Flow`,
        rationale: `Separate story for ${persona} persona`,
        estimatedSize: 'S',
        mappedFromBR: {
          sections: ['ruleStatement'],
          conditions: conditions.filter(c =>
            c.toLowerCase().includes(persona)
          ),
        },
      })
    })
  } else if (conditions.length > 2) {
    // Split by condition groups
    const chunkSize = Math.ceil(conditions.length / count)
    for (let i = 0; i < count; i++) {
      const chunk = conditions.slice(i * chunkSize, (i + 1) * chunkSize)
      stories.push({
        title: `${ruleName} - Part ${i + 1}`,
        rationale: `Handles conditions: ${chunk.join(', ').slice(0, 50)}...`,
        estimatedSize: 'S',
        mappedFromBR: {
          sections: ['ruleStatement'],
          conditions: chunk,
        },
      })
    }
  } else {
    // Default split - main flow + exceptions
    stories.push({
      title: `${ruleName} - Main Flow`,
      rationale: 'Primary happy path implementation',
      estimatedSize: 'M',
      mappedFromBR: {
        sections: ['ruleStatement', 'examples'],
        conditions,
      },
    })

    if (exceptions.length > 0) {
      stories.push({
        title: `${ruleName} - Exception Handling`,
        rationale: 'Exception cases and edge conditions',
        estimatedSize: 'S',
        mappedFromBR: {
          sections: ['exceptions'],
          exceptions,
        },
      })
    }
  }

  return stories
}

/**
 * Estimate story size based on BR complexity
 */
function estimateSize(br: BusinessRuleData): 'XS' | 'S' | 'M' | 'L' | 'XL' {
  const conditions = parseConditions(br.ruleStatement.if || '')
  const exceptionCount = (br.exceptions || []).length
  const exampleCount = (br.examples || []).length

  const complexityScore =
    conditions.length +
    exceptionCount * 0.5 +
    exampleCount * 0.25 +
    (hasComplexLogic(conditions) ? 2 : 0)

  if (complexityScore <= 2) return 'XS'
  if (complexityScore <= 4) return 'S'
  if (complexityScore <= 6) return 'M'
  if (complexityScore <= 8) return 'L'
  return 'XL'
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
