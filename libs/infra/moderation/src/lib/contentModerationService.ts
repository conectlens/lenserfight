import { ModerationPolicy, ModerationError } from './moderation.types'

import { DictionaryPolicy, RegexPolicy, SemanticPolicy } from './policies'

class ContentModerationService {
  private policies: ModerationPolicy[]

  constructor() {
    this.policies = [new DictionaryPolicy(), new RegexPolicy(), new SemanticPolicy()]
  }

  /**
   * Registers a new policy dynamically.
   */
  addPolicy(policy: ModerationPolicy) {
    this.policies.push(policy)
  }

  /**
   * Validates input text against all policies.
   * Throws ModerationError if any policy rejects the content.
   * @param inputs One or more strings to validate.
   */
  async validate(...inputs: (string | undefined | null)[]): Promise<void> {
    const validInputs = inputs.filter(
      (i) => i && typeof i === 'string' && i.trim().length > 0
    ) as string[]

    if (validInputs.length === 0) return

    // Run policies in sequence or parallel.
    // Sequence is better to save AI calls if Dictionary rejects it first (Fast Fail).
    const errors: string[] = []

    for (const text of validInputs) {
      for (const policy of this.policies) {
        const result = await policy.check(text)

        if (result.status === 'rejected') {
          errors.push(result.reason || 'Content policy violation.')
          // Break policy loop for this text item on first rejection
          break
        }
        // Flagged items could ideally go to a review queue, but for now we allow them or throw based on strictness.
        // We will treat 'flagged' as warning but passable for this implementation, or strictly reject.
        // Let's strictly reject regex matches for now to be safe.
        if (result.status === 'flagged') {
          errors.push(result.reason || 'Content flagged for review.')
          break
        }
      }
    }

    if (errors.length > 0) {
      throw new ModerationError([...new Set(errors)])
    }
  }
}

export const contentModerationService = new ContentModerationService()
