'use client'

import { useCallback } from 'react'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { parseAIResponse } from '@/lib/ai/response-parser'
import type { DocumentSection } from '@/stores/guided-creator-store'

export function useGuidedChat() {
  const {
    documentType,
    currentSection,
    sections,
    messages,
    addMessage,
    setAiThinking,
    updateSection,
    navigateToSection,
    calculateCompletion,
    overallCompletion,
    documentId,
    canSaveDraft,
  } = useGuidedCreatorStore()

  const callAPI = useCallback(async (
    userInput: string,
    action: 'start' | 'continue' | 'regenerate' | 'edit' = 'continue'
  ) => {
    const sectionState = sections[currentSection]
    const conversationHistory = messages
      .filter(m => m.role !== 'system')
      .slice(-20)
      .map(m => ({
        role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      }))

    const response = await fetch('/api/ai/guided', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType,
        currentSection,
        sectionContent: sectionState?.content || {},
        conversationHistory,
        userInput,
        action,
      }),
    })

    return response
  }, [documentType, currentSection, sections, messages])

  const sendMessage = useCallback(async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return

    addMessage({ role: 'user', content: trimmed })
    setAiThinking(true)

    try {
      const response = await callAPI(trimmed)

      if (!response.ok) {
        if (response.status === 429) {
          addMessage({
            role: 'system',
            content: 'You\'re sending messages too quickly. Please slow down and wait a moment.',
          })
        } else {
          addMessage({
            role: 'system',
            content: 'An error occurred while processing your request. Please try again.',
          })
        }
        return
      }

      const rawText = await response.text()
      const parsed = parseAIResponse(rawText)

      if (parsed.type === 'draft_proposal') {
        addMessage({
          role: 'ai',
          content: parsed.display,
          sectionContext: parsed.section as DocumentSection,
          actionRequired: 'accept',
          draftContent: parsed.content,
        })
      } else {
        addMessage({
          role: 'ai',
          content: parsed.display,
        })
      }

      if (parsed.suggestedAction === 'next_section') {
        // Could auto-navigate, but leave to user for now
      }
    } catch {
      addMessage({
        role: 'system',
        content: 'A network error occurred. Please check your connection and try again.',
      })
    } finally {
      setAiThinking(false)
    }
  }, [addMessage, setAiThinking, callAPI])

  const regenerate = useCallback(async () => {
    setAiThinking(true)

    try {
      const response = await callAPI('Please regenerate the previous draft with a different approach.', 'regenerate')

      if (!response.ok) {
        addMessage({
          role: 'system',
          content: 'An error occurred while regenerating. Please try again.',
        })
        return
      }

      const rawText = await response.text()
      const parsed = parseAIResponse(rawText)

      if (parsed.type === 'draft_proposal') {
        addMessage({
          role: 'ai',
          content: parsed.display,
          sectionContext: parsed.section as DocumentSection,
          actionRequired: 'accept',
          draftContent: parsed.content,
        })
      } else {
        addMessage({
          role: 'ai',
          content: parsed.display,
        })
      }
    } catch {
      addMessage({
        role: 'system',
        content: 'A network error occurred. Please try again.',
      })
    } finally {
      setAiThinking(false)
    }
  }, [addMessage, setAiThinking, callAPI])

  const saveDraft = useCallback(async () => {
    const sectionEntries = Object.entries(sections)
    const content: Record<string, unknown> = {}

    for (const [key, state] of sectionEntries) {
      if (state && Object.keys(state.content).length > 0) {
        content[key] = state.content
      }
    }

    const title = (sections.basicInfo?.content?.ruleName as string)
      || (sections.basicInfo?.content?.title as string)
      || 'Untitled Draft'

    const body = {
      title,
      documentType,
      content,
      status: 'draft',
    }

    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error('Failed to save draft')
    }

    return response.json()
  }, [sections, documentType])

  return {
    sendMessage,
    regenerate,
    saveDraft,
  }
}
