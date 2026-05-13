import { useEffect, useRef, useState } from 'react'

export interface OfflineDetectionOptions {
  onOffline?: () => void
  onOnline?: () => void
}

export interface OfflineDetectionResult {
  isOffline: boolean
  wasOffline: boolean
  offlineSince: number | null
}

export function useOfflineDetection(
  options: OfflineDetectionOptions = {},
): OfflineDetectionResult {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  )
  const [offlineSince, setOfflineSince] = useState<number | null>(null)
  const wasOfflineRef = useRef(false)
  const { onOffline, onOnline } = options

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true)
      setOfflineSince(Date.now())
      wasOfflineRef.current = true
      onOffline?.()
    }

    const handleOnline = () => {
      setIsOffline(false)
      setOfflineSince(null)
      onOnline?.()
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [onOffline, onOnline])

  return {
    isOffline,
    wasOffline: wasOfflineRef.current,
    offlineSince,
  }
}
