const REQUIRED_TERMS = ['risk', 'test', 'scoring']

export function createRubricSignalPlugin() {
  return {
    id() {
      return 'lenserfight.examples.rubric-signals'
    },
    metadata() {
      return {
        displayName: 'Rubric Signal Plugin',
        signals: ['word_count', 'required_term_hits', 'rubric_hit_ratio'],
      }
    },
    async score(submission) {
      const text = submission.contentText ?? ''
      if (text.trim().length === 0) {
        return { ok: false, reason: 'submission has no content_text' }
      }

      const normalized = text.toLowerCase()
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length
      const requiredTermHits = REQUIRED_TERMS.filter((term) => normalized.includes(term)).length
      const rubricHitRatio = requiredTermHits / REQUIRED_TERMS.length

      return {
        ok: true,
        signals: {
          word_count: wordCount,
          required_term_hits: requiredTermHits,
          rubric_hit_ratio: Number(rubricHitRatio.toFixed(2)),
        },
      }
    },
  }
}
