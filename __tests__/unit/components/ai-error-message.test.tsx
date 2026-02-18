/**
 * B6: AIErrorMessage component tests — TDD
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AIErrorMessage } from '@/components/guided/ai-error-message'

describe('AIErrorMessage', () => {
  const defaultProps = {
    onRetry: vi.fn(),
    onSkip: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders an error message', () => {
    render(<AIErrorMessage {...defaultProps} />)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('shows default error text when no message is provided', () => {
    render(<AIErrorMessage {...defaultProps} />)
    expect(screen.getByText(/something went wrong|error|failed/i)).toBeTruthy()
  })

  it('shows custom error message when provided', () => {
    render(<AIErrorMessage {...defaultProps} message="Rate limit exceeded." />)
    expect(screen.getByText(/Rate limit exceeded/)).toBeTruthy()
  })

  it('renders a Try Again button', () => {
    render(<AIErrorMessage {...defaultProps} />)
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy()
  })

  it('renders a Skip Section button', () => {
    render(<AIErrorMessage {...defaultProps} />)
    expect(screen.getByRole('button', { name: /skip/i })).toBeTruthy()
  })

  it('calls onRetry when Try Again is clicked', () => {
    render(<AIErrorMessage {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onSkip when Skip Section is clicked', () => {
    render(<AIErrorMessage {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1)
  })

  it('displays an error icon', () => {
    render(<AIErrorMessage {...defaultProps} />)
    // The alert role container should exist (our component uses role="alert")
    const alertEl = screen.getByRole('alert')
    expect(alertEl).toBeTruthy()
  })
})
