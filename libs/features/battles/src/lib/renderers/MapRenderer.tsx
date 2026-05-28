import React from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const MapSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ content, url, metadata }) => {
  if (!content && !url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting map submission…
      </div>
    )
  }

  // If URL provided (static map image or embedded map), render as image
  if (url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <img
          src={url}
          alt="Map submission"
          className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
        />
      </div>
    )
  }

  // Try to parse GeoJSON or coordinate data
  const geoData = (() => {
    try { return JSON.parse(content ?? '{}') } catch { return null }
  })()

  if (geoData?.type === 'FeatureCollection' || geoData?.type === 'Feature') {
    return (
      <div className="h-full min-h-[200px] overflow-auto rounded-xl bg-greyscale-950 p-4">
        <div className="mb-2 text-xs text-greyscale-500 font-mono uppercase">
          GeoJSON — {geoData.features?.length ?? 1} feature(s)
        </div>
        <pre className="text-xs font-mono text-greyscale-300 whitespace-pre-wrap break-words max-h-60 overflow-auto">
          {JSON.stringify(geoData, null, 2)}
        </pre>
      </div>
    )
  }

  // Fallback: render as text description
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none p-4 text-sm leading-relaxed text-greyscale-900 dark:text-greyscale-50">
      {content}
    </div>
  )
}

const MapIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <div className="relative">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M20 4C13.4 4 8 9.4 8 16c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="currentColor" opacity="0.2" />
        <circle cx="20" cy="16" r="4" fill="currentColor" className="animate-pulse" />
      </svg>
    </div>
    <span className="text-xs">Waiting for map data</span>
  </div>
)

export const MapRenderer: BattleContentRenderer = {
  contentType: 'map' as 'text',
  SubmissionRenderer: MapSubmissionRenderer,
  IdleAnimation: MapIdleAnimation,
  voteStyle: 'ab_choice',
}
