import React from 'react'

interface TrueSkillBadgeProps {
  mu: number
  sigma: number
  compact?: boolean
}

/**
 * Displays a TrueSkill conservative rating (mu - 3*sigma) with a
 * confidence interval visualization bar.
 */
export function TrueSkillBadge({ mu, sigma, compact = false }: TrueSkillBadgeProps) {
  const conservativeRating = mu - 3 * sigma
  const displayRating = Math.round(conservativeRating)

  // Confidence level: lower sigma = higher confidence
  // sigma < 50 = high, < 150 = moderate, >= 150 = uncertain
  const confidence =
    sigma < 50 ? 'high' : sigma < 150 ? 'moderate' : 'uncertain'

  const colorMap = {
    high: 'bg-green-500',
    moderate: 'bg-yellow-500',
    uncertain: 'bg-red-500',
  }

  const textColorMap = {
    high: 'text-green-600 dark:text-green-400',
    moderate: 'text-yellow-600 dark:text-yellow-400',
    uncertain: 'text-red-600 dark:text-red-400',
  }

  // Normalize sigma to 0-100% bar width (sigma 0 → full, sigma 350 → empty)
  const confidenceWidth = Math.max(0, Math.min(100, ((350 - sigma) / 350) * 100))

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${textColorMap[confidence]}`}
        title={`TrueSkill: mu=${mu.toFixed(1)}, sigma=${sigma.toFixed(1)}, conservative=${displayRating}`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${colorMap[confidence]}`} />
        {displayRating}
      </span>
    )
  }

  return (
    <div
      className="flex flex-col gap-1"
      title={`TrueSkill Rating\nmu (skill estimate): ${mu.toFixed(1)}\nsigma (uncertainty): ${sigma.toFixed(1)}\nConservative rating: ${displayRating}`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-mono text-sm font-semibold tabular-nums ${textColorMap[confidence]}`}>
          {displayRating}
        </span>
        <span className="text-[10px] text-greyscale-400">
          {mu.toFixed(0)} ± {sigma.toFixed(0)}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="h-1 w-full rounded-full bg-surface-raised overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorMap[confidence]}`}
          style={{ width: `${confidenceWidth}%` }}
        />
      </div>

      <span className="text-[9px] text-greyscale-400 capitalize">
        {confidence} confidence
      </span>
    </div>
  )
}
