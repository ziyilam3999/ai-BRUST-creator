/**
 * A5/A6: Tests for PublishSuggestionCard rendering in ConversationPanel
 * and ConversionSummary showPublishSuggestion trigger
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PublishSuggestionCard } from '@/components/guided/publish/publish-suggestion-card'

// ── A5: PublishSuggestionCard renders and fires callbacks ──────────────────

describe('PublishSuggestionCard', () => {
  const defaultProps = {
    documentType: 'business_rule' as const,
    documentTitle: 'My Business Rule',
    onPublish: vi.fn(),
    onRemindLater: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the card with document title', () => {
    render(<PublishSuggestionCard {...defaultProps} />)
    expect(screen.getByText(/My Business Rule/i)).toBeTruthy()
  })

  it('renders publish action button', () => {
    render(<PublishSuggestionCard {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /publish/i })
    expect(btn).toBeTruthy()
  })

  it('renders remind-later action button', () => {
    render(<PublishSuggestionCard {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /later/i })
    expect(btn).toBeTruthy()
  })

  it('renders dismiss action button', () => {
    render(<PublishSuggestionCard {...defaultProps} />)
    // dismiss button — look for No Thanks or similar
    const btn = screen.getByRole('button', { name: /no|dismiss/i })
    expect(btn).toBeTruthy()
  })

  it('calls onPublish when publish button clicked', () => {
    render(<PublishSuggestionCard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /publish/i }))
    expect(defaultProps.onPublish).toHaveBeenCalledTimes(1)
  })

  it('calls onRemindLater when later button clicked', () => {
    render(<PublishSuggestionCard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /later/i }))
    expect(defaultProps.onRemindLater).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when dismiss button clicked', () => {
    render(<PublishSuggestionCard {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /no|dismiss/i }))
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders for user_story document type', () => {
    render(<PublishSuggestionCard {...defaultProps} documentType="user_story" />)
    // card should still render without crashing
    const btn = screen.getByRole('button', { name: /publish/i })
    expect(btn).toBeTruthy()
  })
})
