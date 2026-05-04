/**
 * ReplayControls — compact playback bar for stream replay.
 * Play/pause, scrubber, speed selector, elapsed/total time.
 */
import React from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'

import type { ReplayState } from '../hooks/useReplayController'

interface ReplayControlsProps {
  state: ReplayState
  progress: number
  positionMs: number
  durationMs: number
  speed: number
  onPlay: () => void
  onPause: () => void
  onSeek: (ms: number) => void
  onSetSpeed: (speed: number) => void
  onRestart: () => void
}

const SPEED_OPTIONS = [0.5, 1, 2, 4]

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  state,
  progress,
  positionMs,
  durationMs,
  speed,
  onPlay,
  onPause,
  onSeek,
  onSetSpeed,
  onRestart,
}) => {
  const isPlaying = state === 'playing'
  const isComplete = state === 'complete'

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-surface-border bg-surface-raised/30">
      {/* Play/Pause/Restart */}
      <button
        type="button"
        onClick={isComplete ? onRestart : isPlaying ? onPause : onPlay}
        className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-greyscale-100 dark:bg-greyscale-800 text-greyscale-700 dark:text-greyscale-200 hover:bg-greyscale-200 dark:hover:bg-greyscale-700 transition-colors"
      >
        {isComplete ? (
          <RotateCcw size={14} />
        ) : isPlaying ? (
          <Pause size={14} />
        ) : (
          <Play size={14} className="ml-0.5" />
        )}
      </button>

      {/* Time */}
      <span className="text-[10px] tabular-nums text-greyscale-500 font-mono flex-shrink-0 w-[72px]">
        {formatTime(positionMs)} / {formatTime(durationMs)}
      </span>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={durationMs || 1}
        value={positionMs}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="flex-1 h-1 appearance-none bg-greyscale-200 dark:bg-greyscale-700 rounded-full cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
      />

      {/* Speed selector */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSetSpeed(s)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              speed === s
                ? 'bg-primary text-white font-semibold'
                : 'text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Replay indicator */}
      {state === 'playing' && (
        <span className="text-[10px] text-greyscale-400">
          Replaying execution
        </span>
      )}
    </div>
  )
}
