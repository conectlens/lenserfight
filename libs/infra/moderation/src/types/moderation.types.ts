export type ModerationStatus = 'approved' | 'rejected' | 'flagged'

export interface ModerationResult {
  status: ModerationStatus
  reason?: string
  confidence: number
  policyName: string
}

export interface ModerationPolicy {
  name: string
  check(text: string): Promise<ModerationResult>
}

export class ModerationError extends Error {
  reasons: string[]

  constructor(reasons: string[]) {
    super(reasons.join('; '))
    this.name = 'ModerationError'
    this.reasons = reasons
  }
}
