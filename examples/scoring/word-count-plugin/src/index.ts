/**
 * Reference word-count scoring plugin.
 *
 * Emits two signals: `word_count` (whitespace-separated tokens) and
 * `sentence_count` (terminator-delimited fragments — `.`, `!`, `?`).
 * Pure, deterministic, no I/O.
 */

import type { ScoringPluginV1, SubmissionView, ScoringResult } from '@lenserfight/plugins/scoring'

export function createWordCountPlugin(): ScoringPluginV1 {
  return {
    id() {
      return 'lenserfight.examples.word-count'
    },
    metadata() {
      return {
        displayName: 'Word Count (Reference)',
        signals: ['word_count', 'sentence_count'],
      }
    },
    async score(submission: SubmissionView): Promise<ScoringResult> {
      const text = submission.contentText ?? ''
      if (text.trim().length === 0) {
        return { ok: false, reason: 'submission has no content_text' }
      }

      const word_count = text.trim().split(/\s+/).filter(Boolean).length
      const sentence_count = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length

      return { ok: true, signals: { word_count, sentence_count } }
    },
  }
}
