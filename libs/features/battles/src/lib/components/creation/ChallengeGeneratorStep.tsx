import { Badge } from '@lenserfight/ui/components'
import {
  type GeneratedChallengeStatus,
  type ChallengeGeneratorRequirements,
  getGeneratorRequirements,
} from '@lenserfight/domain/battle-governance'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Wand2,
  XCircle,
} from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ChallengeGeneratorStepProps {
  challengeType: string
  /** Selected generator lens ID. */
  generatorLensId: string | null
  onGeneratorLensChange: (lensId: string) => void
  /** Selected generator model ID. */
  generatorModelId: string | null
  onGeneratorModelChange: (modelId: string) => void
  /** Selected difficulty. */
  difficulty: string
  onDifficultyChange: (difficulty: string) => void
  /** Selected language. */
  language: string
  onLanguageChange: (language: string) => void
  /** Current generation status. */
  generationStatus: GeneratedChallengeStatus | null
  /** Generated question text (preview). */
  questionPreview: string | null
  /** Callback to trigger generation. */
  onGenerate: () => void
  /** Callback to lock the challenge. */
  onLock: () => void
  /** Whether the challenge is currently locked. */
  isLocked: boolean
  /** Error message from last generation attempt. */
  generationError: string | null
  /** Available lenses for selection (fetched by parent). */
  availableLenses: Array<{ id: string; title: string; slug: string }>
  /** Available models for selection (fetched by parent). */
  availableModels: Array<{ id: string; label: string }>
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChallengeGeneratorStep({
  challengeType,
  generatorLensId,
  onGeneratorLensChange,
  generatorModelId,
  onGeneratorModelChange,
  difficulty,
  onDifficultyChange,
  language,
  onLanguageChange,
  generationStatus,
  questionPreview,
  onGenerate,
  onLock,
  isLocked,
  generationError,
  availableLenses,
  availableModels,
}: ChallengeGeneratorStepProps) {
  const requirements = useMemo(
    () => getGeneratorRequirements(challengeType),
    [challengeType],
  )

  const difficultyLevels = requirements?.difficultyLevels ?? ['easy', 'medium', 'hard']
  const isGenerating = generationStatus === 'generating'
  const isReady = generationStatus === 'ready'
  const isFailed = generationStatus === 'failed'
  const canGenerate = !!generatorLensId && !!generatorModelId && !isGenerating && !isLocked
  const canLock = isReady && !isLocked

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <label className="block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
          AI Question Generator
        </label>
        <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400">
          A neutral AI will generate the challenge question. Both contestants will see the exact same question.
        </p>
      </div>

      {/* Generator Configuration */}
      {!isLocked && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-lg border border-greyscale-200 bg-greyscale-50 p-4 dark:border-greyscale-700 dark:bg-greyscale-800/50"
        >
          {/* Lens selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
              Generator Lens
            </label>
            <select
              value={generatorLensId ?? ''}
              onChange={(e) => onGeneratorLensChange(e.target.value)}
              className="w-full rounded-md border border-greyscale-300 bg-white px-3 py-2 text-sm dark:border-greyscale-600 dark:bg-greyscale-800 dark:text-greyscale-100"
              disabled={isLocked}
            >
              <option value="">Select a generator lens...</option>
              {availableLenses.map((lens) => (
                <option key={lens.id} value={lens.id}>
                  {lens.title}
                </option>
              ))}
            </select>
          </div>

          {/* Model selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
              AI Model
            </label>
            <select
              value={generatorModelId ?? ''}
              onChange={(e) => onGeneratorModelChange(e.target.value)}
              className="w-full rounded-md border border-greyscale-300 bg-white px-3 py-2 text-sm dark:border-greyscale-600 dark:bg-greyscale-800 dark:text-greyscale-100"
              disabled={isLocked}
            >
              <option value="">Select a model...</option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-1 block text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
              Difficulty
            </label>
            <div className="flex gap-2">
              {difficultyLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onDifficultyChange(level)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    difficulty === level
                      ? 'bg-primary-600 text-white'
                      : 'bg-greyscale-100 text-greyscale-700 hover:bg-greyscale-200 dark:bg-greyscale-700 dark:text-greyscale-300 dark:hover:bg-greyscale-600'
                  }`}
                  disabled={isLocked}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Language (if locale dependent) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full rounded-md border border-greyscale-300 bg-white px-3 py-2 text-sm dark:border-greyscale-600 dark:bg-greyscale-800 dark:text-greyscale-100"
              disabled={isLocked}
            >
              <option value="en">English</option>
              <option value="tr">Turkish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating question...
              </>
            ) : isFailed ? (
              <>
                <RefreshCw size={16} />
                Retry generation
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Generate question
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Error display */}
      {generationError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
        >
          <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-xs text-red-700 dark:text-red-400">{generationError}</p>
        </motion.div>
      )}

      {/* Question Preview */}
      {questionPreview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 rounded-lg border border-greyscale-200 bg-white p-4 dark:border-greyscale-700 dark:bg-greyscale-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary-500" />
              <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
                Generated Challenge
              </span>
            </div>
            {isLocked && (
              <Badge color="green" size="sm">
                <Lock size={10} className="mr-1" />
                Locked
              </Badge>
            )}
            {isReady && !isLocked && (
              <Badge color="yellow" size="sm">
                Ready to lock
              </Badge>
            )}
          </div>

          <div className="rounded-md border border-greyscale-100 bg-greyscale-50 p-3 dark:border-greyscale-700 dark:bg-greyscale-800/50">
            <p className="whitespace-pre-wrap text-sm text-greyscale-800 dark:text-greyscale-200">
              {questionPreview}
            </p>
          </div>

          {/* Lock button */}
          {canLock && (
            <button
              type="button"
              onClick={onLock}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-green-500 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 transition-all hover:bg-green-100 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
            >
              <Lock size={16} />
              Lock challenge — make immutable
            </button>
          )}
        </motion.div>
      )}

      {/* Locked state */}
      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <Check size={16} className="text-green-600" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Challenge locked. Both contestants will receive this exact question.
          </span>
        </div>
      )}

      {/* Fairness notice */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          The AI generator creates a neutral question. Once locked, it cannot be changed.
          Both contestants will see the same question with the same time limit and rules.
        </p>
      </div>
    </div>
  )
}
