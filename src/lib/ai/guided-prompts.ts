/**
 * AI prompts for guided document creation.
 * Following SBVR principles for Business Rules and INVEST criteria for User Stories.
 */

/**
 * System prompt for guided document creation AI assistant.
 */
export const GUIDED_SYSTEM_PROMPT = `You are an AI assistant helping users create business documentation through conversation.

YOUR ROLE:
- Ask targeted questions to gather requirements
- Convert user's bullet points/notes into structured content
- Propose drafts for each section
- Iterate based on user feedback
- Advise when document is sufficiently complete

DOMAIN KNOWLEDGE:
- Reference industry standards: TOGAF, BABOK, IEEE, SWEBOK where relevant
- For Business Rules: Follow SBVR (Semantics of Business Vocabulary and Rules) principles
- For User Stories: Apply INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Suggest best practices from IIBA Business Analysis Body of Knowledge

QUESTION STYLE:
- Offer multiple-choice suggestions to guide users
- Example: "Common exceptions include: A) Admin override, B) Legacy data, C) System maintenance window"
- Let users pick from suggestions OR provide their own

CONVERSATION RULES:
1. Ask ONE focused question at a time
2. Accept informal input (bullets, keywords, fragments)
3. Offer 2-4 relevant suggestions when asking questions
4. Always show the structured draft you create
5. Offer clear action options: [Accept] [Edit] [Regenerate]
6. Track what sections are complete vs pending
7. Be encouraging but efficient

OUTPUT FORMAT:
When proposing a draft, use this structure:
{
  "type": "draft_proposal",
  "section": "<section_name>",
  "content": { /* structured section content */ },
  "display": "Formatted text to show user",
  "question": "Follow-up question or confirmation prompt",
  "actions": ["accept", "edit", "regenerate"]
}

When asking a question:
{
  "type": "question",
  "section": "<section_name>",
  "question": "Your question here",
  "hints": ["Hint 1", "Hint 2"],
  "examples": ["Example input"]
}

When giving advice:
{
  "type": "advice",
  "message": "Your advice here",
  "suggestedAction": "next_section" | "save_draft" | "submit_review"
}`

/**
 * Section-specific prompts for Business Rules and User Stories.
 */
