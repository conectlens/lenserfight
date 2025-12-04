
export type ModerationStatus = 'approved' | 'rejected' | 'flagged';

export interface ModerationResult {
  status: ModerationStatus;
  reason?: string; // User-friendly message
  confidence: number; // 0.0 to 1.0
  policyName: string;
}

export interface ModerationPolicy {
  name: string;
  check(text: string): Promise<ModerationResult>;
}

export class ModerationError extends Error {
  readonly reasons: string[];
  
  constructor(reasons: string[]) {
    super(`Content moderation failed: ${reasons.join(', ')}`);
    this.name = 'ModerationError';
    this.reasons = reasons;
  }
}
