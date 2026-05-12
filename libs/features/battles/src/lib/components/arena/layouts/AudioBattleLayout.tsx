import React, { useRef, useState, useEffect } from 'react'
import type { BattleLayoutContext } from '../../../types/battle-layout.types'
import { BattleResultsPanel } from '../../results/BattleResultsPanel'

/**
 * Audio player with progress, time display, and play/pause controls.
 * Uses native <audio> element — no external waveform library required.
 */
function AudioPlayer({
  url,
  label,
  slot,
}: {
  url: string | null | undefined
  label: string
  slot: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime)
      setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0)
    }
    const onLoaded = () => setDuration(el.duration)
    const onEnded = () => setPlaying(false)
    const onError = () => setError(true)

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('ended', onEnded)
    el.addEventListener('error', onError)
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('error', onError)
    }
  }, [url])

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      el.play().catch(() => setError(true))
      setPlaying(true)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(x / rect.width, 1))
    el.currentTime = ratio * duration
    setProgress(ratio * 100)
  }

  const formatTime = (s: number) => {
    if (!Number.isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-surface-text-muted">
        <span className="text-3xl">🔇</span>
        <p className="text-sm font-semibold">No audio yet</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-surface-text-muted">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm font-semibold text-red-500">Failed to load audio</p>
      </div>
    )
  }

  return (
    <div className="px-5 py-6 space-y-4">
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />

      {/* Waveform visualization (CSS bars) */}
      <div className="flex items-end justify-center gap-[2px] h-16 opacity-60">
        {Array.from({ length: 48 }, (_, i) => {
          const filled = (i / 48) * 100 <= progress
          const height = 20 + Math.abs(Math.sin(i * 0.8 + 1) * 44)
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-colors ${filled ? 'bg-primary-yellow-500' : 'bg-surface-interactive'}`}
              style={{ height: `${height}%` }}
            />
          )
        })}
      </div>

      {/* Progress track */}
      <div
        className="h-2 rounded-full bg-surface-interactive cursor-pointer relative overflow-hidden"
        onClick={handleSeek}
        role="slider"
        aria-label="Seek"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary-yellow-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-surface-text-muted tabular-nums">{formatTime(currentTime)}</span>
        <button
          type="button"
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-primary-yellow-500 hover:bg-primary-yellow-600 text-dark-900 flex items-center justify-center shadow-md transition-colors"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6zm8-14v14h4V5z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <span className="text-xs text-surface-text-muted tabular-nums">{formatTime(duration)}</span>
      </div>
    </div>
  )
}

/**
 * GRASP: Polymorphism — specialized layout for audio/music battles.
 * Prioritizes audio players with waveform-style visualization,
 * playback controls, and side-by-side listening UX.
 */
export function AudioBattleLayout(ctx: BattleLayoutContext) {
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

      {/* Audio players side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-surface-border">
        {contenders.map((contender, idx) => {
          const submission = submissions.find((s) => s.contender_id === contender.id)
          const aggregate = aggregates.find((a) => a.contender_id === contender.id)
          const audioUrl = submission?.media_url ?? submission?.content_url
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

              {/* Audio player */}
              <div className="flex-1 bg-surface-base">
                <AudioPlayer url={audioUrl} label={contender.display_name} slot={contender.slot} />
              </div>

              {/* Transcript if available */}
              {submission?.content_text && (
                <details className="border-t border-surface-border-subtle">
                  <summary className="px-4 py-2.5 text-xs font-semibold text-surface-text-muted cursor-pointer select-none hover:bg-surface-interactive">
                    Transcript / notes
                  </summary>
                  <div className="px-4 pb-4 text-sm text-surface-text leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {submission.content_text}
                  </div>
                </details>
              )}

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
