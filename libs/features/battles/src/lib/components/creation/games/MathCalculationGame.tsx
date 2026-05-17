import { Input } from '@lenserfight/ui/forms'
import { Calculator, Check, Clock, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

interface MathProblem {
  expression: string
  answer: number
}

interface MathCalculationGameProps {
  /** Difficulty: easy (single digit), medium (double digit), hard (triple digit + multiply). */
  difficulty?: 'easy' | 'medium' | 'hard'
  /** Number of problems to solve. */
  problemCount?: number
  /** Time limit in seconds. */
  timeLimit: number
  /** Called when all problems are answered or time runs out. */
  onSubmit: (results: { correct: number; total: number; answers: string[] }) => void
  /** Read-only mode for reviewing. */
  readOnly?: boolean
}

function generateProblem(difficulty: 'easy' | 'medium' | 'hard'): MathProblem {
  const ops = ['+', '-', '*'] as const
  const op = ops[Math.floor(Math.random() * (difficulty === 'easy' ? 2 : 3))]

  let a: number, b: number
  if (difficulty === 'easy') {
    a = Math.floor(Math.random() * 10) + 1
    b = Math.floor(Math.random() * 10) + 1
  } else if (difficulty === 'medium') {
    a = Math.floor(Math.random() * 50) + 10
    b = Math.floor(Math.random() * 50) + 10
  } else {
    a = Math.floor(Math.random() * 100) + 10
    b = Math.floor(Math.random() * 30) + 2
  }

  // Ensure subtraction doesn't go negative
  if (op === '-' && b > a) [a, b] = [b, a]

  const expression = `${a} ${op} ${b}`
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b
  return { expression, answer }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function MathCalculationGame({
  difficulty = 'medium',
  problemCount = 5,
  timeLimit,
  onSubmit,
  readOnly = false,
}: MathCalculationGameProps) {
  const problems = useMemo(() => {
    return Array.from({ length: problemCount }, () => generateProblem(difficulty))
  }, [difficulty, problemCount])

  const [answers, setAnswers] = useState<string[]>(() => Array(problemCount).fill(''))
  const [remaining, setRemaining] = useState(timeLimit)
  const [submitted, setSubmitted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)

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

  useEffect(() => {
    if (remaining === 0 && !submitted && !readOnly) {
      handleSubmit()
    }
  }, [remaining]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback((idx: number, value: string) => {
    if (submitted || readOnly) return
    setAnswers((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }, [submitted, readOnly])

  const handleSubmit = useCallback(() => {
    if (submitted || readOnly) return
    const correct = problems.reduce((count, prob, i) => {
      return count + (parseFloat(answers[i]) === prob.answer ? 1 : 0)
    }, 0)
    setSubmitted(true)
    onSubmit({ correct, total: problemCount, answers })
  }, [submitted, readOnly, problems, answers, problemCount, onSubmit])

  const answeredCount = answers.filter((a) => a.trim() !== '').length
  const urgency = remaining <= 30 ? 'text-status-red' : remaining <= 60 ? 'text-primary-yellow-600' : 'text-greyscale-400'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-primary-yellow-500" />
          <span className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
            {answeredCount}/{problemCount} answered
          </span>
        </div>
        {!readOnly && (
          <span className={`flex items-center gap-1 font-mono font-semibold text-sm ${urgency}`}>
            <Clock size={13} />
            {formatCountdown(remaining)}
          </span>
        )}
      </div>

      {/* Problems */}
      <div className="space-y-3">
        {problems.map((prob, i) => {
          const isCorrect = submitted && parseFloat(answers[i]) === prob.answer
          const isWrong = submitted && answers[i].trim() !== '' && !isCorrect

          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                submitted
                  ? isCorrect
                    ? 'border-status-green/30 bg-status-green/5'
                    : isWrong
                      ? 'border-status-red/30 bg-status-red/5'
                      : 'border-surface-border bg-surface-base'
                  : i === currentIdx
                    ? 'border-primary-yellow-500/40 bg-primary-yellow-500/5'
                    : 'border-surface-border bg-surface-base'
              }`}
            >
              <span className="text-xs font-mono text-greyscale-400 w-6">{i + 1}.</span>
              <span className="font-mono text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 min-w-[120px]">
                {prob.expression} =
              </span>
              <Input
                type="number"
                value={answers[i]}
                onChange={(e) => handleAnswer(i, e.target.value)}
                onFocus={() => setCurrentIdx(i)}
                placeholder="?"
                disabled={submitted || readOnly}
                className="!w-24 !text-center !font-mono"
              />
              {submitted && isCorrect && <Check size={16} className="text-status-green flex-shrink-0" />}
              {submitted && isWrong && (
                <span className="flex items-center gap-1 text-xs text-status-red flex-shrink-0">
                  <X size={14} />
                  <span className="font-mono">{prob.answer}</span>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit */}
      {!readOnly && !submitted && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={answeredCount === 0}
            className="rounded-xl bg-greyscale-900 px-5 py-2.5 text-sm font-semibold text-greyscale-0 hover:bg-greyscale-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-greyscale-0 dark:text-greyscale-900 dark:hover:bg-greyscale-100 transition-colors"
          >
            Submit answers
          </button>
        </div>
      )}

      {submitted && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          answers.filter((a, i) => parseFloat(a) === problems[i].answer).length === problemCount
            ? 'border-status-green/20 bg-status-green/5 text-status-green'
            : 'border-primary-yellow-500/20 bg-primary-yellow-500/5 text-greyscale-700 dark:text-greyscale-200'
        }`}>
          Score: {answers.filter((a, i) => parseFloat(a) === problems[i].answer).length}/{problemCount} correct
        </div>
      )}
    </div>
  )
}
