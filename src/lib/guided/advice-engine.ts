/**
 * Completion advice levels and thresholds.
 * Used to provide contextual guidance during document creation.
 */
export interface CompletionAdvice {
  /** Completion level category */
  level: 'minimal' | 'draft' | 'good' | 'comprehensive'
  /** User-friendly message explaining current state */
  message: string
  /** Whether the document can be saved as draft */
  canSave: boolean
  /** Suggested next action for the user */
  suggestedAction: string
}

/**
 * Threshold boundaries for completion levels.
 */
const THRESHOLDS = {
  MINIMAL: 40,    // Below this is "minimal"
  DRAFT: 60,      // 40-59 is "draft"
  GOOD: 80,       // 60-79 is "good"
  // 80+ is "comprehensive"
}

/**
 * Get completion advice based on overall completion percentage.
 *
 * @param percent - Overall completion percentage (0-100)
 * @returns Advice object with level, message, and suggested action
 */
export function getCompletionAdvice(percent: number): CompletionAdvice {
  if (percent < THRESHOLDS.MINIMAL) {
    return {
      level: 'minimal',
      message: 'Keep going! Add more details to create a viable draft.',
      canSave: false,
      suggestedAction: 'Continue with current section',
    }
  }

  if (percent < THRESHOLDS.DRAFT) {
    return {
      level: 'draft',
      message: 'You have enough for a basic draft. Consider adding examples or exceptions.',
      canSave: true,
      suggestedAction: 'Save as draft or continue',
    }
  }

  if (percent < THRESHOLDS.GOOD) {
    return {
      level: 'good',
      message: 'Good progress! Your document covers the essentials.',
      canSave: true,
      suggestedAction: 'Review and submit, or add more detail',
    }
  }

  return {
    level: 'comprehensive',
    message: 'Excellent! Your document is comprehensive and ready for review.',
    canSave: true,
    suggestedAction: 'Submit for review',
  }
}

/**
 * Get section-specific advice based on completion.
 *
 * @param sectionName - Name of the section
 * @param percent - Section completion percentage
 * @returns Section-specific advice string
 */
export function getSectionAdvice(sectionName: string, percent: number): string {
  if (percent === 0) {
    return `Start filling in the ${sectionName} section`
  }

  if (percent < 50) {
    return `${sectionName} needs more detail`
  }

  if (percent < 100) {
    return `${sectionName} is almost complete`
  }

  return `${sectionName} is complete`
}
