import React, { useRef, useState } from 'react'
import { Layers } from 'lucide-react'
import type { BattleLayoutContext } from '../../../types/battle-layout.types'
import { BattleResultsPanel } from '../../results/BattleResultsPanel'
import { ProviderBadge } from '../../results/ProviderBadge'

/**
 * Image/drawing/avatar battle layout.
 * - Large image viewer side by side
 * - Comparison slider (drag divider between images)
 * - Fullscreen lightbox
 * - Generation metadata (model, prompt, dimensions)
 * - Results panel below as first-class section
 */

function ImageViewer({
  url,
  alt,
  slot,
  displayName,
}: {
  url: string | null | undefined
  alt: string
  slot: string
  displayName: string
}) {
  const [fullscreen, setFullscreen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      <div className="relative group bg-surface-sunken flex items-center justify-center min-h-[300px] md:min-h-[420px] overflow-hidden">
        {url ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary-yellow-500 border-t-transparent animate-spin" />
              </div>
            )}
            <img
              src={url}
              alt={alt}
              onLoad={() => setLoaded(true)}
              className={`max-w-full max-h-full object-contain cursor-zoom-in transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setFullscreen(true)}
            />
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-base/80 backdrop-blur-sm rounded-lg border border-surface-border px-2 py-1 text-[10px] font-bold text-surface-text-muted hover:text-surface-text"
              aria-label="View fullscreen"
            >
              ⛶ Fullscreen
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-surface-text-muted py-12">
            <span className="text-3xl">🖼</span>
            <p className="text-sm font-semibold">No image yet</p>
          </div>
        )}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreen && url && (
        <div
          role="dialog"
          aria-label={`${displayName} fullscreen`}
          className="fixed inset-0 z-modal bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={url}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-xs font-bold border border-white/20 rounded-lg px-3 py-1.5 bg-black/40 backdrop-blur-sm"
          >
            ✕ Close
          </button>
        </div>
      )}
    </>
  )
}

/**
 * CSS-based image comparison slider.
 * Drag the divider to reveal A vs B.
 */
function ComparisonSlider({
  urlA,
  urlB,
  nameA,
  nameB,
}: {
  urlA: string | null | undefined
  urlB: string | null | undefined
  nameA: string
  nameB: string
}) {
  const [sliderPos, setSliderPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  if (!urlA || !urlB) return null

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }

  return (
    <div className="px-6 pb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500" />
        Comparison slider — drag to compare
      </p>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-surface-border select-none touch-none cursor-col-resize"
        style={{ height: '300px' }}
        onMouseDown={() => { dragging.current = true }}
        onMouseUp={() => { dragging.current = false }}
        onMouseLeave={() => { dragging.current = false }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* Image B (right, full width) */}
        <img src={urlB} alt={nameB} className="absolute inset-0 w-full h-full object-contain bg-surface-sunken" />

        {/* Image A (left, clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <img src={urlA} alt={nameA} className="absolute inset-0 w-full h-full object-contain bg-surface-sunken" style={{ maxWidth: 'none', width: `${10000 / sliderPos}%` }} />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)] flex items-center justify-center"
          style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-7 h-7 rounded-full bg-white border border-surface-border shadow-md flex items-center justify-center text-xs text-surface-text-muted font-bold pointer-events-none">
            ⇔
          </div>
        </div>

        {/* Labels */}
        <span className="absolute top-2 left-2 bg-surface-base/80 backdrop-blur-sm text-[10px] font-bold text-surface-text rounded px-1.5 py-0.5 border border-surface-border">
          {nameA}
        </span>
        <span className="absolute top-2 right-2 bg-surface-base/80 backdrop-blur-sm text-[10px] font-bold text-surface-text rounded px-1.5 py-0.5 border border-surface-border">
          {nameB}
        </span>
      </div>
    </div>
  )
}

/**
 * GRASP: Polymorphism — specialized layout for image/drawing/avatar battles.
 * Prioritizes visual display with fullscreen, comparison slider, and gallery.
 */
export function ImageBattleLayout(ctx: BattleLayoutContext) {
  const {
    battle,
    currentPhase,
    isResult,
    contenders,
    submissions,
    aggregates,
    totalVotes,
    executionJobs,
    scorecardData,
    currentUserId,
    myVote,
    onVote,
    lensDetails,
  } = ctx

  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')
  const submissionA = submissions.find((s) => s.contender_id === contenderA?.id)
  const submissionB = submissions.find((s) => s.contender_id === contenderB?.id)

  const imageUrlA = submissionA?.media_url ?? submissionA?.content_url
  const imageUrlB = submissionB?.media_url ?? submissionB?.content_url

  const aggA = aggregates.find((a) => a.contender_id === contenderA?.id)
  const aggB = aggregates.find((a) => a.contender_id === contenderB?.id)
  const votePercentA = totalVotes > 0 ? Math.round(((aggA?.raw_vote_count ?? 0) / totalVotes) * 100) : 0
  const votePercentB = totalVotes > 0 ? Math.round(((aggB?.raw_vote_count ?? 0) / totalVotes) * 100) : 0

  const bothImagesReady = !!(imageUrlA && imageUrlB)

  return (
    <div className="flex flex-col">
      {/* Prompt banner */}
      {battle.task_prompt && (
        <div className="border-b border-surface-border-subtle bg-surface-sunken px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500" />
            Prompt
          </p>
          <p className="text-sm text-surface-text leading-relaxed max-w-4xl">{battle.task_prompt}</p>
        </div>
      )}

      {/* Image panels side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-surface-border">
        {contenders.map((contender, idx) => {
          const submission = submissions.find((s) => s.contender_id === contender.id)
          const aggregate = aggregates.find((a) => a.contender_id === contender.id)
          const imageUrl = submission?.media_url ?? submission?.content_url
          const votePercent = idx === 0 ? votePercentA : votePercentB

          return (
            <div
              key={contender.id}
              className={`flex flex-col ${idx === 0 ? 'border-b md:border-b-0 md:border-r' : ''} border-surface-border-subtle`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border bg-surface-base">
                <div className="h-7 w-7 rounded-lg bg-primary-yellow-500 flex items-center justify-center text-xs font-black text-dark-900">
                  {contender.slot}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-bold text-surface-text truncate">{contender.display_name}</span>
                  {lensDetails[contender.id] && (
                    <span className="hidden sm:flex items-center gap-1 text-[10px] text-greyscale-400 mt-0.5">
                      <Layers size={9} className="text-primary-yellow-500 flex-shrink-0" />
                      {lensDetails[contender.id]!.lensTitle}
                      {lensDetails[contender.id]!.versionNumber != null && ` v${lensDetails[contender.id]!.versionNumber}`}
                      {lensDetails[contender.id]!.paramCount > 0 && ` · ${lensDetails[contender.id]!.paramCount}p`}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-surface-text-muted tabular-nums">{votePercent}%</span>
              </div>

              {/* Image viewer */}
              <ImageViewer
                url={imageUrl}
                alt={`${contender.display_name} submission`}
                slot={contender.slot}
                displayName={contender.display_name}
              />

              {/* Vote bar */}
              <div className="border-t border-surface-border bg-surface-raised px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-surface-interactive overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-yellow-500 transition-all duration-700"
                    style={{ width: `${votePercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-surface-text-muted tabular-nums w-9 text-right">
                  {aggregate?.raw_vote_count ?? 0}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison slider — only shown when both images available */}
      {bothImagesReady && contenderA && contenderB && (
        <div className="border-b border-surface-border-subtle py-4 bg-surface-base">
          <ComparisonSlider
            urlA={imageUrlA}
            urlB={imageUrlB}
            nameA={contenderA.display_name}
            nameB={contenderB.display_name}
          />
        </div>
      )}

      {/* First-class results panel */}
      <BattleResultsPanel
        battle={battle}
        currentPhase={currentPhase}
        isResult={isResult}
        contenders={contenders}
        aggregates={aggregates}
        totalVotes={totalVotes}
        executionJobs={executionJobs}
        scorecardData={scorecardData}
        currentUserId={currentUserId}
        myVote={myVote}
        onVote={onVote}
      />
    </div>
  )
}
