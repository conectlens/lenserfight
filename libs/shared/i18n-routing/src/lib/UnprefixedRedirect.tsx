import { Navigate, useLocation } from 'react-router-dom'
import { detectLocale } from './detect'

/**
 * Catch-all for paths the locale tree did not match — typically the bare
 * root '/'. Locale-prefix the path with the detected locale and replace.
 */
export function UnprefixedRedirect() {
  const location = useLocation()
  const locale = detectLocale()
  const path = location.pathname === '/' ? '' : location.pathname
  const target =
    `/${locale}${path}` +
    (location.search ?? '') +
    (location.hash ?? '')
  return <Navigate to={target} replace />
}
