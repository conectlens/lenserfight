import React, { useRef, useState } from 'react'
import type { BattleLayoutContext } from '../../../types/battle-layout.types'
import { BattleResultsPanel } from '../../results/BattleResultsPanel'

interface VideoPlayerProps {
  url: string | null | undefined
  slot: string
  displayName: string
  onTimeUpdate?: (t: number) => void
  seekTo?: number
}

function VideoPlayer({ url, slot, displayName, onTimeUpdate, seekTo }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const handleTimeUpdate = () => {
    if (videoRef.current) onTimeUpdate?.(videoRef.current.currentTime)
  }

  // External seek (synchronized playback)
  React.useEffect(() => {
    if (seekTo !== undefined && videoRef.current) {
      const diff = Math.abs(videoRef.current.currentTime - seekTo)
      if (diff > 0.5) videoRef.current.currentTime = seekTo
    }
  }, [seekTo])

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 bg-surface-sunken text-surface-text-muted">
        <span className="text-3xl">📹</span>
        <p className="text-sm font-semibold">No video yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="relative group bg-black">
        <video
          ref={videoRef}
          src={url}
          className="w-full max-h-[50vh] object-contain"
          controls
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
        />
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded px-2 py-1 text-[10px] font-bold"
          aria-label="View fullscreen"
        >
          ⛶
        </button>
      </div>

      {fullscreen && (
        <div
          role="dialog"
          aria-label={`${displayName} fullscreen video`}
          className="fixed inset-0 z-modal bg-black flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <video
            src={url}
            className="max-w-[90vw] max-h-[90vh]"
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-xs font-bold border border-white/20 rounded-lg px-3 py-1.5 bg-black/40"
          >
            ✕ Close
          </button>
        </div>
      )}
    </>
  )
}

/**
 * GRASP: Polymorphism — specialized layout for video battles.
 * Prioritizes synchronized playback, timeline comparison, fullscreen mode,
 * and generation metadata panels.
 */
export function VideoBattleLayout(ctx: BattleLayoutContext) {
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
  } = ctx

  const [syncTime, setSyncTime] = useState<number | undefined>(undefined)
  const [syncEnabled, setSyncEnabled] = useState(false)

  const handleTimeUpdate = (t: number) => {
    if (syncEnabled) setSyncTime(t)
  }

  return (
    <div className="flex flex-col">
      {/* Prompt */}
      {battle.task_prompt && (
        <div className="border-b border-surface-border-subtle bg-surface-sunken px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-yellow-500" />
            Prompt
          </p>
          <p className="text-sm text-surface-text leading-relaxed max-w-4xl">{battle.task_prompt}</p>
        </div>
      )}

      {/* Sync toggle */}
      {contenders.length >= 2 && (
        <div className="px-4 py-2.5 border-b border-surface-border-subtle bg-surface-base flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => setSyncEnabled(e.target.checked)}
              className="rounded border-surface-border accent-primary-yellow-500"
            />
            <span className="text-xs font-semibold text-surface-text-muted">Synchronized playback</span>
          </label>
          <span className="text-[10px] text-surface-text-disabled">Move scrubber in one video to sync both</span>
        </div>
      )}

      {/* Video panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-surface-border">
        {contenders.map((contender, idx) => {
          const submission = submissions.find((s) => s.contender_id === contender.id)
          const aggregate = aggregates.find((a) => a.contender_id === contender.id)
          const videoUrl = submission?.media_url ?? submission?.content_url
          const voteCount = aggregate?.raw_vote_count ?? 0
          const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

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
                <span className="text-sm font-bold text-surface-text truncate flex-1">{contender.display_name}</span>
                <span className="text-sm font-bold text-surface-text-muted tabular-nums">{votePercent}%</span>
              </div>

              <VideoPlayer
                url={videoUrl}
                slot={contender.slot}
                displayName={contender.display_name}
                onTimeUpdate={idx === 0 ? handleTimeUpdate : undefined}
                seekTo={syncEnabled && idx === 1 ? syncTime : undefined}
              />

              {/* Vote bar */}
              <div className="border-t border-surface-border bg-surface-raised px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-surface-interactive overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-yellow-500 transition-all duration-700"
                    style={{ width: `${votePercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-surface-text-muted tabular-nums w-9 text-right">{voteCount}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* First-class results */}
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
