import { Button } from '@lenserfight/ui/components'
import { AlertTriangle } from 'lucide-react'
import React from 'react'

interface SectionErrorBoundaryProps {
  /** Human-readable name of the section, used in the fallback copy. */
  sectionName: string
  children: React.ReactNode
}

interface SectionErrorBoundaryState {
  error: Error | null
}

/**
 * Section-scoped error boundary so a render exception in one control-room
 * panel cannot blank the entire page. Render-time exceptions are caught and
 * replaced with an inline error card; React Query data-fetch errors are
 * surfaced inside each section's own loading/error states.
 *
 * Per CLAUDE.md / GRASP rules this lives at the feature layer (alongside the
 * pages it protects) rather than in `libs/ui` — there is no general-purpose
 * boundary in the UI library yet, and we do not want to introduce one as a
 * side-effect of this PR.
 */
export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (typeof console !== 'undefined') {
      console.error(`[SectionErrorBoundary:${this.props.sectionName}]`, error, info)
    }
  }

  handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{this.props.sectionName} failed to render</p>
            <p className="mt-1">{this.state.error.message}</p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="mt-3"
              onClick={this.handleReset}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
