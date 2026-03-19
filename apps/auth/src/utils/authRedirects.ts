import type { AuthProfileGate } from '@lenserfight/types'

export function getPostOAuthRedirectUrl(returnUrl: string): string {
  return `/login?return_url=${encodeURIComponent(returnUrl)}`
}

export function getAuthGateRedirectUrl(gate: AuthProfileGate, returnUrl: string): string {
  switch (gate.kind) {
    case 'active':
      return returnUrl
    case 'new':
    case 'onboarding':
      return `/onboarding?return_url=${encodeURIComponent(returnUrl)}`
    case 'recoverable':
      return `/account-recovery?return_url=${encodeURIComponent(returnUrl)}`
    case 'deleted':
    default:
      return `/account-unavailable?return_url=${encodeURIComponent(returnUrl)}`
  }
}
