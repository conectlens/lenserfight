import { AlertTriangle } from 'lucide-react'
import React, { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  reportLink?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class MediaErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to telemetry if available
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>)['__lf_telemetry']) {
      const tel = (window as unknown as Record<string, unknown>)['__lf_telemetry'] as {
        captureException: (e: Error, ctx: unknown) => void
      }
      tel.captureException(error, { componentStack: info.componentStack })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-yellow-500" />
        <p className="text-sm font-medium text-surface-text">Media unavailable</p>
        <p className="text-xs text-surface-text-muted">
          This media couldn&apos;t be loaded.{' '}
          {this.props.reportLink && (
            <a
              href={this.props.reportLink}
              target="_blank"
              rel="noreferrer"
              className="text-accent-primary hover:underline"
            >
              Report issue
            </a>
          )}
        </p>
      </div>
    )
  }
}
