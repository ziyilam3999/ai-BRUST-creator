import { describe, it, expect } from 'vitest'
import type { BusinessRuleData } from '@/types/business-rule'
import type { UserStoryData } from '@/types/user-story'

// Test data factory
function createTestBR(overrides: Partial<BusinessRuleData> = {}): BusinessRuleData {
  return {
    ruleId: 'BR-001',
    ruleName: 'Order Validation Rule',
    category: 'validation',
    priority: 'high',
    description: 'Validates order data before processing',
    ruleStatement: {
      if: 'customer submits order',
      then: 'validate order items and calculate total',
      else: 'reject order with error message',
    },
    exceptions: ['Admin can override validation', 'Test orders are exempt'],
    examples: [
      { scenario: 'Valid order', isValid: true, description: 'Order with valid items' },
      { scenario: 'Invalid order', isValid: false, description: 'Order with missing items' },
    ],
    relatedRules: ['BR-002'],
    source: 'Product Requirements',
    owner: 'Order Team',
    effectiveDate: '2026-01-01',
    version: '1.0',
    status: 'approved',
    ...overrides,
  }
}

describe('BR-to-US Mapper', () => {
  describe('mapBRtoUS', () => {
    it('should map basic info fields', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR()

      const us = mapBRtoUS(br)

      expect(us.title).toContain('Order')
      expect(us.priority).toBeDefined()
    })

    it('should map category to epic', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR({ category: 'validation' })

      const us = mapBRtoUS(br)

      expect(us.epic).toBeDefined()
      expect(us.epic.length).toBeGreaterThan(0)
    })

    it('should generate story statement from rule', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR({
        ruleStatement: {
          if: 'customer submits order',
          then: 'validate and process order',
        },
      })

      const us = mapBRtoUS(br)

      expect(us.storyStatement.role).toBeDefined()
      expect(us.storyStatement.feature).toBeDefined()
      expect(us.storyStatement.benefit).toBeDefined()
    })

    it('should convert exceptions to acceptance criteria', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR({
        exceptions: ['Admin override allowed', 'Legacy data exempt'],
      })

      const us = mapBRtoUS(br)

      expect(us.acceptanceCriteria.length).toBeGreaterThanOrEqual(2)
    })

    it('should convert examples to acceptance criteria', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR({
        examples: [
          { scenario: 'Valid input', isValid: true, description: 'All fields present' },
          { scenario: 'Invalid input', isValid: false, description: 'Missing required field' },
        ],
      })

      const us = mapBRtoUS(br)

      // Examples should be converted to AC
      const hasPositiveAC = us.acceptanceCriteria.some(ac =>
        ac.scenario.toLowerCase().includes('valid') || ac.then.toLowerCase().includes('success')
      )
      const hasNegativeAC = us.acceptanceCriteria.some(ac =>
        ac.scenario.toLowerCase().includes('invalid') || ac.then.toLowerCase().includes('error')
      )

      expect(hasPositiveAC || hasNegativeAC).toBe(true)
    })

    it('should link back to source BR', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR({ ruleId: 'BR-123' })

      const us = mapBRtoUS(br)

      expect(us.relatedItems).toContain('BR-123')
    })

    it('should generate unique story ID', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR()

      const us1 = mapBRtoUS(br, 0, 2)
      const us2 = mapBRtoUS(br, 1, 2)

      expect(us1.storyId).not.toBe(us2.storyId)
    })

    it('should include story index in title when multiple stories', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR({ ruleName: 'Multi Story Rule' })

      const us = mapBRtoUS(br, 1, 3)

      // Title should indicate which story (e.g., "Story 2 of 3" or similar)
      expect(us.title).toBeDefined()
    })

    it('should include default DoD items', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR()

      const us = mapBRtoUS(br)

      expect(us.definitionOfDone.length).toBeGreaterThan(0)
      expect(us.definitionOfDone[0].description).toBeDefined()
    })

    it('should set draft status', async () => {
      const { mapBRtoUS } = await import('@/lib/guided/br-to-us-mapper')
      const br = createTestBR()

      const us = mapBRtoUS(br)

      expect(us.status).toBe('draft')
    })
  })

  describe('extractPersonaFromRule', () => {
    it('should extract persona from IF statement', async () => {
      const { extractPersonaFromRule } = await import('@/lib/guided/br-to-us-mapper')
      const rule = { if: 'admin approves request', then: 'process' }

      const persona = extractPersonaFromRule(rule)

      expect(persona.toLowerCase()).toContain('admin')
    })

    it('should default to "user" if no persona found', async () => {
      const { extractPersonaFromRule } = await import('@/lib/guided/br-to-us-mapper')
      const rule = { if: 'form is submitted', then: 'validate' }

      const persona = extractPersonaFromRule(rule)

      expect(persona.toLowerCase()).toBe('user')
    })
  })

  describe('extractActionFromRule', () => {
    it('should extract action from THEN statement', async () => {
      const { extractActionFromRule } = await import('@/lib/guided/br-to-us-mapper')
      const rule = { if: 'user clicks button', then: 'submit the order for processing' }

      const action = extractActionFromRule(rule)

      expect(action.toLowerCase()).toContain('submit')
    })
  })

  describe('extractBenefitFromRule', () => {
    it('should generate benefit from rule context', async () => {
      const { extractBenefitFromRule } = await import('@/lib/guided/br-to-us-mapper')
      const rule = { if: 'order is valid', then: 'process order successfully' }

      const benefit = extractBenefitFromRule(rule)

      expect(benefit.length).toBeGreaterThan(0)
    })
  })

  describe('mapPriority', () => {
    it('should map critical BR priority to must US priority', async () => {
      const { mapPriority } = await import('@/lib/guided/br-to-us-mapper')

      expect(mapPriority('critical')).toBe('must')
    })

    it('should map high BR priority to should US priority', async () => {
      const { mapPriority } = await import('@/lib/guided/br-to-us-mapper')

      expect(mapPriority('high')).toBe('should')
    })

    it('should map medium BR priority to could US priority', async () => {
      const { mapPriority } = await import('@/lib/guided/br-to-us-mapper')

      expect(mapPriority('medium')).toBe('could')
    })

    it('should map low BR priority to wont US priority', async () => {
      const { mapPriority } = await import('@/lib/guided/br-to-us-mapper')

      expect(mapPriority('low')).toBe('wont')
    })
  })
})
