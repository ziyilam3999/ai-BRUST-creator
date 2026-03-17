'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Sparkles } from 'lucide-react'
import type { GeneratedStory } from '@/stores/guided-creator-store'
import type { UserStoryData } from '@/types/user-story'

interface RefinedFields {
  feature?: string
  benefit?: string
}

interface Props {
  story: GeneratedStory
  open: boolean
  onApply: (updates: Partial<UserStoryData>) => void
  onCancel: () => void
}

/**
 * Collect the full text from a Vercel AI SDK data-stream response.
 * Each chunk is emitted as a line: 0:"text delta"\n
 */
async function collectStream(response: Response): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const raw = decoder.decode(value, { stream: true })
    for (const line of raw.split('\n')) {
      // Vercel AI SDK text delta format: 0:"chunk"
      if (line.startsWith('0:')) {
        try {
          const parsed = JSON.parse(line.slice(2))
          if (typeof parsed === 'string') fullText += parsed
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
  return fullText
}

/**
 * Extract JSON from the AI response text.
 * Handles both bare JSON and JSON wrapped in ```json ... ``` fences.
 */
function parseRefinedFields(text: string): RefinedFields {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonText = fenceMatch ? fenceMatch[1] : text
  try {
    const parsed = JSON.parse(jsonText.trim())
    return {
      feature: typeof parsed.feature === 'string' ? parsed.feature : undefined,
      benefit: typeof parsed.benefit === 'string' ? parsed.benefit : undefined,
    }
  } catch {
    return {}
  }
}

export function RefineStoryModal({ story, open, onApply, onCancel }: Props) {
  const [instruction, setInstruction] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [refined, setRefined] = useState<RefinedFields | null>(null)
  const [rawResponse, setRawResponse] = useState('')
  const [refineError, setRefineError] = useState<string | null>(null)

  const { role, feature, benefit } = story.data.storyStatement

  const handleRefine = async () => {
    if (!instruction.trim()) return
    setIsRefining(true)
    setRefined(null)
    setRawResponse('')
    setRefineError(null)

    const prompt = `Please refine this user story based on the instruction below.

Current story:
As a ${role}
I want ${feature}
So that ${benefit}

Instruction: ${instruction.trim()}

Respond with ONLY valid JSON (no markdown fences, no explanation):
{"feature":"<updated I want text>","benefit":"<updated So that text>"}`

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          context: { documentType: 'user_story' },
        }),
      })

      if (!response.ok) {
        throw new Error('AI request failed')
      }

      const text = await collectStream(response)
      setRawResponse(text)
      const fields = parseRefinedFields(text)

      if (!fields.feature && !fields.benefit) {
        setRefineError('Could not parse AI response. Check raw output below.')
      } else {
        setRefined(fields)
      }
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsRefining(false)
    }
  }

  const handleApply = () => {
    if (!refined) return
    const updates: Partial<UserStoryData> = {
      storyStatement: {
        role,
        feature: refined.feature ?? feature,
        benefit: refined.benefit ?? benefit,
      },
    }
    onApply(updates)
    // Reset for next open
    setInstruction('')
    setRefined(null)
    setRawResponse('')
    setRefineError(null)
  }

  const handleClose = () => {
    setInstruction('')
    setRefined(null)
    setRawResponse('')
    setRefineError(null)
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Refine with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Current story (read-only) */}
          <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Current Story</p>
            <p><strong>As a</strong> {role}</p>
            <p><strong>I want</strong> {feature}</p>
            <p><strong>So that</strong> {benefit}</p>
          </div>

          {/* Instruction */}
          <div>
            <Label htmlFor="refine-instruction">What would you like to change?</Label>
            <Textarea
              id="refine-instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              className="mt-1.5 resize-y"
              placeholder='e.g. "Make the I want more specific about the $100 threshold" or "Simplify the benefit statement"'
              disabled={isRefining}
            />
          </div>

          {/* Refined preview */}
          {refined && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm space-y-1">
              <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Suggested Refinement</p>
              <p><strong>As a</strong> {role}</p>
              <p><strong>I want</strong> {refined.feature ?? feature}</p>
              <p><strong>So that</strong> {refined.benefit ?? benefit}</p>
            </div>
          )}

          {/* Parse error + raw output */}
          {refineError && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{refineError}</p>
              {rawResponse && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw AI output</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded border bg-muted p-3">{rawResponse}</pre>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!refined ? (
            <Button onClick={handleRefine} disabled={isRefining || !instruction.trim()}>
              {isRefining
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Refining...</>
                : <><Sparkles className="mr-2 h-4 w-4" />Refine</>}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setRefined(null); setRawResponse('') }}>
                Try Again
              </Button>
              <Button onClick={handleApply}>
                Apply Changes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
