import { Clock, BookOpen, Check, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

interface GrammarQuestion {
  sentence: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface GrammarQuizGameProps {
  /** Language for the quiz. */
  language?: string
  /** Number of questions. */
  questionCount?: number
  /** Time limit in seconds. */
  timeLimit: number
  /** Called when all questions are answered or time runs out. */
  onSubmit: (results: { correct: number; total: number; answers: number[] }) => void
  /** Read-only mode. */
  readOnly?: boolean
}

// Sample grammar questions — in production these would come from an API
function generateQuestions(language: string, count: number): GrammarQuestion[] {
  const englishQuestions: GrammarQuestion[] = [
    {
      sentence: 'She ___ to the store yesterday.',
      options: ['go', 'goes', 'went', 'gone'],
      correctIndex: 2,
      explanation: '"Went" is the past tense of "go".',
    },
    {
      sentence: 'Neither the teacher nor the students ___ ready.',
      options: ['is', 'are', 'was', 'were'],
      correctIndex: 3,
      explanation: 'With "neither...nor", the verb agrees with the nearest subject (students = plural).',
    },
    {
      sentence: 'The committee ___ its decision.',
      options: ['have made', 'has made', 'have make', 'has make'],
      correctIndex: 1,
      explanation: '"Committee" is a collective noun treated as singular.',
    },
    {
      sentence: 'If I ___ you, I would apologize.',
      options: ['am', 'was', 'were', 'be'],
      correctIndex: 2,
      explanation: 'Subjunctive mood uses "were" for hypothetical conditions.',
    },
    {
      sentence: 'The data ___ that the hypothesis is correct.',
      options: ['suggest', 'suggests', 'suggesting', 'suggested'],
      correctIndex: 0,
      explanation: '"Data" is plural (datum is singular), so the verb is "suggest".',
    },
    {
      sentence: 'Each of the students ___ their own book.',
      options: ['have', 'has', 'having', 'had'],
      correctIndex: 1,
      explanation: '"Each" is singular, requiring "has".',
    },
    {
      sentence: 'He ran quickly ___ he could catch the bus.',
      options: ['so that', 'because', 'although', 'unless'],
      correctIndex: 0,
      explanation: '"So that" expresses purpose.',
    },
  ]

  // Shuffle and take the requested count
  const shuffled = [...englishQuestions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function GrammarQuizGame({
  language = 'English',
  questionCount = 5,
  timeLimit,
  onSubmit,
  readOnly = false,
}: GrammarQuizGameProps) {
  const questions = useMemo(() => generateQuestions(language, questionCount), [language, questionCount])
  const [answers, setAnswers] = useState<number[]>(() => Array(questions.length).fill(-1))
  const [remaining, setRemaining] = useState(timeLimit)
  const [submitted, setSubmitted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)

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

  const handleAnswer = useCallback((qIdx: number, optIdx: number) => {
    if (submitted || readOnly) return
    setAnswers((prev) => {
      const next = [...prev]
      next[qIdx] = optIdx
      return next
    })
    // Auto-advance to next unanswered
    if (qIdx < questions.length - 1) {
      setCurrentIdx(qIdx + 1)
    }
  }, [submitted, readOnly, questions.length])

  const handleSubmit = useCallback(() => {
    if (submitted || readOnly) return
    const correct = questions.reduce((count, q, i) => {
      return count + (answers[i] === q.correctIndex ? 1 : 0)
    }, 0)
    setSubmitted(true)
    onSubmit({ correct, total: questions.length, answers })
  }, [submitted, readOnly, questions, answers, onSubmit])

  const answeredCount = answers.filter((a) => a >= 0).length
  const urgency = remaining <= 30 ? 'text-status-red' : remaining <= 60 ? 'text-primary-yellow-600' : 'text-greyscale-400'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-purple-500" />
          <span className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
            {language} Grammar &middot; {answeredCount}/{questions.length}
          </span>
        </div>
        {!readOnly && (
          <span className={`flex items-center gap-1 font-mono font-semibold text-sm ${urgency}`}>
            <Clock size={13} />
            {formatCountdown(remaining)}
          </span>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => {
          const isActive = qIdx === currentIdx && !submitted
          const userAnswer = answers[qIdx]
          const isCorrect = submitted && userAnswer === q.correctIndex
          const isWrong = submitted && userAnswer >= 0 && userAnswer !== q.correctIndex

          return (
            <div
              key={qIdx}
              className={`rounded-2xl border p-4 transition-colors ${
                submitted
                  ? isCorrect
                    ? 'border-status-green/30 bg-status-green/5'
                    : isWrong
                      ? 'border-status-red/30 bg-status-red/5'
                      : 'border-surface-border bg-surface-base'
                  : isActive
                    ? 'border-primary-yellow-500/40 bg-primary-yellow-500/5'
                    : 'border-surface-border bg-surface-base'
              }`}
              onClick={() => { if (!submitted) setCurrentIdx(qIdx) }}
            >
              <p className="text-sm font-medium text-greyscale-900 dark:text-greyscale-50 mb-3">
                <span className="text-greyscale-400 mr-1.5">{qIdx + 1}.</span>
                {q.sentence}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = userAnswer === optIdx
                  const isCorrectOption = submitted && optIdx === q.correctIndex
                  const isWrongSelection = submitted && isSelected && optIdx !== q.correctIndex

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleAnswer(qIdx, optIdx) }}
                      disabled={submitted || readOnly}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left transition-colors ${
                        isCorrectOption
                          ? 'border-status-green bg-status-green/10 text-status-green font-semibold'
                          : isWrongSelection
                            ? 'border-status-red bg-status-red/10 text-status-red'
                            : isSelected
                              ? 'border-greyscale-900 bg-greyscale-900 text-greyscale-0 dark:border-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                              : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
                      }`}
                    >
                      {isCorrectOption && <Check size={14} className="flex-shrink-0" />}
                      {isWrongSelection && <X size={14} className="flex-shrink-0" />}
                      {opt}
                    </button>
                  )
                })}
              </div>

              {submitted && (isCorrect || isWrong) && (
                <p className="mt-2 text-xs text-greyscale-500 dark:text-greyscale-400">
                  {q.explanation}
                </p>
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
          answers.filter((a, i) => a === questions[i].correctIndex).length === questions.length
            ? 'border-status-green/20 bg-status-green/5 text-status-green'
            : 'border-primary-yellow-500/20 bg-primary-yellow-500/5 text-greyscale-700 dark:text-greyscale-200'
        }`}>
          Score: {answers.filter((a, i) => a === questions[i].correctIndex).length}/{questions.length} correct
        </div>
      )}
    </div>
  )
}
