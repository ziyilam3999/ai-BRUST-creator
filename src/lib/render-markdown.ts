import React from 'react'

/**
 * Renders basic markdown (bold, italic, line breaks) without external deps.
 * Shared between MessageBubble and SectionCard.
 */
export function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').map((line, lineIdx) => {
    const parts: React.ReactNode[] = []
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
    let last = 0
    let match
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index))
      if (match[2]) parts.push(React.createElement('strong', { key: `b${match.index}` }, match[2]))
      else if (match[3]) parts.push(React.createElement('em', { key: `i${match.index}` }, match[3]))
      last = match.index + match[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return React.createElement(
      'span',
      { key: lineIdx, className: 'block' },
      parts.length > 0 ? parts : '\u00a0'
    )
  })
}
