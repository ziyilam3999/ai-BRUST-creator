import { describe, it, expect } from 'vitest'
import { getCompletionAdvice, type CompletionAdvice } from '@/lib/guided/advice-engine'

describe('Advice Engine', () => {
  describe('getCompletionAdvice', () => {
    describe('minimal level (< 40%)', () => {
      it('should return minimal level for 0%', () => {
        const advice = getCompletionAdvice(0)
        expect(advice.level).toBe('minimal')
        expect(advice.canSave).toBe(false)
      })

      it('should return minimal level for 20%', () => {
        const advice = getCompletionAdvice(20)
        expect(advice.level).toBe('minimal')
        expect(advice.canSave).toBe(false)
      })

      it('should return minimal level for 39%', () => {
        const advice = getCompletionAdvice(39)
        expect(advice.level).toBe('minimal')
        expect(advice.canSave).toBe(false)
      })

      it('should have encouraging message', () => {
        const advice = getCompletionAdvice(25)
        expect(advice.message).toContain('Keep going')
      })

      it('should suggest continuing with current section', () => {
        const advice = getCompletionAdvice(30)
        expect(advice.suggestedAction).toContain('Continue')
      })
    })

    describe('draft level (40-59%)', () => {
      it('should return draft level for 40%', () => {
        const advice = getCompletionAdvice(40)
        expect(advice.level).toBe('draft')
        expect(advice.canSave).toBe(true)
      })

      it('should return draft level for 50%', () => {
        const advice = getCompletionAdvice(50)
        expect(advice.level).toBe('draft')
        expect(advice.canSave).toBe(true)
      })

      it('should return draft level for 59%', () => {
        const advice = getCompletionAdvice(59)
        expect(advice.level).toBe('draft')
      })

      it('should mention basic draft is possible', () => {
        const advice = getCompletionAdvice(45)
        expect(advice.message).toContain('draft')
      })

      it('should suggest adding more details', () => {
        const advice = getCompletionAdvice(55)
        expect(advice.suggestedAction.toLowerCase()).toContain('save')
      })
    })

    describe('good level (60-79%)', () => {
      it('should return good level for 60%', () => {
        const advice = getCompletionAdvice(60)
        expect(advice.level).toBe('good')
        expect(advice.canSave).toBe(true)
      })

      it('should return good level for 70%', () => {
        const advice = getCompletionAdvice(70)
        expect(advice.level).toBe('good')
      })

      it('should return good level for 79%', () => {
        const advice = getCompletionAdvice(79)
        expect(advice.level).toBe('good')
      })

      it('should mention good progress', () => {
        const advice = getCompletionAdvice(65)
        expect(advice.message.toLowerCase()).toContain('progress')
      })
    })

    describe('comprehensive level (>= 80%)', () => {
      it('should return comprehensive level for 80%', () => {
        const advice = getCompletionAdvice(80)
        expect(advice.level).toBe('comprehensive')
        expect(advice.canSave).toBe(true)
      })

      it('should return comprehensive level for 90%', () => {
        const advice = getCompletionAdvice(90)
        expect(advice.level).toBe('comprehensive')
      })

      it('should return comprehensive level for 100%', () => {
        const advice = getCompletionAdvice(100)
        expect(advice.level).toBe('comprehensive')
      })

      it('should mention ready for review', () => {
        const advice = getCompletionAdvice(85)
        expect(advice.message.toLowerCase()).toContain('ready')
      })

      it('should suggest submitting for review', () => {
        const advice = getCompletionAdvice(95)
        expect(advice.suggestedAction.toLowerCase()).toContain('submit')
      })
    })

    describe('interface compliance', () => {
      it('should return all required fields', () => {
        const advice = getCompletionAdvice(50)
        expect(advice).toHaveProperty('level')
        expect(advice).toHaveProperty('message')
        expect(advice).toHaveProperty('canSave')
        expect(advice).toHaveProperty('suggestedAction')
      })

      it('should return valid level values', () => {
        const validLevels = ['minimal', 'draft', 'good', 'comprehensive']
        for (let i = 0; i <= 100; i += 10) {
          const advice = getCompletionAdvice(i)
          expect(validLevels).toContain(advice.level)
        }
      })
    })
  })
})
