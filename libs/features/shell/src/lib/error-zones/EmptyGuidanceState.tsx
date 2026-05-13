import { EmptyState } from '@lenserfight/ui/feedback'
import React from 'react'

import type { AppError } from '@lenserfight/shared/error'

interface EmptyGuidanceStateProps {
  error: AppError
  onAction?: () => void
  actionLabel?: string
}

function resolveTitle(error: AppError): string {
  switch (error.kind) {
    case 'onboarding_required':
      return 'Complete your setup'
    case 'missing_config':
      return 'Configuration required'
    case 'empty_state':
      return 'Nothing here yet'
    default:
      return 'Get started'
  }
}

function resolveDescription(error: AppError): string {
  if (error.message) return error.message
  switch (error.kind) {
    case 'onboarding_required':
      return 'Finish setting up your profile to continue.'
    case 'missing_config':
      return 'Some configuration is missing before you can use this feature.'
    case 'empty_state':
      return 'Create your first item to get started.'
    default:
      return 'Complete the required steps to continue.'
  }
}

export const EmptyGuidanceState: React.FC<EmptyGuidanceStateProps> = ({
  error,
  onAction,
  actionLabel,
}) => {
  const label =
    actionLabel ?? (error.kind === 'onboarding_required' ? 'Complete setup' : 'Get started')

  return (
    <EmptyState
      title={resolveTitle(error)}
      description={resolveDescription(error)}
      action={
        onAction ? (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {label}
          </button>
        ) : undefined
      }
    />
  )
}
