'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Edit, Trash2, Loader2, ArrowRight } from 'lucide-react'
import { renderMarkdown } from '@/lib/render-markdown'
import type { Document } from '@/lib/db/schema'
import type { BusinessRuleData } from '@/types/business-rule'
import type { UserStoryData } from '@/types/user-story'
import { useConversion } from '@/hooks/use-conversion'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import type { GeneratedStory } from '@/stores/guided-creator-store'
import {
  ConversionPrompt,
  AnalysisPanel,
  SideBySideView,
  StoryEditorModal,
  RefineStoryModal,
  ConversionSummary,
} from '@/components/guided/conversion'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  deprecated: 'bg-gray-100 text-gray-800',
}

/**
 * Recursively extracts if/then/else from a ruleStatement section object.
 * Handles: flat { if, then }, nested { conditions: { condition1: {if,then} } },
 * and any top-level object whose values are {if,then} objects.
 */
function extractIfThen(section: Record<string, unknown>): { if: string; then: string; else?: string } {
  // Direct if/then keys at top level
  if (section.if || section.then) {
    return {
      if: String(section.if || ''),
      then: String(section.then || ''),
      else: section.else ? String(section.else) : undefined,
    }
  }
  // Text blob with IF/THEN markers (handles AI text-format drafts)
  if (typeof section.text === 'string') {
    const text = section.text
    const ifMatch = text.match(/\*{0,2}IF:?\*{0,2}\s*([^\n]+)/i)
    const thenMatch = text.match(/\*{0,2}THEN:?\*{0,2}\s*([^\n]+)/i)
    const elseMatch = text.match(/\*{0,2}ELSE:?\*{0,2}\s*([^\n]+)/i)
    if (ifMatch || thenMatch) {
      return {
        if: ifMatch?.[1]?.trim() ?? '',
        then: thenMatch?.[1]?.trim() ?? '',
        else: elseMatch?.[1]?.trim(),
      }
    }
  }
  // Scan any string values for embedded IF/THEN patterns (handles keys like 'statement', 'rule', etc.)
  for (const value of Object.values(section)) {
    if (typeof value !== 'string' || !value) continue
    const ifMatch = value.match(/\*{0,2}IF:?\*{0,2}\s*([^\n]+)/i)
    const thenMatch = value.match(/\*{0,2}THEN:?\*{0,2}\s*([^\n]+)/i)
    const elseMatch = value.match(/\*{0,2}ELSE:?\*{0,2}\s*([^\n]+)/i)
    if (ifMatch || thenMatch) {
      return {
        if: ifMatch?.[1]?.trim() ?? '',
        then: thenMatch?.[1]?.trim() ?? '',
        else: elseMatch?.[1]?.trim(),
      }
    }
  }
  // Look through top-level values for nested condition objects (recursive)
  for (const value of Object.values(section)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const nested = value as Record<string, unknown>
    // Nested object itself has if/then (e.g., { primary: { if, then } })
    if (nested.if || nested.then) {
      return {
        if: String(nested.if || ''),
        then: String(nested.then || ''),
        else: nested.else ? String(nested.else) : undefined,
      }
    }
    // Nested object has conditionX keys (e.g., { conditions: { condition1: {if,then} } })
    const condKeys = Object.keys(nested).filter(k => /^condition\d+$/i.test(k))
    if (condKeys.length > 0) {
      const allIf: string[] = []
      const allThen: string[] = []
      for (const ck of condKeys) {
        const cond = nested[ck] as Record<string, unknown>
        if (cond.if) allIf.push(String(cond.if))
        if (cond.then) {
          const t = Array.isArray(cond.then) ? (cond.then as string[]).join('; ') : String(cond.then)
          allThen.push(t)
        }
      }
      if (allIf.length > 0 || allThen.length > 0) {
        return { if: allIf.join(' / '), then: allThen.join(' / ') }
      }
    }
    // Recurse deeper into nested objects
    const deep = extractIfThen(nested)
    if (deep.if || deep.then) return deep
  }
  // Last resort: map semantic equivalents of IF/THEN from any key names
  const condKey = Object.keys(section).find(k => /^(condition|when|trigger|given)$/i.test(k))
  const actionKey = Object.keys(section).find(k => /^(action|result|outcome|then|do|response)$/i.test(k))
  const elseKey = Object.keys(section).find(k => /^(else|otherwise|fallback)$/i.test(k))
  if (condKey || actionKey) {
    return {
      if: condKey && typeof section[condKey] === 'string' ? String(section[condKey]) : '',
      then: actionKey && typeof section[actionKey] === 'string' ? String(section[actionKey]) : '',
      else: elseKey && typeof section[elseKey] === 'string' ? String(section[elseKey]) : undefined,
    }
  }
  return { if: '', then: '' }
}

