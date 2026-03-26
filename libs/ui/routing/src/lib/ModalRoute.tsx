import React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { Dialog } from '@lenserfight/ui/overlays'

export interface ModalAccessContext {
  isAuthenticated: boolean
  hasLenser: boolean
}

export interface ModalRouteProps {
  /**
   * Return true to allow access; false to redirect.
   * If omitted, the modal is accessible to everyone.
   */
  accessCheck?: (ctx: ModalAccessContext) => boolean
  /**
   * Where to redirect on access failure.
   * Defaults to '/not-authorized'.
   */
  fallback?: string
  /** Dialog maxWidth class. Defaults to 'max-w-2xl'. */
  maxWidth?: string
  /**
   * Whether clicking the backdrop (or pressing Escape) closes the dialog.
   * Set to false for required flows like onboarding. Defaults to true.
   */
  dismissOnBackdrop?: boolean
  /** Forwarded to Dialog header — truncated at 60 chars */
  title?: string
  /** Forwarded to Dialog header — clamped to 2 lines */
  description?: string
  /** Forwarded to Dialog header icon badge */
  icon?: React.ReactNode
  children: React.ReactNode
}

/**
 * Route-based modal wrapper.
 *
 * Renders children inside an accessible Dialog overlay.
 * Closing the modal navigates back (browser back button behaviour).
 * Access control is evaluated at route render time — unauthorized
 * visitors are redirected before the modal mounts.
 *
 * Usage in App.tsx:
 *   <Route path="/battles" element={<BattlesFeedPage />}>
 *     <Route
 *       path="create"
 *       element={
 *         <ModalRoute accessCheck={({isAuthenticated, hasLenser}) => isAuthenticated && hasLenser}>
 *           <CreateBattleWizard />
 *         </ModalRoute>
 *       }
 *     />
 *   </Route>
 */
export const ModalRoute: React.FC<ModalRouteProps> = ({
  accessCheck,
  fallback = '/not-authorized',
  maxWidth = 'max-w-2xl',
  dismissOnBackdrop = true,
  title,
  description,
  icon,
  children,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { hasLenser } = useLenser()

  if (accessCheck && !accessCheck({ isAuthenticated, hasLenser })) {
    return <Navigate to={fallback} state={{ from: location }} replace />
  }

  return (
    <Dialog
      open
      onClose={dismissOnBackdrop ? () => navigate(-1) : undefined}
      maxWidth={maxWidth}
      title={title}
      description={description}
      icon={icon}
      dismissOnBackdrop={dismissOnBackdrop}
    >
      {children}
    </Dialog>
  )
}
