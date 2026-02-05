'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useGuidedCreatorStore } from '@/stores/guided-creator-store'
import { useGuidedChat } from '@/hooks/use-guided-chat'
import { MessageBubble } from './message-bubble'
import { ActionBar } from './action-bar'
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
  const { messages, isAiThinking, documentType, acceptDraft, editSection, navigateToSection } = useGuidedCreatorStore()
  const { sendMessage, regenerate } = useGuidedChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const handleAccept = (section: DocumentSection) => {
    acceptDraft(section)
    const next = getNextSection(documentType, section)
    if (next) {
      navigateToSection(next)
    }
  }

  const handleSkip = () => {
    if (!actionBarContext) return
    const next = getNextSection(documentType, actionBarContext.section)
    if (next) {
      navigateToSection(next)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isAiThinking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is thinking...
          </div>
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
