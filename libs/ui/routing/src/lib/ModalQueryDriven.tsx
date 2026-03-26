import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { Dialog } from '@lenserfight/ui/overlays'
import { useModalRouter } from './useModalRouter'
import type { ModalAccessContext } from './ModalRoute'

export interface ModalQueryDrivenProps {
  /** The ?modal= value this component responds to. */
  name: string
  accessCheck?: (ctx: ModalAccessContext) => boolean
  fallback?: string
  maxWidth?: string
  /** Forwarded to Dialog header — truncated at 60 chars */
  title?: string
  /** Forwarded to Dialog header — clamped to 2 lines */
  description?: string
  /** Forwarded to Dialog header icon badge */
  icon?: React.ReactNode
  /**
   * Render prop receives current step and navigation helpers.
   * The wizard is responsible for its own step rendering.
   */
  children: (props: {
    step: number
    goToStep: (n: number) => void
    close: () => void
  }) => React.ReactNode
}

/**
 * Query-param-driven modal.
 *
 * Renders when ?modal=<name> is present in the URL.
 * Wizard state (step) is encoded as ?step=N — fully deep-linkable
 * and restorable on refresh.
 *
 * Usage:
 *   const { open } = useModalRouter()
 *   <button onClick={() => open('create-battle')}>New Battle</button>
 *
 *   <ModalQueryDriven name="create-battle" accessCheck={...}>
 *     {({ step, goToStep, close }) => <CreateBattleWizard step={step} ... />}
 *   </ModalQueryDriven>
 */
export const ModalQueryDriven: React.FC<ModalQueryDrivenProps> = ({
  name,
  accessCheck,
  fallback = '/not-authorized',
  maxWidth = 'max-w-2xl',
  title,
  description,
  icon,
  children,
}) => {
  const { isOpen, step, goToStep, close } = useModalRouter()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { hasLenser } = useLenser()

  if (!isOpen(name)) return null

  if (accessCheck && !accessCheck({ isAuthenticated, hasLenser })) {
    return <Navigate to={fallback} state={{ from: location }} replace />
  }

  return (
    <Dialog
      open
      onClose={close}
      maxWidth={maxWidth}
      title={title}
      description={description}
      icon={icon}
      dismissOnBackdrop
    >
      {children({ step, goToStep, close })}
    </Dialog>
  )
}
