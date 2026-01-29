/**
 * JIRA REST API Client
 * Uses Atlassian Cloud REST API v3
 */

const JIRA_API_BASE = 'https://api.atlassian.com/ex/jira'

interface JiraIssueResponse {
  id: string
  key: string
  self: string
}

interface CreateIssueOptions {
  cloudId: string
  accessToken: string
  projectKey: string
  issueType: string
  summary: string
  description: string
  labels?: string[]
}

interface UpdateIssueOptions {
  cloudId: string
  accessToken: string
  issueKey: string
  summary?: string
  description?: string
  labels?: string[]
}

/**
 * Creates a new JIRA issue
 */
export async function createJiraIssue(
  options: CreateIssueOptions
): Promise<JiraIssueResponse> {
  const { cloudId, accessToken, projectKey, issueType, summary, description, labels = [] } = options

  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/issue`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          issuetype: { name: issueType },
          summary,
          description: {
            type: 'doc',
            version: 1,
            content: parseDescriptionToAdf(description),
          },
          labels,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create JIRA issue: ${error}`)
  }

  return response.json()
}

/**
 * Updates an existing JIRA issue
 */
export async function updateJiraIssue(
  options: UpdateIssueOptions
): Promise<void> {
  const { cloudId, accessToken, issueKey, summary, description, labels } = options

  const fields: Record<string, unknown> = {}

  if (summary) {
    fields.summary = summary
  }

  if (description) {
    fields.description = {
      type: 'doc',
      version: 1,
      content: parseDescriptionToAdf(description),
    }
  }

  if (labels) {
    fields.labels = labels
  }

  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/issue/${issueKey}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update JIRA issue: ${error}`)
  }
}

/**
 * Converts plain text description to Atlassian Document Format (ADF)
 */
function parseDescriptionToAdf(text: string): Array<Record<string, unknown>> {
  const lines = text.split('\n')
  const content: Array<Record<string, unknown>> = []

  for (const line of lines) {
    if (line.trim() === '') {
      continue
    }

    if (line.startsWith('# ')) {
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: line.substring(2) }],
      })
    } else if (line.startsWith('## ')) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.substring(3) }],
      })
    } else if (line.startsWith('### ')) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: line.substring(4) }],
      })
    } else if (line.startsWith('- [ ] ')) {
      content.push({
        type: 'taskList',
        attrs: { localId: crypto.randomUUID() },
        content: [{
          type: 'taskItem',
          attrs: { localId: crypto.randomUUID(), state: 'TODO' },
          content: [{ type: 'text', text: line.substring(6) }],
        }],
      })
    } else if (line.startsWith('- [x] ')) {
      content.push({
        type: 'taskList',
        attrs: { localId: crypto.randomUUID() },
        content: [{
          type: 'taskItem',
          attrs: { localId: crypto.randomUUID(), state: 'DONE' },
          content: [{ type: 'text', text: line.substring(6) }],
        }],
      })
    } else if (line.startsWith('- ')) {
      content.push({
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: line.substring(2) }],
          }],
        }],
      })
    } else if (line.startsWith('**') && line.endsWith('**')) {
      content.push({
        type: 'paragraph',
        content: [{
          type: 'text',
          text: line.slice(2, -2),
          marks: [{ type: 'strong' }],
        }],
      })
    } else {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      })
    }
  }

  return content.length > 0 ? content : [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }]
}

/**
 * Converts User Story data to JIRA description format
 */
export function userStoryToJiraDescription(usData: {
  storyId: string
  epic?: string
  priority?: string
  storyStatement: {
    role: string
    feature: string
    benefit: string
  }
  acceptanceCriteria?: Array<{
    id: string
    scenario: string
    given: string
    when: string
    then: string
  }>
  definitionOfDone?: Array<{
    id: string
    text: string
    completed: boolean
  }>
  relatedItems?: string[]
}): string {
  const {
    storyId,
    epic,
    priority,
    storyStatement,
    acceptanceCriteria = [],
    definitionOfDone = [],
    relatedItems = [],
  } = usData

  let description = `# ${storyId}\n\n`

  if (epic) {
    description += `**Epic:** ${epic}\n`
  }
  if (priority) {
    description += `**Priority:** ${priority.toUpperCase()}\n`
  }
  description += '\n'

  // Story Statement
  description += `## Story\n\n`
  description += `**As a** ${storyStatement.role},\n`
  description += `**I want** ${storyStatement.feature},\n`
  description += `**So that** ${storyStatement.benefit}.\n\n`

  // Acceptance Criteria
  if (acceptanceCriteria.length > 0) {
    description += `## Acceptance Criteria\n\n`
    for (const ac of acceptanceCriteria) {
      description += `### ${ac.scenario}\n\n`
      description += `**Given** ${ac.given}\n`
      description += `**When** ${ac.when}\n`
      description += `**Then** ${ac.then}\n\n`
    }
  }

  // Definition of Done
  if (definitionOfDone.length > 0) {
    description += `## Definition of Done\n\n`
    for (const dod of definitionOfDone) {
      const checkbox = dod.completed ? '- [x]' : '- [ ]'
      description += `${checkbox} ${dod.text}\n`
    }
    description += '\n'
  }

  // Related Items
  if (relatedItems.length > 0) {
    description += `## Related Items\n\n`
    for (const item of relatedItems) {
      description += `- ${item}\n`
    }
  }

  description += `\n---\n*Generated by BRUST Creator*`

  return description
}

/**
 * Builds the issue URL from JIRA response
 */
export function buildIssueUrl(cloudId: string, issueKey: string): string {
  // We need the site URL, which we can derive from the cloudId
  // In practice, we store this during OAuth flow or fetch from accessible-resources
  // For now, we'll construct it from the issue self URL pattern
  return `https://api.atlassian.com/ex/jira/${cloudId}/browse/${issueKey}`
}

/**
 * Gets the browse URL for a JIRA issue
 * Requires the site URL from accessible resources
 */
export function buildBrowseUrl(siteUrl: string, issueKey: string): string {
  const baseUrl = siteUrl.replace(/\/$/, '')
  return `${baseUrl}/browse/${issueKey}`
}
