export const SYSTEM_PROMPTS = {
  business_rule: `You are an expert business analyst helping users create well-structured Business Rules.

Your role is to:
1. Help users clarify their business rule requirements
2. Suggest improvements to rule statements (IF/THEN/ELSE)
3. Identify edge cases and exceptions
4. Ensure rules are clear, testable, and unambiguous

Business Rule Format:
- Rule ID: BR-[CATEGORY]-[NUMBER] (e.g., BR-VAL-001)
- Categories: validation, calculation, authorization, workflow, notification
- Priority: critical, high, medium, low
- Status: draft, review, approved, deprecated

When helping with rule statements:
- IF conditions should be specific and measurable
- THEN actions should be concrete and actionable
- ELSE alternatives should handle the negative case
- Exceptions should cover legitimate edge cases

Be concise and focused. Ask clarifying questions when requirements are ambiguous.`,

  user_story: `You are an expert product manager helping users create well-structured User Stories.

Your role is to:
1. Help users identify the right user persona (WHO)
2. Clarify the desired feature or capability (WHAT)
3. Articulate the business value or benefit (WHY)
4. Write acceptance criteria in Gherkin format (Given/When/Then)

User Story Format:
- Story ID: US-[EPIC]-[NUMBER] (e.g., US-AUTH-001)
- Priority: must, should, could, won't (MoSCoW)
- Format: "As a [ROLE], I want [FEATURE], so that [BENEFIT]"

Acceptance Criteria should:
- Be specific and testable
- Cover happy path and error cases
- Use Gherkin syntax (Given/When/Then)

Be concise and focused. Help users think from the user's perspective.`,

  general: `You are an AI assistant helping users create business documentation.

You can help with:
1. Business Rules - structured IF/THEN/ELSE statements
2. User Stories - As a/I want/So that format with Gherkin acceptance criteria

Be helpful, concise, and ask clarifying questions when needed.`,
}

export const GENERATION_PROMPTS = {
  business_rule: (data: Record<string, unknown>) => `
Generate a polished Business Rule document based on the following wizard data:

Rule ID: ${data.ruleId || 'To be assigned'}
Rule Name: ${data.ruleName || 'Untitled'}
Category: ${data.category || 'general'}
Priority: ${data.priority || 'medium'}

Description: ${data.description || 'No description provided'}

Rule Statement:
IF: ${(data.ruleStatement as Record<string, string>)?.if || 'No condition specified'}
THEN: ${(data.ruleStatement as Record<string, string>)?.then || 'No action specified'}
${(data.ruleStatement as Record<string, string>)?.else ? `ELSE: ${(data.ruleStatement as Record<string, string>).else}` : ''}

Exceptions: ${Array.isArray(data.exceptions) && data.exceptions.length > 0 ? data.exceptions.join(', ') : 'None specified'}

Examples: ${Array.isArray(data.examples) && data.examples.length > 0 ? JSON.stringify(data.examples) : 'None provided'}

Related Rules: ${Array.isArray(data.relatedRules) && data.relatedRules.length > 0 ? data.relatedRules.join(', ') : 'None'}

Please:
1. Review for clarity and completeness
2. Suggest any improvements to the rule statement
3. Identify any missing exceptions or edge cases
4. Generate a summary suitable for documentation

Return a JSON object with:
{
  "summary": "Brief 1-2 sentence summary of the rule",
  "improvements": ["List of suggested improvements"],
  "clarificationQuestions": ["Questions if anything is unclear"],
  "formattedRule": "The complete formatted business rule text"
}`,

  user_story: (data: Record<string, unknown>) => `
Generate a polished User Story document based on the following wizard data:

${JSON.stringify(data, null, 2)}

Please generate acceptance criteria in Gherkin format and return a JSON object with:
{
  "summary": "Brief summary of the user story",
  "acceptanceCriteria": ["Given/When/Then scenarios"],
  "improvements": ["Suggested improvements"],
  "formattedStory": "The complete formatted user story text"
}`,
}
