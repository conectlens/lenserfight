import { TextArea } from '@lenserfight/ui/forms'
import { Clock, Type } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

interface WritingContestGameProps {
  /** Topic or prompt for the writing contest. */
  topic: string
  /** Time limit in seconds. */
  timeLimit: number
  /** Called when the user submits their writing. */
  onSubmit: (text: string) => void
  /** Whether the game is read-only (e.g. showing opponent's submission). */
  readOnly?: boolean
  /** Pre-filled text for read-only mode. */
  initialText?: string
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function WritingContestGame({
  topic,
  timeLimit,
  onSubmit,
  readOnly = false,
  initialText = '',
}: WritingContestGameProps) {
  const [text, setText] = useState(initialText)
  const [remaining, setRemaining] = useState(timeLimit)
  const [submitted, setSubmitted] = useState(false)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length

  // Countdown timer
  useEffect(() => {
    if (readOnly || submitted || remaining <= 0) return
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [readOnly, submitted, remaining])

  // Auto-submit when time runs out
  useEffect(() => {
    if (remaining === 0 && !submitted && !readOnly && text.trim()) {
      handleSubmit()
    }
  }, [remaining]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(() => {
    if (submitted || readOnly) return
    setSubmitted(true)
    onSubmit(text)
  }, [text, submitted, readOnly, onSubmit])

  const urgency = remaining <= 60 ? 'text-status-red' : remaining <= 120 ? 'text-primary-yellow-600' : 'text-greyscale-400'

  return (
    <div className="space-y-4">
      {/* Topic */}
      <div className="rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-primary-yellow-600 dark:text-primary-yellow-400 mb-1">
          Writing prompt
        </p>
        <p className="text-sm text-greyscale-800 dark:text-greyscale-100">{topic}</p>
      </div>

      {/* Timer + stats bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-greyscale-400">
            <Type size={12} />
            {wordCount} words &middot; {charCount} chars
          </span>
        </div>
        {!readOnly && (
          <span className={`flex items-center gap-1 font-mono font-semibold ${urgency}`}>
            <Clock size={12} />
            {formatCountdown(remaining)}
          </span>
        )}
      </div>

      {/* Writing area */}
      <TextArea
        value={text}
        onChange={(e) => { if (!submitted && !readOnly) setText(e.target.value) }}
        placeholder="Start writing..."
        minRows={10}
        autoResize={false}
        disabled={submitted || readOnly}
        className={submitted ? 'opacity-70' : ''}
      />

      {/* Submit button */}
      {!readOnly && !submitted && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="rounded-xl bg-greyscale-900 px-5 py-2.5 text-sm font-semibold text-greyscale-0 hover:bg-greyscale-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-greyscale-0 dark:text-greyscale-900 dark:hover:bg-greyscale-100 transition-colors"
          >
            Submit entry
          </button>
        </div>
      )}

      {submitted && (
        <div className="rounded-2xl border border-status-green/20 bg-status-green/5 px-4 py-3 text-sm text-status-green">
          Entry submitted. {wordCount} words recorded.
        </div>
      )}
    </div>
  )
}
