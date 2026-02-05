import { describe, it, expect } from 'vitest'
import type { BusinessRuleData } from '@/types/business-rule'

// Test data factory
function createTestBR(overrides: Partial<BusinessRuleData> = {}): BusinessRuleData {
  return {
    ruleId: 'BR-001',
    ruleName: 'Test Rule',
    category: 'validation',
    priority: 'medium',
    description: 'A test business rule',
    ruleStatement: { if: 'user submits form', then: 'validate input', else: 'show error' },
    exceptions: [],
    examples: [],
    relatedRules: [],
    source: 'Requirements',
    owner: 'Team A',
    effectiveDate: '2026-01-01',
    version: '1.0',
    status: 'draft',
    ...overrides,
  }
}

describe('BR-to-US Analyzer', () => {
  describe('parseConditions', () => {
    it('should split AND conditions', async () => {
      const { parseConditions } = await import('@/lib/guided/br-to-us-analyzer')
      const conditions = parseConditions('user is admin AND has permission')
      expect(conditions).toHaveLength(2)
      expect(conditions[0]).toContain('user is admin')
      expect(conditions[1]).toContain('has permission')
    })

    it('should split OR conditions', async () => {
      const { parseConditions } = await import('@/lib/guided/br-to-us-analyzer')
      const conditions = parseConditions('user is admin OR user is superuser')
      expect(conditions).toHaveLength(2)
    })

    it('should handle && and || operators', async () => {
      const { parseConditions } = await import('@/lib/guided/br-to-us-analyzer')
      const conditions = parseConditions('condition1 && condition2 || condition3')
      expect(conditions.length).toBeGreaterThanOrEqual(2)
    })

    it('should return single item for simple condition', async () => {
      const { parseConditions } = await import('@/lib/guided/br-to-us-analyzer')
      const conditions = parseConditions('user submits form')
      expect(conditions).toHaveLength(1)
    })
  })

  describe('hasComplexLogic', () => {
    it('should detect nested parentheses', async () => {
      const { hasComplexLogic } = await import('@/lib/guided/br-to-us-analyzer')
      expect(hasComplexLogic(['(a AND (b OR c))'])).toBe(true)
    })

    it('should detect BETWEEN clauses', async () => {
      const { hasComplexLogic } = await import('@/lib/guided/br-to-us-analyzer')
      expect(hasComplexLogic(['amount BETWEEN 100 AND 500'])).toBe(true)
    })

    it('should detect IN clauses', async () => {
      const { hasComplexLogic } = await import('@/lib/guided/br-to-us-analyzer')
      expect(hasComplexLogic(['status IN (active, pending)'])).toBe(true)
    })

    it('should return false for simple conditions', async () => {
      const { hasComplexLogic } = await import('@/lib/guided/br-to-us-analyzer')
      expect(hasComplexLogic(['user is admin', 'has permission'])).toBe(false)
    })
  })

  describe('extractPersonas', () => {
    it('should extract user persona', async () => {
      const { extractPersonas } = await import('@/lib/guided/br-to-us-analyzer')
      const personas = extractPersonas('When user submits a form')
      expect(personas).toContain('user')
    })

    it('should extract admin persona', async () => {
      const { extractPersonas } = await import('@/lib/guided/br-to-us-analyzer')
      const personas = extractPersonas('If admin approves the request')
      expect(personas).toContain('admin')
    })

    it('should extract multiple personas', async () => {
      const { extractPersonas } = await import('@/lib/guided/br-to-us-analyzer')
      const personas = extractPersonas('When admin or manager reviews the user request')
      expect(personas.length).toBeGreaterThanOrEqual(2)
    })

    it('should extract "as a" pattern', async () => {
      const { extractPersonas } = await import('@/lib/guided/br-to-us-analyzer')
      const personas = extractPersonas('As a customer, I want to checkout')
      expect(personas).toContain('customer')
    })

    it('should return empty for no personas', async () => {
      const { extractPersonas } = await import('@/lib/guided/br-to-us-analyzer')
      const personas = extractPersonas('The system processes data')
      expect(personas.length).toBe(0)
    })
  })

  describe('analyzeForUserStories', () => {
    it('should recommend single story for simple BR', async () => {
      const { analyzeForUserStories } = await import('@/lib/guided/br-to-us-analyzer')
      const br = createTestBR({
        ruleStatement: { if: 'user clicks submit', then: 'save form' },
        exceptions: [],
      })

      const result = analyzeForUserStories(br)
      expect(result.shouldSplit).toBe(false)
      expect(result.suggestedCount).toBe(1)
      expect(result.proposedStories).toHaveLength(1)
    })

    it('should recommend split for multiple conditions', async () => {
      const { analyzeForUserStories } = await import('@/lib/guided/br-to-us-analyzer')
      const br = createTestBR({
        ruleStatement: {
          if: 'user is admin AND has permission AND account is active',
          then: 'allow action',
          else: 'deny action',
        },
      })

      const result = analyzeForUserStories(br)
      expect(result.shouldSplit).toBe(true)
      expect(result.suggestedCount).toBeGreaterThan(1)
    })

    it('should recommend split for many exceptions', async () => {
      const { analyzeForUserStories } = await import('@/lib/guided/br-to-us-analyzer')
      const br = createTestBR({
        exceptions: [
          'Admin can override',
          'Legacy data is exempt',
          'System maintenance window',
          'Batch processing bypass',
        ],
      })

      const result = analyzeForUserStories(br)
      expect(result.shouldSplit).toBe(true)
    })

    it('should recommend split for multiple personas', async () => {
      const { analyzeForUserStories } = await import('@/lib/guided/br-to-us-analyzer')
      const br = createTestBR({
        ruleStatement: {
          if: 'admin approves OR manager approves',
          then: 'process request',
        },
        description: 'Both admin and customer roles are involved in this workflow',
      })

      const result = analyzeForUserStories(br)
      expect(result.shouldSplit).toBe(true)
    })

    it('should include reasoning in result', async () => {
      const { analyzeForUserStories } = await import('@/lib/guided/br-to-us-analyzer')
      const br = createTestBR()

      const result = analyzeForUserStories(br)
      expect(result.reasoning).toBeDefined()
      expect(result.reasoning.length).toBeGreaterThan(0)
    })

    it('should generate proposed stories with titles', async () => {
      const { analyzeForUserStories } = await import('@/lib/guided/br-to-us-analyzer')
      const br = createTestBR({ ruleName: 'Order Validation Rule' })

      const result = analyzeForUserStories(br)
      expect(result.proposedStories.length).toBeGreaterThan(0)
      expect(result.proposedStories[0].title).toBeDefined()
      expect(result.proposedStories[0].rationale).toBeDefined()
    })

    it('should estimate story sizes', async () => {
      const { analyzeForUserStories } = await import('@/lib/guided/br-to-us-analyzer')
      const br = createTestBR()

      const result = analyzeForUserStories(br)
      const validSizes = ['XS', 'S', 'M', 'L', 'XL']
      expect(validSizes).toContain(result.proposedStories[0].estimatedSize)
    })

    it('should map BR sections to proposed stories', async () => {
      const { analyzeForUserStories } = await import('@/lib/guided/br-to-us-analyzer')
      const br = createTestBR()

      const result = analyzeForUserStories(br)
      expect(result.proposedStories[0].mappedFromBR).toBeDefined()
      expect(result.proposedStories[0].mappedFromBR.sections).toBeDefined()
    })
  })
})
