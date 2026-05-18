import type { AuthProfileGate } from '@lenserfight/types'
import { sanitizeReturnUrl } from '@lenserfight/utils/dom'
import { WEB_BASE_URL } from '@lenserfight/utils/env'

export function getPostOAuthRedirectUrl(returnUrl: string): string {
  return `/login?return_url=${encodeURIComponent(sanitizeReturnUrl(returnUrl))}`
}

export function getAuthGateRedirectUrl(gate: AuthProfileGate, returnUrl: string): string {
  const safeReturnUrl = sanitizeReturnUrl(returnUrl)
  switch (gate.kind) {
    case 'active':
      return safeReturnUrl
    case 'new':
    case 'onboarding':
      return `${WEB_BASE_URL}/onboarding?return_url=${encodeURIComponent(safeReturnUrl)}`
    case 'recoverable':
      return `/account-recovery?return_url=${encodeURIComponent(safeReturnUrl)}`
    case 'deleted':
    default:
      return `/account-unavailable?return_url=${encodeURIComponent(safeReturnUrl)}`
  }
}
