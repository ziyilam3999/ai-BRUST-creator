import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuidedErrorBoundary } from '@/components/guided/guided-error-boundary'

// Suppress console.error from error boundary logging during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render error')
  }
  return <div>Child content</div>
}

describe('GuidedErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <GuidedErrorBoundary>
        <div>Normal content</div>
      </GuidedErrorBoundary>
    )

    expect(screen.getByText('Normal content')).toBeDefined()
  })

  it('should show fallback UI when child throws', () => {
    render(
      <GuidedErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </GuidedErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByText('Test render error')).toBeDefined()
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined()
  })

  it('should show panel name in fallback when provided', () => {
    render(
      <GuidedErrorBoundary panelName="Conversation Panel">
        <ThrowingChild shouldThrow={true} />
      </GuidedErrorBoundary>
    )

    expect(screen.getByText('Conversation Panel encountered an error')).toBeDefined()
  })

  it('should recover when Retry is clicked', () => {
    const { rerender } = render(
      <GuidedErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </GuidedErrorBoundary>
    )

    // Verify error state
    expect(screen.getByText('Something went wrong')).toBeDefined()

    // Re-render with non-throwing child before clicking retry
    rerender(
      <GuidedErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </GuidedErrorBoundary>
    )

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    // Should show child content again
    expect(screen.getByText('Child content')).toBeDefined()
  })
})
