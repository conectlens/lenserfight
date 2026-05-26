import React, { useEffect, useState } from 'react'

export interface OfflineBannerProps {
  /** Custom message */
  message?: string
  className?: string
  /**
   * Native-only: pass true when the device is offline.
   * Ignored on web — the component detects connectivity via window events.
   */
  isOffline?: boolean
}

/**
 * Shows a sticky notification strip when the browser goes offline.
 * Auto-hides when connectivity is restored.
 *
 * @example
 * <OfflineBanner />
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  message = "You're offline. Some features may be unavailable.",
  className = '',
}) => {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  useEffect(() => {
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed top-0 inset-x-0 z-toast
        flex items-center justify-center gap-2
        bg-primary-dark-500 text-greyscale-100
        text-xs font-medium py-2 px-4
        ${className}
      `}
    >
      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M7.757 16.243a9 9 0 01.707-13.436M4.222 4.222l15.556 15.556" />
      </svg>
      {message}
    </div>
  )
}

OfflineBanner.displayName = 'OfflineBanner'
