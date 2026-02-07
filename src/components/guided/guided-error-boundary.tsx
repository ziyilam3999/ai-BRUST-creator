'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  /** Label shown in the fallback UI (e.g. "Conversation Panel") */
  panelName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary for guided creator panels.
 * Catches render errors so one panel crashing doesn't take down the other.
 */
export class GuidedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[GuidedErrorBoundary${this.props.panelName ? `: ${this.props.panelName}` : ''}]`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center h-full">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <div>
            <h3 className="font-semibold text-lg">
              {this.props.panelName
                ? `${this.props.panelName} encountered an error`
                : 'Something went wrong'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
