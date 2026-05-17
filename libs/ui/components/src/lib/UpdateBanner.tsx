/**
 * UpdateBanner — non-intrusive top-of-page update notification.
 *
 * Design goals:
 * - Appears as a slim announcement bar, not a modal or blocking overlay.
 * - One dismiss per session (sessionStorage key). Does not persist across tabs.
 * - "Refresh" reloads the page; if a service worker is registered it posts a
 *   SKIP_WAITING message first so the new worker activates immediately.
 * - Renders nothing when there is no update.
 */
import { ArrowRight, RefreshCw, X } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

const DISMISS_KEY = 'lf_update_banner_dismissed'

export interface UpdateBannerProps {
  /** Latest available version string (e.g. "0.11.0"). */
  latestVersion: string
  /** Current deployed version string (e.g. "0.10.0-alpha.2"). */
  currentVersion: string
  /** Whether an update is actually available. If false the banner is hidden. */
  hasUpdate: boolean
  /** Optional release notes URL. */
  releaseNotesUrl?: string
  /** Callback fired when the user clicks "Refresh". Defaults to window.location.reload(). */
  onRefresh?: () => void
}

export function UpdateBanner({
  latestVersion,
  currentVersion,
  hasUpdate,
  releaseNotesUrl,
  onRefresh,
}: UpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  // Check session dismissal on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === latestVersion) {
        setDismissed(true)
      }
    } catch {
      // sessionStorage may be blocked in some environments
    }
  }, [latestVersion])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, latestVersion)
    } catch {
      // best-effort
    }
  }, [latestVersion])

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh()
      return
    }

    // Attempt to activate a waiting service worker before reloading
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          // Give the SW a moment to activate, then reload
          setTimeout(() => window.location.reload(), 200)
        } else {
          window.location.reload()
        }
      }).catch(() => window.location.reload())
    } else {
      window.location.reload()
    }
  }, [onRefresh])

  if (!hasUpdate || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`LenserFight update available: version ${latestVersion}`}
      className={[
        'fixed top-0 left-0 right-0 z-[100]',
        'flex items-center justify-between gap-3 px-4 py-2',
        'bg-primary-yellow-500/95 dark:bg-primary-yellow-600/90',
        'text-primary-yellow-950 dark:text-primary-yellow-50',
        'text-sm font-medium',
        'shadow-sm backdrop-blur-sm',
        'border-b border-primary-yellow-600/30 dark:border-primary-yellow-500/30',
      ].join(' ')}
    >
      {/* Update message */}
      <span className="flex items-center gap-1.5 truncate">
        <span className="hidden sm:inline">LenserFight update available:</span>
        <span className="inline sm:hidden">Update available:</span>
        <span className="font-mono text-xs opacity-75">v{currentVersion}</span>
        <ArrowRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        <span className="font-mono text-xs font-semibold">v{latestVersion}</span>
        {releaseNotesUrl && (
          <a
            href={releaseNotesUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden sm:inline-flex items-center gap-0.5 underline underline-offset-2 opacity-75 hover:opacity-100 transition-opacity text-xs ml-1"
          >
            What&apos;s new
          </a>
        )}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleRefresh}
          className={[
            'flex items-center gap-1.5 rounded-md px-3 py-1',
            'bg-primary-yellow-950/10 dark:bg-primary-yellow-50/10',
            'hover:bg-primary-yellow-950/20 dark:hover:bg-primary-yellow-50/20',
            'transition-colors text-xs font-semibold',
            'focus:outline-none focus:ring-2 focus:ring-primary-yellow-950/40',
          ].join(' ')}
          aria-label="Refresh to update"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss update notification"
          className={[
            'rounded p-1 opacity-60 hover:opacity-100 transition-opacity',
            'hover:bg-primary-yellow-950/10 dark:hover:bg-primary-yellow-50/10',
            'focus:outline-none focus:ring-2 focus:ring-primary-yellow-950/40',
          ].join(' ')}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
