import { describe, it, expect } from 'vitest'

import { evaluateBudget, shouldHaltScheduling } from './budget-reconciler'

describe('evaluateBudget', () => {
  it('returns continue when no budget is declared', () => {
    const decision = evaluateBudget({
      spentCredits: 500,
      pendingCredits: 200,
      budgetCredits: null,
    })
    expect(decision).toEqual({ action: 'continue' })
  })

  it('returns continue when projected spend is within the budget', () => {
    const decision = evaluateBudget({
      spentCredits: 70,
      pendingCredits: 20,
      budgetCredits: 100,
    })
    expect(decision).toEqual({ action: 'continue' })
  })

  it('returns cancel with projectedCredits when budget is exceeded', () => {
    const decision = evaluateBudget({
      spentCredits: 80,
      pendingCredits: 30,
      budgetCredits: 100,
    })
    expect(decision).toEqual({
      action: 'cancel',
      reason: 'budget_exceeded',
      projectedCredits: 110,
    })
  })

  it('guards against negative inputs', () => {
    const decision = evaluateBudget({
      spentCredits: -5,
      pendingCredits: -10,
      budgetCredits: 0,
    })
    // Negative floors collapse to zero => projected=0 <= 0 => continue.
    expect(decision).toEqual({ action: 'continue' })
  })
})

describe('shouldHaltScheduling', () => {
  it('delegates to evaluateBudget and returns a boolean', () => {
    expect(
      shouldHaltScheduling({ spentCredits: 50, pendingCredits: 100, budgetCredits: 100 }),
    ).toBe(true)
    expect(
      shouldHaltScheduling({ spentCredits: 50, pendingCredits: 10, budgetCredits: 100 }),
    ).toBe(false)
  })
})
