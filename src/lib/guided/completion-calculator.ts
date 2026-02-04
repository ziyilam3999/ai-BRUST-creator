import type { DocumentSection, SectionState } from '@/stores/guided-creator-store'

/**
 * Field configuration for completion calculation.
 * - required: Field must be present for full completion
 * - points: Points contributed to section completion
 * - minLength: Minimum string length for full points (partial credit for shorter)
 * - minItems: Minimum array items for full points
 */
interface FieldConfig {
  required: boolean
  points: number
  minLength?: number
  minItems?: number
}

interface SectionConfig {
  weight: number
  fields: Record<string, FieldConfig>
}

/**
 * Section weights and field configurations for completion calculation.
 * Weights sum to 100 for each document type.
 */
export const SECTION_WEIGHTS: {
  business_rule: Record<string, SectionConfig>
  user_story: Record<string, SectionConfig>
} = {
  business_rule: {
    basicInfo: {
      weight: 15,
      fields: {
        ruleId: { required: true, points: 3 },
        ruleName: { required: true, points: 5 },
        category: { required: true, points: 4 },
        priority: { required: true, points: 3 },
      },
    },
    description: {
      weight: 15,
      fields: {
        description: { required: true, points: 15, minLength: 20 },
      },
    },
    ruleStatement: {
      weight: 30,
      fields: {
        if: { required: true, points: 12 },
        then: { required: true, points: 12 },
        else: { required: false, points: 6 },
      },
    },
    exceptions: {
      weight: 15,
      fields: {
        exceptions: { required: false, points: 15, minItems: 1 },
      },
    },
    examples: {
      weight: 15,
      fields: {
        examples: { required: false, points: 15, minItems: 1 },
      },
    },
    metadata: {
      weight: 10,
      fields: {
        owner: { required: false, points: 4 },
        source: { required: false, points: 3 },
        effectiveDate: { required: false, points: 3 },
      },
    },
  },
  user_story: {
    basicInfo: {
      weight: 15,
      fields: {
        storyId: { required: true, points: 3 },
        title: { required: true, points: 5 },
        epic: { required: false, points: 4 },
        priority: { required: true, points: 3 },
      },
    },
    storyStatement: {
      weight: 30,
      fields: {
        asA: { required: true, points: 10 },
        iWant: { required: true, points: 10 },
        soThat: { required: true, points: 10 },
      },
    },
    acceptanceCriteria: {
      weight: 25,
      fields: {
        criteria: { required: true, points: 25, minItems: 1 },
      },
    },
    definitionOfDone: {
      weight: 15,
      fields: {
        items: { required: false, points: 15, minItems: 1 },
      },
    },
    relatedItems: {
      weight: 15,
      fields: {
        businessRules: { required: false, points: 8 },
        userStories: { required: false, points: 7 },
      },
    },
  },
}

/**
 * Calculate completion percentage for a single section.
 *
 * @param section - The section name
 * @param content - The section content object
 * @param docType - Document type (business_rule or user_story)
 * @returns Completion percentage (0-100)
 */
export function calculateSectionCompletion(
  section: DocumentSection | string,
  content: Record<string, unknown>,
  docType: 'business_rule' | 'user_story'
): number {
  const config = SECTION_WEIGHTS[docType][section as string]
  if (!config) {
    return 0
  }

  let earned = 0
  let total = 0

  for (const [field, rules] of Object.entries(config.fields)) {
    total += rules.points
    const value = content[field]

    if (value === undefined || value === null || value === '') {
      continue
    }

    // String with minLength
    if (rules.minLength !== undefined && typeof value === 'string') {
      if (value.length >= rules.minLength) {
        earned += rules.points
      } else if (value.length > 0) {
        // Partial credit for shorter strings
        earned += Math.round(rules.points * (value.length / rules.minLength) * 0.5)
      }
    }
    // Array with minItems
    else if (rules.minItems !== undefined && Array.isArray(value)) {
      if (value.length >= rules.minItems) {
        earned += rules.points
      }
    }
    // Boolean or any truthy value
    else if (value) {
      earned += rules.points
    }
  }

  return total > 0 ? Math.round((earned / total) * 100) : 0
}

/**
 * Calculate overall document completion based on weighted section scores.
 *
 * @param sections - Map of section states
 * @param docType - Document type (business_rule or user_story)
 * @returns Overall completion percentage (0-100)
 */
export function calculateOverallCompletion(
  sections: Record<DocumentSection, SectionState>,
  docType: 'business_rule' | 'user_story'
): number {
  const weights = SECTION_WEIGHTS[docType]
  let totalWeightedScore = 0
  let totalWeight = 0

  for (const [section, config] of Object.entries(weights)) {
    const sectionState = sections[section as DocumentSection]
    if (sectionState) {
      totalWeight += config.weight
      totalWeightedScore += (sectionState.completionPercent / 100) * config.weight
    }
  }

  return totalWeight > 0 ? Math.round(totalWeightedScore) : 0
}
