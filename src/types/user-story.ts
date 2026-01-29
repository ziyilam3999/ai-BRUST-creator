// User Story type definitions

export type UserStoryPriority = 'must' | 'should' | 'could' | 'wont'
export type UserStoryStatus = 'draft' | 'review' | 'approved' | 'deprecated'

export interface StoryStatement {
  role: string
  feature: string
  benefit: string
}

export interface AcceptanceCriterion {
  id: string
  scenario: string
  given: string
  when: string
  then: string
}

export interface DefinitionOfDoneItem {
  id: string
  description: string
  completed: boolean
}

export interface UserStoryData {
  // Step 1: Basic Info
  storyId: string
  epic: string
  title: string
  priority: UserStoryPriority

  // Step 2: Story Statement
  storyStatement: StoryStatement

  // Step 3: Acceptance Criteria
  acceptanceCriteria: AcceptanceCriterion[]

  // Step 4: Definition of Done
  definitionOfDone: DefinitionOfDoneItem[]

  // Step 5: Related Items
  relatedItems: string[]
  notes: string

  // System fields
  version: string
  status: UserStoryStatus
}

export const US_WIZARD_STEPS = [
  { id: 1, name: 'Basic Info', description: 'Story ID, Epic, Title, Priority' },
  { id: 2, name: 'Story Statement', description: 'As a... I want... So that...' },
  { id: 3, name: 'Acceptance Criteria', description: 'Gherkin scenarios' },
  { id: 4, name: 'Definition of Done', description: 'Completion checklist' },
  { id: 5, name: 'Related Items', description: 'Related BRs, Stories, Notes' },
  { id: 6, name: 'Review', description: 'Preview and confirm' },
] as const

export const INITIAL_USER_STORY: UserStoryData = {
  storyId: '',
  epic: '',
  title: '',
  priority: 'should',
  storyStatement: { role: '', feature: '', benefit: '' },
  acceptanceCriteria: [],
  definitionOfDone: [
    { id: '1', description: 'Code complete and reviewed', completed: false },
    { id: '2', description: 'Unit tests passing', completed: false },
    { id: '3', description: 'Acceptance criteria verified', completed: false },
  ],
  relatedItems: [],
  notes: '',
  version: '1.0',
  status: 'draft',
}

// Default acceptance criterion template
export const DEFAULT_ACCEPTANCE_CRITERION: Omit<AcceptanceCriterion, 'id'> = {
  scenario: '',
  given: '',
  when: '',
  then: '',
}
