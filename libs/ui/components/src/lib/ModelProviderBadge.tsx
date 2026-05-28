import React from 'react'

export interface ModelProviderBadgeProps {
  providerKey: string | null
  modelKey: string | null
  size?: 'xs' | 'sm'
  className?: string
}

// Provider accent colors (dot only — no full background to keep it compact)
const providerDotColor: Record<string, string> = {
  google: 'bg-primary-yellow-500',
  anthropic: 'bg-[#D97706]', // amber
  openai: 'bg-status-green',
  mistral: 'bg-status-purple',
  meta: 'bg-[#3B5998]',
  midjourney: 'bg-[#8B5CF6]',
  stability: 'bg-[#EC4899]',
  other: 'bg-greyscale-400',
}

// Shorten a long model key for compact display (e.g. "gemini-2.5-flash-preview" → "gemini-2.5-flash")
function truncateModelKey(key: string, maxLen = 22): string {
  const parts = key.replace(/-preview$/, '').replace(/-latest$/, '')
  return parts.length > maxLen ? parts.slice(0, maxLen - 1) + '…' : parts
}

export function ModelProviderBadge({
  providerKey,
  modelKey,
  size = 'sm',
  className = '',
}: ModelProviderBadgeProps) {
  const provider = (providerKey ?? 'other').toLowerCase()
  const dotColor = providerDotColor[provider] ?? providerDotColor.other
  const displayModel = modelKey ? truncateModelKey(modelKey) : null
  const displayProvider = providerKey ?? 'unknown'

  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs'
  const dotSize = size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-greyscale-100 dark:bg-greyscale-800 text-greyscale-600 dark:text-greyscale-300 font-medium ${textSize} ${className}`}
      title={modelKey ? `${displayProvider} · ${modelKey}` : displayProvider}
    >
      <span className={`rounded-full flex-shrink-0 ${dotSize} ${dotColor}`} />
      <span className="truncate max-w-[120px]">
        {displayModel ? `${displayProvider} · ${displayModel}` : displayProvider}
      </span>
    </span>
  )
}
