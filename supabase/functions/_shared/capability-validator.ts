// _shared/capability-validator.ts
//
// Validates OAuth capability scopes for Chainabit-routed Edge Functions.
// Scopes are extracted from the access token's identity_data.scope field
// (set at OAuth authorization time) and checked against what the operation needs.
//
// Usage:
//   import { requireCapabilities, CAPABILITIES } from '../_shared/capability-validator.ts'
//   requireCapabilities(token.scopes, CAPABILITIES.WALLET_READ)

import { CapabilityDeniedError } from './provider-token.ts'

/** Known Chainabit OAuth scopes. */
export const CAPABILITIES = {
  /** Trigger AI executions (sessions, messages, feature runs). */
  EXECUTION_RUN: 'execution:run',
  /** Read wallet credit balance. */
  WALLET_READ: 'wallet:read',
  /** Read email address from userinfo. */
  EMAIL_READ: 'email:read',
  /** Read display name / username from userinfo. */
  PROFILE_READ: 'profile:read',
} as const

/**
 * Asserts that every `required` scope is present in `grantedScopes`.
 *
 * @throws CapabilityDeniedError when any required scope is absent
 */
export function requireCapabilities(grantedScopes: string[], ...required: string[]): void {
  const missing = required.filter((s) => !grantedScopes.includes(s))
  if (missing.length > 0) {
    throw new CapabilityDeniedError(missing, grantedScopes)
  }
}

/**
 * Returns true when all `required` scopes are present; does not throw.
 * Useful for conditional rendering decisions or soft capability checks.
 */
export function hasCapabilities(grantedScopes: string[], ...required: string[]): boolean {
  return required.every((s) => grantedScopes.includes(s))
}
