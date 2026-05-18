import { useAuth } from '@lenserfight/features/auth'
import { useLenserOptional } from '@lenserfight/features/profile'
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export interface RouteAccessContext {
  isAuthenticated: boolean
  hasLenser: boolean
  isSuperAdmin: boolean
}

export interface RouteGuardProps {
  /**
   * Return true to allow access; false to redirect.
   */
  accessCheck: (ctx: RouteAccessContext) => boolean
  /**
   * Where to redirect on access failure.
   * Defaults to '/not-authorized'.
   */
  fallback?: string
  children: React.ReactNode
}

/**
 * Page-level route guard.
 *
 * Evaluates `accessCheck` at render time — unauthorized visitors are
 * redirected before children mount. Unlike `ModalRoute`, this does not
 * wrap children in a Dialog; it renders them directly.
 *
 * Usage:
 *   <Route
 *     path="/admin"
 *     element={
 *       <RouteGuard accessCheck={({ isSuperAdmin }) => isSuperAdmin}>
 *         <AdminDashboardPage />
 *       </RouteGuard>
 *     }
 *   />
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  accessCheck,
  fallback = '/not-authorized',
  children,
}) => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const lenserCtx = useLenserOptional()
  const hasLenser = lenserCtx?.hasLenser ?? false
  const isSuperAdmin = lenserCtx?.lenser?.is_super_admin ?? false

  if (!accessCheck({ isAuthenticated, hasLenser, isSuperAdmin })) {
    const encodedReturn = encodeURIComponent(location.pathname + location.search + location.hash)
    return <Navigate to={`${fallback}?return_url=${encodedReturn}`} state={{ from: location }} replace />
  }

  return <>{children}</>
}