/** Handles both flat BusinessRuleData (expert/wizard) and section-keyed data (guided creator) */
function normalizeContent(raw: unknown): BusinessRuleData {
  const c = raw as Record<string, unknown>
  // Already flat (wizard/expert mode): ruleName and/or description are strings directly at root,
  // AND ruleStatement has if/then fields at its top level.
  // Guided creator stores ruleName inside basicInfo, so typeof c.ruleName !== 'string' there.
  const isFlat =
    (typeof c.ruleName === 'string' || typeof c.description === 'string') &&
    c.ruleStatement != null &&
    typeof c.ruleStatement === 'object' &&
    ('if' in (c.ruleStatement as object) || 'then' in (c.ruleStatement as object))
  if (isFlat) {
    return raw as BusinessRuleData
  }
  // Section-keyed format from guided creator
  const basicInfo = (c.basicInfo as Record<string, unknown>) || {}
  const descSection = (c.description as Record<string, unknown>) || {}
  const ruleStmtSection = (c.ruleStatement as Record<string, unknown>) || {}
  const exceptionsSection = (c.exceptions as Record<string, unknown>) || {}
  const examplesSection = (c.examples as Record<string, unknown>) || {}
  const metadataSection = (c.metadata as Record<string, unknown>) || {}

  const descValue = typeof descSection.text === 'string'
    ? descSection.text
    : Object.entries(descSection)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join('\n')

  /** Split a markdown exceptions text blob into numbered list items using position-based slicing.
   *  Avoids lookahead split which slices mid-** markers and creates bare * fragments. */
  function splitExceptionText(text: string): string[] {
    const positions: number[] = []
    // Match: optional ** (1 or 2) then digits + period + whitespace
    const pattern = /(\*{1,2})?(\d+)\.\s+/g
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      const pos = m.index
      const before = pos > 0 ? text[pos - 1] : ''
      // Only split at valid item boundaries: string start, or preceded by whitespace/asterisk
      if (pos === 0 || /[\s*]/.test(before)) {
        positions.push(pos)
      }
    }
    if (positions.length <= 1) return [text.trim()].filter(Boolean)
    const items: string[] = []
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i]
      const end = i + 1 < positions.length ? positions[i + 1] : text.length
      const item = text.slice(start, end).trim()
      // Exclude degenerate fragments that are only asterisks or whitespace
      if (item && item.replace(/[\s*]/g, '').length > 0) items.push(item)
    }
    return items.length > 0 ? items : [text.trim()].filter(Boolean)
  }

  const rawExc = Object.values(exceptionsSection).find(v => Array.isArray(v)) as unknown[] | undefined
  const exceptions: string[] = rawExc
    ? rawExc.map(e => typeof e === 'string' ? e : JSON.stringify(e))
    : typeof exceptionsSection.text === 'string'
      ? splitExceptionText(exceptionsSection.text)
      : []

  const rawEx = Object.values(examplesSection).find(v => Array.isArray(v)) as unknown[] | undefined
  let examples: { scenario: string; isValid: boolean; description: string }[] = rawEx
    ? rawEx.map(e => {
        if (typeof e === 'string') return { scenario: e, isValid: true, description: e }
        const obj = e as Record<string, unknown>
        return { scenario: String(obj.scenario || obj.name || ''), isValid: obj.isValid !== false, description: String(obj.description || obj.expected || '') }
      })
    : []

  // Parse examples from text blob (guided creator AI output)
  if (examples.length === 0 && typeof examplesSection.text === 'string') {
    const exText = examplesSection.text
    // Detect which ranges are FAIL sections so we can set isValid correctly
    const failStart = exText.search(/FAIL\s+Scenarios?/i)
    const exMatches = [...exText.matchAll(/Example\s+\d+:\s*([^\n]+)([\s\S]*?)(?=Example\s+\d+:|PASS\s+Scenarios?|FAIL\s+Scenarios?|$)/gi)]
    if (exMatches.length > 0) {
      for (const m of exMatches) {
        const title = m[1].replace(/\([^)]*\)/g, '').replace(/\*{1,2}/g, '').trim()
        const block = m[0]
        const pos = m.index ?? 0
        const isInFail = failStart !== -1 && pos > failStart
        const resultLine = block.match(/Result:\s*(.+)/i)?.[1]?.toLowerCase() ?? ''
        const isValid = !isInFail && !/decline|block|invalid|fail|reject/i.test(resultLine)
        // Build a clean description from the block's sub-fields
        const desc = block
          .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
          .replace(/^Example\s+\d+:[^\n]+\n?/i, '')
          .trim()
        if (title) examples.push({ scenario: title, isValid, description: desc })
      }
    } else {
      // Fallback: single text entry
      examples.push({ scenario: 'Examples', isValid: true, description: exText.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1').trim() })
    }
  }

  const owners = metadataSection.owners as Array<Record<string, string>> | undefined
  let ownerStr = owners?.[0]?.role || String(metadataSection.owner || '')
  let sourceStr = String(metadataSection.source || '')
  let effectiveDateStr = String(metadataSection.effectiveDate || metadataSection.effective_date || '')

  // Parse metadata from text blob (guided creator AI output)
  if (typeof metadataSection.text === 'string') {
    const mt = metadataSection.text
    if (!ownerStr) {
      ownerStr = (mt.match(/(?:Business\s+Owner|Technical\s+Owner|Owner):\s*(.+)/i)?.[1] ?? '').replace(/\*{1,2}/g, '').trim()
    }
    if (!sourceStr) {
      sourceStr = (mt.match(/Source:\s*(.+)/i)?.[1] ?? '').replace(/\*{1,2}/g, '').trim()
    }
    if (!effectiveDateStr) {
      effectiveDateStr = (mt.match(/Effective(?:\s+Date)?:\s*(.+)/i)?.[1] ?? '').replace(/\*{1,2}/g, '').trim()
    }
  }

  return {
    ruleId: String(basicInfo.ruleId || ''),
    ruleName: String(basicInfo.ruleName || basicInfo.title || ''),
    category: (basicInfo.category as BusinessRuleData['category']) || 'validation',
    priority: (basicInfo.priority as BusinessRuleData['priority']) || 'medium',
    description: descValue,
    ruleStatement: extractIfThen(ruleStmtSection),
    exceptions,
    examples,
    relatedRules: [],
    source: sourceStr,
    owner: ownerStr,
    effectiveDate: effectiveDateStr,
    version: '1',
    status: 'draft',
  }
}

