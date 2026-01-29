/**
 * Confluence REST API Client
 * Uses Atlassian Cloud REST API v2
 */

const CONFLUENCE_API_BASE = 'https://api.atlassian.com/ex/confluence'

interface ConfluencePageResponse {
  id: string
  title: string
  version?: {
    number: number
  }
  _links: {
    webui: string
    base: string
  }
}

interface CreatePageOptions {
  cloudId: string
  accessToken: string
  spaceKey: string
  parentPageId?: string
  title: string
  content: string
}

interface UpdatePageOptions {
  cloudId: string
  accessToken: string
  pageId: string
  title: string
  content: string
}

/**
 * Creates a new Confluence page
 */
export async function createConfluencePage(
  options: CreatePageOptions
): Promise<ConfluencePageResponse> {
  const { cloudId, accessToken, spaceKey, parentPageId, title, content } = options

  const body: Record<string, unknown> = {
    type: 'page',
    title,
    space: { key: spaceKey },
    body: {
      storage: {
        value: content,
        representation: 'storage',
      },
    },
  }

  if (parentPageId) {
    body.ancestors = [{ id: parentPageId }]
  }

  const response = await fetch(
    `${CONFLUENCE_API_BASE}/${cloudId}/wiki/rest/api/content`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Confluence page: ${error}`)
  }

  return response.json()
}

/**
 * Updates an existing Confluence page
 */
export async function updateConfluencePage(
  options: UpdatePageOptions
): Promise<ConfluencePageResponse> {
  const { cloudId, accessToken, pageId, title, content } = options

  // First, get current page version
  const currentPage = await getConfluencePage(cloudId, accessToken, pageId)
  const currentVersion = currentPage.version?.number || 1

  const response = await fetch(
    `${CONFLUENCE_API_BASE}/${cloudId}/wiki/rest/api/content/${pageId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        type: 'page',
        title,
        body: {
          storage: {
            value: content,
            representation: 'storage',
          },
        },
        version: {
          number: currentVersion + 1,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update Confluence page: ${error}`)
  }

  return response.json()
}

/**
 * Gets a Confluence page by ID
 */
export async function getConfluencePage(
  cloudId: string,
  accessToken: string,
  pageId: string
): Promise<ConfluencePageResponse> {
  const response = await fetch(
    `${CONFLUENCE_API_BASE}/${cloudId}/wiki/rest/api/content/${pageId}?expand=version`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Confluence page: ${error}`)
  }

  return response.json()
}

/**
 * Converts Business Rule data to Confluence Storage Format (XHTML)
 */
export function businessRuleToConfluenceContent(brData: {
  ruleId: string
  ruleName: string
  version: string
  status: string
  category: string
  priority: string
  description: string
  ruleStatement: {
    if: string
    then: string
    else?: string
  }
  exceptions?: string[]
  examples?: Array<{
    scenario: string
    input: string
    output: string
    valid: boolean
  }>
  relatedRules?: string[]
  source?: string
  owner?: string
  effectiveDate?: string
}): string {
  const {
    ruleId,
    ruleName,
    version,
    status,
    category,
    priority,
    description,
    ruleStatement,
    exceptions = [],
    examples = [],
    relatedRules = [],
    source,
    owner,
    effectiveDate,
  } = brData

  // Status badge color mapping
  const statusColors: Record<string, string> = {
    draft: 'Blue',
    review: 'Yellow',
    approved: 'Green',
    deprecated: 'Red',
  }

  const priorityColors: Record<string, string> = {
    critical: 'Red',
    high: 'Orange',
    medium: 'Yellow',
    low: 'Green',
  }

  // Default values for missing fields
  const safeStatus = status || 'draft'
  const safePriority = priority || 'medium'

  return `
<h1>${ruleId}: ${ruleName}</h1>

<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="title">Rule Metadata</ac:parameter>
  <ac:rich-text-body>
    <table>
      <tr>
        <td><strong>Rule ID:</strong></td>
        <td>${ruleId}</td>
        <td><strong>Version:</strong></td>
        <td>${version}</td>
      </tr>
      <tr>
        <td><strong>Status:</strong></td>
        <td><ac:structured-macro ac:name="status"><ac:parameter ac:name="colour">${statusColors[safeStatus] || 'Grey'}</ac:parameter><ac:parameter ac:name="title">${safeStatus.toUpperCase()}</ac:parameter></ac:structured-macro></td>
        <td><strong>Priority:</strong></td>
        <td><ac:structured-macro ac:name="status"><ac:parameter ac:name="colour">${priorityColors[safePriority] || 'Grey'}</ac:parameter><ac:parameter ac:name="title">${safePriority.toUpperCase()}</ac:parameter></ac:structured-macro></td>
      </tr>
      <tr>
        <td><strong>Category:</strong></td>
        <td>${category}</td>
        <td><strong>Effective Date:</strong></td>
        <td>${effectiveDate || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Owner:</strong></td>
        <td>${owner || 'N/A'}</td>
        <td><strong>Source:</strong></td>
        <td>${source || 'N/A'}</td>
      </tr>
    </table>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Description</h2>
<p>${escapeHtml(description)}</p>

<h2>Rule Statement</h2>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">none</ac:parameter>
  <ac:plain-text-body><![CDATA[IF:   ${ruleStatement.if}
THEN: ${ruleStatement.then}${ruleStatement.else ? `
ELSE: ${ruleStatement.else}` : ''}]]></ac:plain-text-body>
</ac:structured-macro>

${exceptions.length > 0 ? `
<h2>Exceptions</h2>
<ul>
${exceptions.map(e => `  <li>${escapeHtml(e)}</li>`).join('\n')}
</ul>
` : ''}

${examples.length > 0 ? `
<h2>Examples</h2>
<table>
  <tr>
    <th>Scenario</th>
    <th>Input</th>
    <th>Output</th>
    <th>Valid</th>
  </tr>
${examples.map(ex => `  <tr>
    <td>${escapeHtml(ex.scenario)}</td>
    <td>${escapeHtml(ex.input)}</td>
    <td>${escapeHtml(ex.output)}</td>
    <td>${ex.valid ? '✅' : '❌'}</td>
  </tr>`).join('\n')}
</table>
` : ''}

${relatedRules.length > 0 ? `
<h2>Related Rules</h2>
<ul>
${relatedRules.map(r => `  <li>${escapeHtml(r)}</li>`).join('\n')}
</ul>
` : ''}

<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p>This document was generated by BRUST Creator.</p>
  </ac:rich-text-body>
</ac:structured-macro>
`.trim()
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Builds the full page URL from Confluence response
 */
export function buildPageUrl(response: ConfluencePageResponse): string {
  const baseUrl = response._links.base.replace(/\/$/, '')
  const webui = response._links.webui
  return `${baseUrl}${webui}`
}
