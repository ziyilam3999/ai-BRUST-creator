'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { useGuidedChat } from '@/hooks/use-guided-chat'
import { MessageBubble } from './message-bubble'
import { ActionBar } from './action-bar'
import { PublishSuggestionCard } from './publish/publish-suggestion-card'
import { AIErrorMessage } from './ai-error-message'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import type { DocumentSection } from '@/stores/guided-creator-store'

const BR_SECTIONS: DocumentSection[] = ['basicInfo', 'description', 'ruleStatement', 'exceptions', 'examples', 'metadata']
const US_SECTIONS: DocumentSection[] = ['basicInfo', 'storyStatement', 'acceptanceCriteria', 'definitionOfDone', 'relatedItems']

function getNextSection(
  documentType: 'business_rule' | 'user_story',
  currentSection: DocumentSection
): DocumentSection | null {
  const sections = documentType === 'business_rule' ? BR_SECTIONS : US_SECTIONS
  const currentIndex = sections.indexOf(currentSection)
  if (currentIndex === -1 || currentIndex >= sections.length - 1) return null
  return sections[currentIndex + 1]
}

export function ConversationPanel() {
  const {
    messages,
    isAiThinking,
    documentType,
    currentSection,
    acceptDraft,
    editSection,
    navigateToSection,
    publishSuggestion,
    dismissPublishSuggestion,
    setRemindLater,
    lastAiError,
    clearAiError,
    setDocumentStatus,
    documentStatus,
    addMessage,
    updateSection,
    calculateCompletion,
  } = useGuidedCreatorStore()
  const { sendMessage, regenerate } = useGuidedChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Always reference the latest sendMessage to avoid stale-closure bugs in timeouts
  const sendMessageRef = useRef(sendMessage)
  useEffect(() => { sendMessageRef.current = sendMessage }, [sendMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Determine if ActionBar should be shown
  const actionBarContext = useMemo(() => {
    if (messages.length === 0) return null
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === 'ai' && lastMessage.actionRequired && lastMessage.sectionContext) {
      return {
        section: lastMessage.sectionContext as DocumentSection,
      }
    }
    return null
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    sendMessage(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isLastSection = getNextSection(documentType, currentSection) === null

  const handleFinalize = () => {
    // Don't re-finalize if already complete (prevents duplicate completion messages)
    if (isLastSection && documentStatus === 'complete') return
    // Capture the last substantive AI message (skip our own sentinel completion message)
    const SENTINEL = '\ud83c\udf89 All sections are complete!'
    const lastAiMsg = [...messages].reverse().find(
      m => m.role === 'ai' && !m.content.startsWith(SENTINEL)
    )
    // Strip trailing action footer and follow-up question from captured AI content
    const stripActionFooter = (text: string) => {
      return text
        // Strip "--- \n\n Actions: [...]" pattern
        .replace(/\n*---\s*\n+\s*\*?\*?Actions?:\*?\*?[\s\S]*$/i, '')
        // Also strip standalone "Actions: [...]" line (no preceding ---)
        .replace(/\n+\s*\*?\*?Actions?:\*?\*?\s*\[[\s\S]*$/i, '')
        .trimEnd()
    }
    const capturedContent: Record<string, unknown> = lastAiMsg
      ? { text: stripActionFooter(lastAiMsg.content) }
      : {}
    // Mark current section complete
    updateSection(currentSection, {
      content: capturedContent,
      completionPercent: 100,
      userAccepted: true,
      status: 'draft',
    })
    calculateCompletion()
    const next = getNextSection(documentType, currentSection)
    if (next) {
      navigateToSection(next)
      setTimeout(() => {
        sendMessageRef.current(`Great, let's move on to the ${next.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()} section.`)
      }, 50)
    } else {
      setDocumentStatus('complete')
      addMessage({
        role: 'ai',
        content: '🎉 All sections are complete! Your document is ready. You can save it as a draft or submit it for review using the buttons above.',
      })
    }
  }

  const handleAccept = (section: DocumentSection) => {
    acceptDraft(section)
    const next = getNextSection(documentType, section)
    if (next) {
      navigateToSection(next)
      // Use ref so the timeout captures the latest sendMessage (which has updated currentSection)
      setTimeout(() => {
        sendMessageRef.current(`Great, let's move on to the ${next.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()} section.`)
      }, 50)
    } else {
      // Last section accepted — document is complete
      setDocumentStatus('complete')
      addMessage({
        role: 'ai',
        content: '🎉 All sections are complete! Your document is ready. You can save it as a draft or submit it for review using the buttons above.',
      })
    }
  }

  const handleSkip = () => {
    if (!actionBarContext) return
    const next = getNextSection(documentType, actionBarContext.section)
    if (next) {
      navigateToSection(next)
      setTimeout(() => {
        sendMessageRef.current(`Let's skip ahead to the ${next.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()} section.`)
      }, 50)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        aria-live="polite"
        aria-label="Conversation"
        aria-relevant="additions"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isAiThinking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is thinking...
          </div>
        )}

        {/* B5: Show AIErrorMessage when a stream error occurs */}
        {lastAiError && !isAiThinking && (
          <AIErrorMessage
            message={lastAiError}
            onRetry={() => {
              clearAiError()
              // Re-send the last user message
              const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
              if (lastUserMsg) sendMessage(lastUserMsg.content)
            }}
            onSkip={() => {
              clearAiError()
              const next = getNextSection(documentType, currentSection)
              if (next) navigateToSection(next)
            }}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {actionBarContext && (
        <ActionBar
          section={actionBarContext.section}
          onAccept={() => handleAccept(actionBarContext.section)}
          onEdit={() => editSection(actionBarContext.section)}
          onRegenerate={regenerate}
          onSkip={handleSkip}
        />
      )}

      {/* Escape-hatch: show only when AI has given substantive draft content (>150 chars after stripping footer) */}
      {!actionBarContext && !isAiThinking &&
        !publishSuggestion.showSuggestion &&
        documentStatus !== 'complete' &&
        (() => {
          const lastAi = [...messages].reverse().find(m => m.role === 'ai')
          if (!lastAi) return false
          // Strip trailing action footer & follow-up question before evaluating
          const stripped = lastAi.content
            .replace(/\n*---\s*\n+\s*\*?\*?Actions?:\*?\*?.*$/is, '')
            .replace(/\n+\s*\*?\*?Actions?:\*?\*?\s*\[.*$/is, '')
            .trimEnd()
          // After stripping, if message is just a question/prompt — no draft
          if (stripped.endsWith('?') || stripped.endsWith(':')) return false
          return stripped.length > 150
        })() && (
        <div className="border-t px-3 py-2 flex items-center justify-between gap-2 bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {isLastSection ? 'Ready to wrap up this section?' : 'Happy with this section?'}
          </span>
          <Button size="sm" onClick={handleFinalize}>
            {isLastSection ? '✓ Finalize Document' : '✓ Accept & Continue'}
          </Button>
        </div>
      )}

      {/* A4: Publish suggestion — shown only when no draft is pending acceptance */}
      {publishSuggestion.showSuggestion && !actionBarContext && (
        <div className="border-t p-3">
          <PublishSuggestionCard
            documentType={documentType}
            documentTitle="your document"
            onPublish={() => {
              dismissPublishSuggestion()
            }}
            onRemindLater={() => {
              const remindAt = new Date(Date.now() + 24 * 3600_000).toISOString()
              setRemindLater(remindAt)
            }}
            onDismiss={dismissPublishSuggestion}
          />
        </div>
      )}

      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response..."
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim()}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
