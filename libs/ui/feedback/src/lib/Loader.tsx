import { Check } from 'lucide-react'
import React from 'react'

export type LoaderVariant = 'overlay' | 'card' | 'inline' | 'centered'

export interface LoaderProps {
  /** Display variant controlling layout and backdrop behaviour. Default: 'inline' */
  variant?: LoaderVariant
  /** Optional status message rendered below the lens animation */
  message?: string
  /** When true, swaps the animation for a success check indicator */
  isSuccess?: boolean
  /** Screen-reader label for the spinner. Defaults to message ?? "Loading" */
  label?: string
  /** Additional className applied to the outermost wrapper */
  className?: string
}

function LensAnimation() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      {/* Ring 1: outer — slow clockwise */}
      <span
        className="absolute inset-0 animate-spin rounded-full border-[3px] border-greyscale-200 border-t-deep-lens-navy-500 dark:border-greyscale-700 dark:border-t-primary-yellow-500"
        style={{ animationDuration: '1.4s' }}
      />
      {/* Ring 2: mid — faster counter-clockwise */}
      <span
        className="absolute inset-[6px] animate-spin rounded-full border-2 border-transparent border-t-deep-lens-navy-500/40 dark:border-t-primary-yellow-500/40"
        style={{ animationDuration: '0.9s', animationDirection: 'reverse' }}
      />
      {/* Ring 3: inner aperture pulse */}
      <span
        className="absolute inset-[12px] animate-pulse rounded-full bg-deep-lens-navy-500/10 dark:bg-primary-yellow-500/10"
        style={{ animationDuration: '1.8s' }}
      />
      {/* Focal dot */}
      <span className="h-2 w-2 animate-pulse rounded-full bg-deep-lens-navy-500 dark:bg-primary-yellow-500" />
    </div>
  )
}

function SuccessIndicator() {
  return (
    <div className="flex h-16 w-16 animate-in zoom-in items-center justify-center rounded-full bg-[var(--cl-status-green,#2eb773)]/15 ring-4 ring-[var(--cl-status-green,#2eb773)]/20 duration-500">
      <Check className="h-8 w-8 text-[var(--cl-status-green,#2eb773)]" strokeWidth={3} />
    </div>
  )
}

function LoaderInner({ message, isSuccess, label }: Pick<LoaderProps, 'message' | 'isSuccess' | 'label'>) {
  const ariaLabel = label ?? message ?? 'Loading'
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-4"
    >
      {isSuccess ? <SuccessIndicator /> : <LensAnimation />}
      {message && (
        <p className={`text-sm font-medium text-greyscale-700 dark:text-greyscale-300 ${!isSuccess ? 'animate-pulse' : ''}`}>
          {message}
        </p>
      )}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  )
}

export const Loader: React.FC<LoaderProps> = ({
  variant = 'inline',
  message,
  isSuccess = false,
  label,
  className = '',
}) => {
  const inner = <LoaderInner message={message} isSuccess={isSuccess} label={label} />

  if (variant === 'overlay') {
    return (
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md animate-in fade-in duration-300 dark:bg-gray-900/95 ${className}`}
        style={{ zIndex: 'var(--cl-z-overlay, 300)' as React.CSSProperties['zIndex'] }}
      >
        {inner}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center bg-white/95 backdrop-blur-md animate-in fade-in duration-300 dark:bg-gray-900/95 ${className}`}
        style={{ zIndex: 'var(--cl-z-overlay, 300)' as React.CSSProperties['zIndex'] }}
      >
        {inner}
      </div>
    )
  }

  if (variant === 'centered') {
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${className}`}>
        {inner}
      </div>
    )
  }

  // inline (default)
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {inner}
    </div>
  )
}

Loader.displayName = 'Loader'

/**
 * Backward-compatible alias for existing `LoadingOverlay` callsites.
 * New code should use `<Loader variant="overlay" />` directly.
 */
export const LoadingOverlay: React.FC<{ message?: string; isSuccess?: boolean }> = (props) => (
  <Loader variant="overlay" {...props} />
)

LoadingOverlay.displayName = 'LoadingOverlay'
