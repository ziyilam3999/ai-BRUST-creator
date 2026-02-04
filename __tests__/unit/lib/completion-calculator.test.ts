import { describe, it, expect } from 'vitest'
import {
  calculateSectionCompletion,
  calculateOverallCompletion,
  SECTION_WEIGHTS,
} from '@/lib/guided/completion-calculator'
import type { DocumentSection, SectionState } from '@/stores/guided-creator-store'

describe('Completion Calculator', () => {
  describe('SECTION_WEIGHTS', () => {
    it('should have weights for business_rule sections', () => {
      expect(SECTION_WEIGHTS.business_rule).toBeDefined()
      expect(SECTION_WEIGHTS.business_rule.basicInfo).toBeDefined()
      expect(SECTION_WEIGHTS.business_rule.ruleStatement).toBeDefined()
    })

    it('should have weights that sum to 100 for business_rule', () => {
      const total = Object.values(SECTION_WEIGHTS.business_rule).reduce(
        (sum, section) => sum + section.weight,
        0
      )
      expect(total).toBe(100)
    })

    it('should have weights for user_story sections', () => {
      expect(SECTION_WEIGHTS.user_story).toBeDefined()
      expect(SECTION_WEIGHTS.user_story.basicInfo).toBeDefined()
      expect(SECTION_WEIGHTS.user_story.storyStatement).toBeDefined()
    })

    it('should have weights that sum to 100 for user_story', () => {
      const total = Object.values(SECTION_WEIGHTS.user_story).reduce(
        (sum, section) => sum + section.weight,
        0
      )
      expect(total).toBe(100)
    })
  })

  describe('calculateSectionCompletion', () => {
    describe('basicInfo section (business_rule)', () => {
      it('should return 0 for empty content', () => {
        const result = calculateSectionCompletion('basicInfo', {}, 'business_rule')
        expect(result).toBe(0)
      })

      it('should return partial completion for some fields', () => {
        const content = {
          ruleId: 'BR-001',
          ruleName: 'Test Rule',
        }
        const result = calculateSectionCompletion('basicInfo', content, 'business_rule')
        expect(result).toBeGreaterThan(0)
        expect(result).toBeLessThan(100)
      })

      it('should return 100 for all required fields', () => {
        const content = {
          ruleId: 'BR-001',
          ruleName: 'Test Rule',
          category: 'Validation',
          priority: 'High',
        }
        const result = calculateSectionCompletion('basicInfo', content, 'business_rule')
        expect(result).toBe(100)
      })
    })

    describe('description section', () => {
      it('should return 0 for empty description', () => {
        const result = calculateSectionCompletion('description', {}, 'business_rule')
        expect(result).toBe(0)
      })

      it('should return partial for short description', () => {
        const content = { description: 'Short' }
        const result = calculateSectionCompletion('description', content, 'business_rule')
        expect(result).toBeLessThan(100)
      })

      it('should return 100 for adequate description', () => {
        const content = { description: 'This is a detailed description that meets the minimum length requirement for a complete section.' }
        const result = calculateSectionCompletion('description', content, 'business_rule')
        expect(result).toBe(100)
      })
    })

    describe('ruleStatement section', () => {
      it('should return 0 for empty rule statement', () => {
        const result = calculateSectionCompletion('ruleStatement', {}, 'business_rule')
        expect(result).toBe(0)
      })

      it('should give higher weight to required IF and THEN', () => {
        const withIfOnly = calculateSectionCompletion('ruleStatement', { if: 'condition' }, 'business_rule')
        const withIfThen = calculateSectionCompletion('ruleStatement', { if: 'condition', then: 'action' }, 'business_rule')
        expect(withIfThen).toBeGreaterThan(withIfOnly)
      })

      it('should not require ELSE for full completion', () => {
        const content = {
          if: 'When the user submits a form',
          then: 'Validate all required fields',
        }
        const result = calculateSectionCompletion('ruleStatement', content, 'business_rule')
        // Should be high but ELSE gives bonus points
        expect(result).toBeGreaterThanOrEqual(80)
      })

      it('should give bonus for ELSE', () => {
        const withoutElse = calculateSectionCompletion('ruleStatement', {
          if: 'condition',
          then: 'action',
        }, 'business_rule')

        const withElse = calculateSectionCompletion('ruleStatement', {
          if: 'condition',
          then: 'action',
          else: 'alternative',
        }, 'business_rule')

        expect(withElse).toBeGreaterThan(withoutElse)
      })
    })

    describe('exceptions section', () => {
      it('should return 100 for any exceptions (optional section)', () => {
        const result = calculateSectionCompletion('exceptions', {
          exceptions: ['Admin override allowed']
        }, 'business_rule')
        expect(result).toBe(100)
      })

      it('should return 0 for no exceptions', () => {
        const result = calculateSectionCompletion('exceptions', { exceptions: [] }, 'business_rule')
        expect(result).toBe(0)
      })
    })

    describe('examples section', () => {
      it('should return 100 for any examples', () => {
        const result = calculateSectionCompletion('examples', {
          examples: [{ scenario: 'Test', expectedResult: 'Pass' }]
        }, 'business_rule')
        expect(result).toBe(100)
      })
    })

    describe('metadata section', () => {
      it('should return partial for some metadata', () => {
        const content = { owner: 'Team A' }
        const result = calculateSectionCompletion('metadata', content, 'business_rule')
        expect(result).toBeGreaterThan(0)
        expect(result).toBeLessThan(100)
      })
    })

    describe('User Story sections', () => {
      it('should calculate storyStatement completion', () => {
        const content = {
          asA: 'developer',
          iWant: 'to create APIs',
          soThat: 'users can access data',
        }
        const result = calculateSectionCompletion('storyStatement', content, 'user_story')
        expect(result).toBe(100)
      })

      it('should calculate acceptanceCriteria completion', () => {
        const content = {
          criteria: [
            { given: 'a user', when: 'clicks button', then: 'action happens' }
          ]
        }
        const result = calculateSectionCompletion('acceptanceCriteria', content, 'user_story')
        expect(result).toBe(100)
      })
    })
  })

  describe('calculateOverallCompletion', () => {
    const createSections = (completions: Record<string, number>): Record<DocumentSection, SectionState> => {
      const sections: Record<string, SectionState> = {}
      for (const [name, percent] of Object.entries(completions)) {
        sections[name] = {
          status: percent > 0 ? 'draft' : 'not_started',
          completionPercent: percent,
          content: {},
          lastUpdated: null,
          aiDraft: null,
          userAccepted: false,
        }
      }
      return sections as Record<DocumentSection, SectionState>
    }

    it('should return 0 for all empty sections', () => {
      const sections = createSections({
        basicInfo: 0,
        description: 0,
        ruleStatement: 0,
        exceptions: 0,
        examples: 0,
        metadata: 0,
      })
      const result = calculateOverallCompletion(sections, 'business_rule')
      expect(result).toBe(0)
    })

    it('should return 100 for all complete sections', () => {
      const sections = createSections({
        basicInfo: 100,
        description: 100,
        ruleStatement: 100,
        exceptions: 100,
        examples: 100,
        metadata: 100,
      })
      const result = calculateOverallCompletion(sections, 'business_rule')
      expect(result).toBe(100)
    })

    it('should weight sections correctly', () => {
      // ruleStatement has weight 30, basicInfo has weight 15
      const sectionsA = createSections({
        basicInfo: 100, // 15 weight
        description: 0,
        ruleStatement: 0, // 30 weight
        exceptions: 0,
        examples: 0,
        metadata: 0,
      })

      const sectionsB = createSections({
        basicInfo: 0,
        description: 0,
        ruleStatement: 100, // 30 weight
        exceptions: 0,
        examples: 0,
        metadata: 0,
      })

      const resultA = calculateOverallCompletion(sectionsA, 'business_rule')
      const resultB = calculateOverallCompletion(sectionsB, 'business_rule')

      // ruleStatement (30%) should contribute more than basicInfo (15%)
      expect(resultB).toBeGreaterThan(resultA)
      expect(resultA).toBe(15) // 100 * 15 / 100
      expect(resultB).toBe(30) // 100 * 30 / 100
    })

    it('should calculate user_story completion', () => {
      const sections = createSections({
        basicInfo: 100,
        storyStatement: 100,
        acceptanceCriteria: 50,
        definitionOfDone: 0,
        relatedItems: 0,
      })
      const result = calculateOverallCompletion(sections, 'user_story')
      // basicInfo: 15, storyStatement: 30, acceptanceCriteria: 25*0.5=12.5
      // Total: (15 + 30 + 12.5) / 100 * 100 = 57.5, rounded to 58
      expect(result).toBeGreaterThan(50)
      expect(result).toBeLessThan(70)
    })
  })
})