export const SECTION_PROMPTS = {
  business_rule: {
    basicInfo: {
      initial: `Let's start your Business Rule!

First, tell me about the problem you're solving:
- What goes wrong without this rule?
- What area does it affect?

**Common categories include:**
A) Data Validation (input checking, format rules)
B) Authorization (access control, permissions)
C) Calculation (pricing, scoring, formulas)
D) Workflow (process gates, state transitions)
E) Integration (external system rules)

Pick a letter or describe your own!`,

      followUp: (input: string) => `Based on what you told me:
"${input}"

I'll draft the Basic Info section following SBVR best practices. Here's what I'm thinking...`,
    },

    description: {
      initial: `Now let's describe what this rule does.

Tell me in your own words:
- What problem does this rule solve?
- Who benefits from this rule?
- What happens when it's applied correctly?

Just describe it naturally, I'll structure it properly.`,

      followUp: (input: string) => `Great! Let me turn that into a clear description...`,
    },

    ruleStatement: {
      initial: `Now let's define the actual rule logic.

Tell me:
- What condition triggers this rule? (the IF)
- What should happen when triggered? (the THEN)
- What if the condition isn't met? (the ELSE - optional)

**Common rule patterns:**
A) "IF [user action] THEN [validate/reject]"
B) "IF [condition A AND condition B] THEN [calculate result]"
C) "IF [role = X] THEN [allow action]"

You can use everyday language, I'll structure it using SBVR principles.`,

      followUp: (input: string) => `Got it! Let me structure that into a proper IF/THEN/ELSE statement...`,
    },

    exceptions: {
      initial: `Are there any exceptions to this rule?

**Common exception types:**
A) Role-based bypass (admin, super-user)
B) Legacy data exceptions (pre-existing records)
C) Time-based exceptions (maintenance windows)
D) System overrides (batch processing, migrations)
E) None - this rule has no exceptions

Pick any that apply or describe your own!`,

      followUp: (input: string) => `I'll add these exceptions to your rule...`,
    },

    examples: {
      initial: `Examples help clarify the rule (BABOK best practice). Can you describe:
- A scenario where the rule PASSES (valid case)
- A scenario where the rule FAILS (invalid case)

Just describe them in plain English.`,

      followUp: (input: string) => `Let me format those as clear examples...`,
    },

    metadata: {
      initial: `Almost done! A few optional details:
- Who owns this rule? (person or team)
- Where did this requirement come from?
- When should it take effect?

You can skip any of these by typing "skip".`,

      followUp: (input: string) => `I'll add the metadata to complete your rule...`,
    },
  },

  user_story: {
    basicInfo: {
      initial: `Let's create your User Story!

First, tell me about the user and their goal:
- Who is the user? (their role or persona)
- What are they trying to accomplish?
- Why does it matter to them?

**Common user types:**
A) End User (customer, consumer)
B) Administrator (system admin, content manager)
C) Business User (analyst, manager)
D) Developer (API consumer, integrator)
E) Other - describe your user

Pick a letter or describe your own!`,

      followUp: (input: string) => `Based on what you told me:
"${input}"

I'll draft the story statement following INVEST criteria. Here's what I'm thinking...`,
    },

    storyStatement: {
      initial: `Now let's write the core story statement.

Following the standard format:
- **As a** [type of user]
- **I want** [some goal/action]
- **So that** [benefit/value]

**Tips for a good story:**
- Focus on ONE specific capability
- Make the benefit clear and measurable
- Avoid technical implementation details

You can use everyday language, I'll structure it properly.`,

      followUp: (input: string) => `Got it! Let me structure that into a proper user story statement...`,
    },

    acceptanceCriteria: {
      initial: `What makes this story "done"? Let's define acceptance criteria.

**Use Given/When/Then format:**
- GIVEN [precondition]
- WHEN [action]
- THEN [expected result]

**Common criteria types:**
A) Happy path (everything works correctly)
B) Validation (input checking, error messages)
C) Edge cases (empty states, limits)
D) Performance (response time, load)

Describe your scenarios in plain English, I'll format them.`,

      followUp: (input: string) => `I'll format those as Gherkin-style acceptance criteria...`,
    },

    definitionOfDone: {
      initial: `Almost done! Let's set the Definition of Done checklist.

**Standard items include:**
A) Code reviewed and approved
B) Unit tests written and passing
C) Integration tests passing
D) Documentation updated
E) Deployed to staging
F) Product owner acceptance

Pick the ones that apply, or add your own!`,

      followUp: (input: string) => `I'll create the Definition of Done checklist...`,
    },

    relatedItems: {
      initial: `Optional: Link this story to related items.

Do you have any related:
- Business Rules?
- Other User Stories?
- Epics or Features?
- External documents?

You can skip this by typing "skip".`,

      followUp: (input: string) => `I'll link the related items...`,
    },
  },
}

/**
 * AI prompts for publish suggestions shown when document reaches ≥80% completion.
 * Three variants: Business Rule completion, User Story completion, post BR-to-US conversion.
 * @spec tmp/remaining-implementation-plan.md Group A Step A1
 */
export const PUBLISH_SUGGESTION_PROMPTS = {
  business_rule: `Your Business Rule is looking great and is ready to publish!

Would you like to publish it to Confluence? I can format it as a page with:
- A structured layout with all sections
- IF/THEN/ELSE rule statement formatted clearly
- Exceptions and examples as tables

This makes it easy to share with your team.`,

  user_story: `Your User Story is complete and ready to create in JIRA!

Would you like to create it as a JIRA issue? I can add:
- Story title and description
- Acceptance criteria as checkboxes
- Definition of Done checklist
- Priority and story points fields

This gets it into your backlog right away.`,

  post_conversion: `Your User Stories have been saved! You can now publish them to JIRA.

Would you like to create JIRA issues for all accepted stories? I can batch-create them with full detail from the conversion.`,
}

/**
 * Get the initial prompt for a section.
 */
export function getSectionInitialPrompt(
  docType: 'business_rule' | 'user_story',
  section: string
): string {
  const prompts = SECTION_PROMPTS[docType] as Record<string, { initial: string; followUp: (input: string) => string } | undefined>
  return prompts?.[section]?.initial ?? `Let's work on the ${section} section.`
}

/**
 * Get the follow-up prompt for a section.
 */
export function getSectionFollowUpPrompt(
  docType: 'business_rule' | 'user_story',
  section: string,
  userInput: string
): string {
  const prompts = SECTION_PROMPTS[docType] as Record<string, { initial: string; followUp: (input: string) => string } | undefined>
  if (prompts?.[section]?.followUp) {
    return prompts[section]!.followUp(userInput)
  }
  return `Processing your input for ${section}...`
}
