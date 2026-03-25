import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface AuthExternalRedirectProps {
  to: string
}

/**
 * Redirects to an external auth URL (apps/auth) using replace-style navigation.
 * - Uses window.location.replace() to avoid polluting the history stack.
 * - Preserves the current page as return_url so the user is sent back after auth.
 * - Skips encoding /auth/* paths as return_url (they are rejected by sanitizeReturnUrl).
 */
export const AuthExternalRedirect = ({ to }: AuthExternalRedirectProps) => {
  const location = useLocation()

  useEffect(() => {
    const isAuthPath = location.pathname.startsWith('/auth/')
    const returnPath = isAuthPath
      ? '/'
      : location.pathname + location.search + location.hash
    const returnUrl = encodeURIComponent(window.location.origin + returnPath)
    window.location.replace(`${to}?return_url=${returnUrl}`)
  }, [to, location])

  return null
}
