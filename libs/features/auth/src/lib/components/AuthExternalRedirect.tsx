import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { buildAuthReturnUrl, sanitizeReturnUrl } from '../return-url'

interface AuthExternalRedirectProps {
  to: string
}

/**
 * Redirects to an external auth URL (apps/auth) using replace-style navigation.
 * - Uses window.location.replace() to avoid polluting the history stack.
 * - Preserves the current page as return_url so the user is sent back after auth.
 * - Skips encoding /auth/* paths as return_url (they are rejected by sanitizeReturnUrl).
 * - Forwards an existing return_url query param directly (e.g. from /not-authorized).
 */
export const AuthExternalRedirect = ({ to }: AuthExternalRedirectProps) => {
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const existingReturnUrl = params.get('return_url')
    const returnUrl = existingReturnUrl
      ? encodeURIComponent(sanitizeReturnUrl(existingReturnUrl))
      : encodeURIComponent(
          buildAuthReturnUrl(window.location.origin + location.pathname + location.search + location.hash)
        )
    window.location.replace(`${to}?return_url=${returnUrl}`)
  }, [to, location])

  return null
}
