// BudgetReconciler — Phase 9 (Scale hardening).
//
// Pure policy helper that answers: "given the run's current spend, the
// worker's in-flight credit reservations, and the declared budget, should
// we cancel?".
//
// The actual DB write is handled by `fn_cancel_workflow_run_over_budget`
// (see migration `20260423000000_workflow_scale_hardening.sql`). This module
// only exposes the decision logic so it can be unit-tested without a DB.

export interface BudgetSnapshot {
  /** Total spent credits already settled on `workflow_runs.spent_credits`. */
  spentCredits: number
  /** Credits reserved by in-flight nodes that have NOT been settled yet. */
  pendingCredits: number
  /** Declared budget for the run. `null` = unbounded. */
  budgetCredits: number | null
}

export type BudgetDecision =
  | { action: 'continue' }
  | { action: 'cancel'; reason: string; projectedCredits: number }

export function evaluateBudget(snapshot: BudgetSnapshot): BudgetDecision {
  const spent = Math.max(0, snapshot.spentCredits)
  const pending = Math.max(0, snapshot.pendingCredits)
  const projected = spent + pending

  if (snapshot.budgetCredits == null) {
    return { action: 'continue' }
  }
  if (projected <= snapshot.budgetCredits) {
    return { action: 'continue' }
  }

  return {
    action: 'cancel',
    reason: 'budget_exceeded',
    projectedCredits: projected,
  }
}

/**
 * Returns TRUE when the caller should proactively halt scheduling new nodes.
 * Preferred call site: before every wave kickoff in `Scheduler.advance()`.
 */
export function shouldHaltScheduling(snapshot: BudgetSnapshot): boolean {
  return evaluateBudget(snapshot).action === 'cancel'
}