export default function BusinessRuleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showConversion, setShowConversion] = useState(false)
  const [conversionPromptDismissed, setConversionPromptDismissed] = useState(false)

  // Restore conversion panel visibility from persisted state after client hydration
  useEffect(() => {
    const { mode } = useGuidedCreatorStore.getState().conversion
    if (mode !== 'none') setShowConversion(true)
  }, [])
  const [editingStory, setEditingStory] = useState<GeneratedStory | null>(null)
  const [refiningStory, setRefiningStory] = useState<GeneratedStory | null>(null)
  const [isSavingStories, setIsSavingStories] = useState(false)

  const { analyze, convert } = useConversion()
  const conversion = useGuidedCreatorStore((state) => state.conversion)
  const { acceptStory, editStory, updateStory, deleteStory, addManualStory, resetConversion, setConversionError } = useGuidedCreatorStore()

  const id = params.id as string

  // Clear stale conversion error from previous sessions
  useEffect(() => {
    setConversionError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Document not found')
          }
          throw new Error('Failed to fetch document')
        }
        const data = await response.json()
        setDocument(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [id])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete document')
      }
      router.push('/history')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setIsDeleting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) {
        throw new Error('Failed to update status')
      }
      const data = await response.json()
      setDocument(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleStartConversion = async () => {
    if (!document) return
    const content = normalizeContent(document.content)
    setShowConversion(true)
    await analyze(content)
  }

  const handleAcceptAnalysis = async (count: number) => {
    if (!document) return
    const content = normalizeContent(document.content)
    await convert(content, { storyCount: count })
  }

  const handleEditStory = (storyId: string) => {
    editStory(storyId)
    const story = conversion.convertedStories.find((s) => s.id === storyId)
    if (story) setEditingStory(story)
  }

  const handleSaveStoryEdit = (data: UserStoryData) => {
    if (editingStory) {
      updateStory(editingStory.id, data)
      acceptStory(editingStory.id)
      setEditingStory(null)
    }
  }

  const handleRefine = (storyId: string) => {
    const story = conversion.convertedStories.find((s) => s.id === storyId)
    if (story) setRefiningStory(story)
  }

  const handleSaveAllStories = async () => {
    setIsSavingStories(true)
    try {
      const failed: string[] = []
      for (const story of conversion.convertedStories) {
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentType: 'user_story',
            title: story.data.title || story.data.storyId,
            content: story.data,
            status: 'draft',
            relatedItems: [document?.documentId],
          }),
        })
        if (!response.ok) {
          failed.push(story.data.title || story.data.storyId || story.id)
        }
      }
      if (failed.length > 0) {
        setError(`Failed to save ${failed.length} story(ies): ${failed.join(', ')}`)
        return
      }
      resetConversion()
      setShowConversion(false)
      router.push('/history')
    } catch {
      setError('Failed to save stories')
    } finally {
      setIsSavingStories(false)
    }
  }

  // Show conversion for all business rule statuses (not just review/approved)
  const isCompletedBR = document?.documentType === 'business_rule'

  if (isLoading) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    )
  }

  if (error || !document) {
    return (
      <main className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-8 text-center">
            <p className="text-red-500 mb-4">{error || 'Document not found'}</p>
            <Link href="/history">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const content = normalizeContent(document.content)

  // Raw section objects (guided-creator format) used for richer display
  const rawC = document.content as Record<string, unknown>
  const isSectionKeyed = !!(rawC.basicInfo ||
    (rawC.description && typeof rawC.description === 'object') ||
    rawC.exceptions || rawC.examples || rawC.metadata)
  const rawDesc    = isSectionKeyed ? ((rawC.description as Record<string, unknown>) || null) : null
  const rawExcSec  = isSectionKeyed ? ((rawC.exceptions  as Record<string, unknown>) || null) : null
  const rawExSec   = isSectionKeyed ? ((rawC.examples    as Record<string, unknown>) || null) : null
  const rawMetaSec = isSectionKeyed ? ((rawC.metadata    as Record<string, unknown>) || null) : null

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </Link>
          <div className="flex gap-2">
            {document.status === 'draft' && (
              <Button 
                size="sm" 
                onClick={() => handleStatusChange('review')}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Submitting...' : 'Submit for Review'}
              </Button>
            )}
            {document.status === 'review' && (
              <Button 
                size="sm" 
                onClick={() => handleStatusChange('approved')}
                disabled={isUpdatingStatus}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdatingStatus ? 'Approving...' : 'Approve'}
              </Button>
            )}
            <Button variant="outline" size="sm" disabled>
              <Edit className="w-4 h-4 mr-2" />
              Edit (Coming Soon)
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{document.title}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {document.documentId} · Version {document.version}
                </p>
              </div>
              <Badge className={STATUS_COLORS[document.status]} variant="secondary">
                {document.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-6 rounded-lg font-mono text-sm space-y-4">
              {/* Header */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Rule ID:</span>{' '}
                  <span className="font-semibold">{content?.ruleId || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rule Name:</span>{' '}
                  <span>{content?.ruleName || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>{' '}
                  <span className="capitalize">{content?.category || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>{' '}
                  <span className="capitalize">{content?.priority || '-'}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-muted-foreground font-bold mb-1">DESCRIPTION:</div>
                {rawDesc && Object.keys(rawDesc).length > 0 ? (
                  typeof rawDesc.text === 'string' ? (
                    // Text-blob format: render markdown
                    <div className="text-sm leading-relaxed">{renderMarkdown(rawDesc.text)}</div>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(rawDesc).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}:</span>{' '}
                          {typeof v === 'string'
                            ? v
                            : Array.isArray(v)
                              ? (v as unknown[]).every(i => i !== null && typeof i === 'object')
                                ? <div className="mt-1 pl-3 border-l-2 border-muted space-y-1">
                                    {(v as Record<string, unknown>[]).map((item, idx) => (
                                      <div key={idx} className="text-xs">
                                        {Object.entries(item).map(([ik, iv]) => (
                                          <div key={ik}><span className="font-medium capitalize">{ik.replace(/_/g, ' ')}:</span> {typeof iv === 'string' ? iv : JSON.stringify(iv)}</div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                : (v as string[]).join(', ')
                              : v !== null && typeof v === 'object'
                                ? JSON.stringify(v)
                                : String(v ?? '')}
                        </div>
                      ))}
                    </div>
                  )
                ) : typeof content?.description === 'string' ? (
                  <p className="whitespace-pre-wrap">{content.description || '-'}</p>
                ) : (
                  <p>-</p>
                )}
              </div>

              {/* Rule Statement */}
              <div>
                <div className="text-muted-foreground font-bold mb-1">RULE STATEMENT:</div>
                <div className="ml-4 space-y-1">
                  {content?.ruleStatement?.if || content?.ruleStatement?.then ? (
                    // Simple flat IF/THEN/ELSE format
                    <>
                      <div>
                        <span className="text-muted-foreground">IF:</span>{' '}
                        {content.ruleStatement.if || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">THEN:</span>{' '}
                        {content.ruleStatement.then || '-'}
                      </div>
                      {content.ruleStatement.else && (
                        <div>
                          <span className="text-muted-foreground">ELSE:</span>{' '}
                          {content.ruleStatement.else}
                        </div>
                      )}
                    </>
                  ) : (
                    // Fallback: render raw ruleStatement section content (complex AI-generated format)
                    (() => {
                      const rawRS = (document.content as Record<string, unknown>)?.ruleStatement
                      if (!rawRS || typeof rawRS !== 'object') return <span>-</span>
                      const rsObj = rawRS as Record<string, unknown>
                      return (
                        <div className="space-y-1">
                          {Object.entries(rsObj).map(([key, value]) => {
                            if (value === null || value === undefined) return null
                            if (typeof value === 'object' && !Array.isArray(value)) {
                              const nested = value as Record<string, unknown>
                              // conditionX pattern
                              const condKeys = Object.keys(nested).filter(k => /^condition\d+$/i.test(k))
                              if (condKeys.length > 0) {
                                return (
                                  <div key={key}>
                                    <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>
                                    <div className="mt-1 space-y-1 pl-3 border-l-2 border-muted">
                                      {condKeys.map(ck => {
                                        const cond = nested[ck] as Record<string, unknown>
                                        return (
                                          <div key={ck} className="text-xs space-y-0.5">
                                            <span className="font-medium capitalize">{ck.replace(/_/g, ' ')}:</span>
                                            {cond.if && <div><span className="text-blue-600 font-semibold">IF</span> {String(cond.if)}</div>}
                                            {cond.then && <div><span className="text-green-600 font-semibold">THEN</span>{' '}{Array.isArray(cond.then) ? (cond.then as string[]).join('; ') : String(cond.then)}</div>}
                                            {cond.else && <div><span className="text-orange-600 font-semibold">ELSE</span> {String(cond.else)}</div>}
                                            {cond.priority && <div className="text-muted-foreground">Priority: {String(cond.priority)}</div>}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              }
                              // Nested object with if/then
                              if (nested.if || nested.then) {
                                return (
                                  <div key={key}>
                                    {nested.if && <div><span className="text-blue-600 font-semibold">IF</span> {String(nested.if)}</div>}
                                    {nested.then && <div><span className="text-green-600 font-semibold">THEN</span> {String(nested.then)}</div>}
                                    {nested.else && <div><span className="text-orange-600 font-semibold">ELSE</span> {String(nested.else)}</div>}
                                  </div>
                                )
                              }
                            }
                            return (
                              <div key={key}>
                                <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>{' '}
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()
                  )}
                </div>
              </div>

              {/* Exceptions */}
              <div>
                <div className="text-muted-foreground font-bold mb-1">EXCEPTIONS:</div>
                {rawExcSec && Object.keys(rawExcSec).length > 0 ? (
                  (() => {
                    let items: unknown[] = []
                    for (const val of Object.values(rawExcSec)) {
                      if (Array.isArray(val)) { items = val; break }
                    }
                    if (items.length === 0 && typeof rawExcSec.text === 'string') {
                      return <div className="ml-4 text-sm">{renderMarkdown(rawExcSec.text)}</div>
                    }
                    if (items.length === 0) {
                      items = Object.entries(rawExcSec).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                    }
                    return items.length === 0
                      ? <span className="ml-4">None</span>
                      : <div className="ml-4 space-y-1 text-sm">
                          {items.map((item, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-muted-foreground mt-0.5">•</span>
                              <span>
                                {typeof item === 'string'
                                  ? renderMarkdown(item)
                                  : (() => {
                                      const obj = item as Record<string, unknown>
                                      return Object.entries(obj).map(([k, v]) => (
                                        <div key={k}><span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</div>
                                      ))
                                    })()}
                              </span>
                            </div>
                          ))}
                        </div>
                  })()
                ) : content?.exceptions && content.exceptions.length > 0 ? (
                  <ul className="ml-4 list-disc">
                    {content.exceptions.map((ex, i) => (
                      <li key={i}>{typeof ex === 'string' ? renderMarkdown(ex) : JSON.stringify(ex)}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="ml-4">None</span>
                )}
              </div>

              {/* Examples */}
              <div>
                <div className="text-muted-foreground font-bold mb-1">EXAMPLES:</div>
                {rawExSec && Object.keys(rawExSec).length > 0 ? (
                  (() => {
                    let items: unknown[] = []
                    for (const val of Object.values(rawExSec)) {
                      if (Array.isArray(val)) { items = val; break }
                    }
                    if (items.length === 0 && typeof rawExSec.text === 'string') {
                      return <div className="ml-4 text-sm">{renderMarkdown(rawExSec.text)}</div>
                    }
                    if (items.length === 0) {
                      items = Object.entries(rawExSec).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                    }
                    if (items.length === 0) return <span className="ml-4">None</span>
                    return (
                      <div className="ml-4 space-y-2 text-sm">
                        {items.map((item, i) => {
                          if (typeof item === 'string') {
                            return <div key={i} className="flex gap-2"><span className="text-muted-foreground mt-0.5">•</span><span>{item}</span></div>
                          }
                          const obj = item as Record<string, unknown>
                          const isValid = obj.isValid !== false
                          return (
                            <div key={i} className="pl-3 border-l-2 border-muted space-y-0.5">
                              {obj.isValid !== undefined && (
                                <span className={isValid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>[{isValid ? 'Valid' : 'Invalid'}]</span>
                              )}
                              {Object.entries(obj).filter(([k]) => k !== 'isValid').map(([k, v]) => (
                                <div key={k}><span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span>{' '}{typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join(', ') : JSON.stringify(v)}</div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()
                ) : content?.examples && content.examples.length > 0 ? (
                  <div className="ml-4 space-y-2">
                    {content.examples.map((ex, i) => (
                      <div key={i}>
                        <span className={ex.isValid ? 'text-green-600' : 'text-red-600'}>
                          [{ex.isValid ? 'Valid' : 'Invalid'}]
                        </span>{' '}
                        {ex.scenario}: {ex.description}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="ml-4">None</span>
                )}
              </div>

              {/* Metadata */}
              {rawMetaSec && Object.keys(rawMetaSec).length > 0 ? (
                typeof rawMetaSec.text === 'string' ? (
                  // Text-blob format from guided AI: strip AI completion message appended after the metadata
                  // (anything from a "---" separator line or "🎉" onwards is conversational, not metadata)
                  (() => {
                    const raw = rawMetaSec.text as string
                    const cutPatterns = [/\n---+\s*\n/, /\n🎉/, /\nBusiness Rule Complete/i, /\nSuggested Next Steps/i]
                    let cutIdx = raw.length
                    for (const pat of cutPatterns) {
                      const m = pat.exec(raw)
                      if (m && m.index < cutIdx) cutIdx = m.index
                    }
                    const metaText = raw.slice(0, cutIdx).trim()
                    return metaText
                      ? <div className="text-sm leading-relaxed">{renderMarkdown(metaText)}</div>
                      : <span className="text-muted-foreground">-</span>
                  })()
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(rawMetaSec).map(([key, value]) => {
                      const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
                      return (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{label}:</span>{' '}
                          {Array.isArray(value)
                            ? value.length === 0
                              ? '-'
                              : typeof value[0] === 'object'
                                ? (value as Record<string, unknown>[]).map((v, i) => (
                                    <span key={i}>{Object.values(v).filter(x => typeof x === 'string').join(' – ') || JSON.stringify(v)}</span>
                                  ))
                                : (value as string[]).join(', ')
                            : typeof value === 'string'
                              ? value || '-'
                              : value !== null && typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value ?? '-')}
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Related Rules:</span>{' '}
                    {content?.relatedRules && content.relatedRules.length > 0 ? content.relatedRules.join(', ') : 'None'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source:</span>{' '}
                    {content?.source || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Owner:</span>{' '}
                    {content?.owner || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Effective:</span>{' '}
                    {content?.effectiveDate || '-'}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Created: {new Date(document.createdAt!).toLocaleString()}</span>
                <span>Updated: {new Date(document.updatedAt!).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BR-to-US Conversion Section */}
        {isCompletedBR && !showConversion && conversion.mode === 'none' && !conversionPromptDismissed && (
          <div className="mt-6">
            <ConversionPrompt
              brTitle={document.title}
              onConvert={handleStartConversion}
              onSkip={() => setConversionPromptDismissed(true)}
            />
          </div>
        )}

        {showConversion && conversion.mode === 'analyzing' && conversion.analysis && (
          <div className="mt-6">
            <AnalysisPanel
              recommendation={conversion.analysis}
              onAccept={handleAcceptAnalysis}
              isAnalyzing={false}
            />
          </div>
        )}

        {showConversion && conversion.mode === 'analyzing' && !conversion.analysis && (
          <div className="mt-6">
            <AnalysisPanel
              recommendation={{ shouldSplit: false, suggestedCount: 1, reasoning: [], proposedStories: [] }}
              onAccept={handleAcceptAnalysis}
              isAnalyzing={true}
            />
          </div>
        )}

        {showConversion && conversion.mode === 'converting' && (
          <div className="mt-6 flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {showConversion && conversion.mode === 'complete' && conversion.convertedStories.length > 0 && (
          <div className="mt-6 space-y-6">
            <SideBySideView
              businessRule={content}
              stories={conversion.convertedStories}
              onAccept={acceptStory}
              onEdit={handleEditStory}
              onDelete={deleteStory}
              onChat={handleRefine}
            />
            <ConversionSummary
              stories={conversion.convertedStories}
              onSaveAll={handleSaveAllStories}
              onAddManual={addManualStory}
              isSaving={isSavingStories}
            />
          </div>
        )}

        {conversion.error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {conversion.error}
          </div>
        )}

        {/* Story Editor Modal */}
        {editingStory && (
          <StoryEditorModal
            story={editingStory}
            open={!!editingStory}
            onSave={handleSaveStoryEdit}
            onCancel={() => setEditingStory(null)}
          />
        )}

        {/* Refine with AI Modal */}
        {refiningStory && (
          <RefineStoryModal
            story={refiningStory}
            open={!!refiningStory}
            onApply={(updates) => {
              updateStory(refiningStory.id, { ...refiningStory.data, ...updates })
              setRefiningStory(null)
            }}
            onCancel={() => setRefiningStory(null)}
          />
        )}
      </div>
    </main>
  )
}
