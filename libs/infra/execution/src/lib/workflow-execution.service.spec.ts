import { describe, it, expect } from 'vitest'

import {
  assertDelegationAllowed,
  resolveDelegationPolicy,
} from './workflow-execution.service'

import type {
  DelegationPolicy,
  WorkflowNodeConfig,
} from './workflow-execution.service'

/**
 * Phase X2 — delegation policy helpers.
 *
 * These are the forward-declared seams the future delegation runtime will
 * call when a workflow step attempts to delegate work to another agent. The
 * Phase X message-bus + delegation pathway is still partial, but the policy
 * surface needs to be stable so workflow authors can opt into stricter
 * defaults today.
 */
describe('resolveDelegationPolicy', () => {
  it('returns the configured policy when set', () => {
    const policies: DelegationPolicy[] = [
      'auto',
      'approval_required',
      'forbidden',
    ]

    for (const policy of policies) {
      const config: WorkflowNodeConfig = { delegationPolicy: policy }
      expect(resolveDelegationPolicy(config)).toBe(policy)
    }
  })

  it("defaults to 'auto' when policy is undefined", () => {
    expect(resolveDelegationPolicy(undefined)).toBe('auto')
    expect(resolveDelegationPolicy({})).toBe('auto')
  })

  it('honors a caller-supplied default when policy is undefined', () => {
    expect(resolveDelegationPolicy(undefined, 'approval_required')).toBe(
      'approval_required'
    )
    expect(resolveDelegationPolicy({}, 'forbidden')).toBe('forbidden')
  })

  it('configured policy wins over caller-supplied default', () => {
    expect(
      resolveDelegationPolicy(
        { delegationPolicy: 'auto' },
        'forbidden'
      )
    ).toBe('auto')
  })
})

describe('assertDelegationAllowed', () => {
  it('throws when delegation policy is forbidden', () => {
    expect(() =>
      assertDelegationAllowed({ delegationPolicy: 'forbidden' })
    ).toThrow(/forbidden/i)
  })

  it('does not throw for auto', () => {
    expect(() =>
      assertDelegationAllowed({ delegationPolicy: 'auto' })
    ).not.toThrow()
  })

  it('does not throw for approval_required', () => {
    expect(() =>
      assertDelegationAllowed({ delegationPolicy: 'approval_required' })
    ).not.toThrow()
  })

  it('does not throw when config is missing (defaults to auto)', () => {
    expect(() => assertDelegationAllowed(undefined)).not.toThrow()
    expect(() => assertDelegationAllowed({})).not.toThrow()
  })
})
