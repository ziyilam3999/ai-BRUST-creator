'use client'

import { ConversationMessage } from '@/stores/guided-creator-store'
import { cn } from '@/lib/utils'
import { renderMarkdown } from '@/lib/render-markdown'

interface Props {
  message: ConversationMessage
}

export function MessageBubble({ message }: Props) {
  const isAi = message.role === 'ai'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="text-center text-xs text-muted-foreground py-2">
        {message.content}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', isAi ? 'items-start' : 'items-end')}>
      <span className="text-xs font-medium text-muted-foreground">
        {isAi ? 'Assistant' : 'You'}
      </span>
      <div
        className={cn(
          'rounded-lg px-4 py-2 max-w-[85%] text-sm',
          isAi
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {isAi ? renderMarkdown(message.content) : message.content}
      </div>
    </div>
  )
}
