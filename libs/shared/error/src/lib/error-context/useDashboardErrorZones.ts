import { useMemo } from 'react'
import type { ErrorKind, AppError } from '../types'
import { useError } from './ErrorContext'

// Infra/transient errors rendered as a floating sticky banner above content
const BANNER_KINDS = new Set<ErrorKind>([
  'network',
  'rate_limit',
  'websocket_disconnected',
  'realtime_unavailable',
  'maintenance',
  'edge_unavailable',
])

// Errors that block the content area entirely (rendered as a full overlay)
const OVERLAY_KINDS = new Set<ErrorKind>([
  'feature_locked',
  'role_insufficient',
  'onboarding_required',
  'battle_init_failed',
  'missing_config',
])

// Errors not in either set (workflow_failed, agent_crashed, model_unavailable,
// token_quota_exceeded, empty_state, unsupported_feature) are handled inline
// by individual feature components using AIFailureState / EmptyGuidanceState.

export interface DashboardErrorZones {
  bannerErrors: AppError[]
  overlayError: AppError | null
}

export function useDashboardErrorZones(): DashboardErrorZones {
  const { errors } = useError()

  return useMemo(() => {
    const bannerErrors = errors.filter(
      (e) => BANNER_KINDS.has(e.kind) && e.lifecycle !== 'silent',
    )
    // Show the first matching overlay error (highest-priority blocking experience)
    const overlayError = errors.find((e) => OVERLAY_KINDS.has(e.kind)) ?? null

    return { bannerErrors, overlayError }
  }, [errors])
}
