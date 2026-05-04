import React, { useRef, useState } from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const BAR_COUNT = 12

const AudioSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ url }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting audio submission…
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Animated waveform bars */}
      <div className="flex items-end gap-1 h-10">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-primary"
            style={{
              height: `${24 + (i % 4) * 8}px`,
              animationName: playing ? 'waveformPulse' : 'none',
              animationDuration: `${0.5 + (i % 3) * 0.15}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      <audio
        ref={audioRef}
        src={url}
        controls
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="w-full max-w-xs rounded-full"
      />

      <style>{`
        @keyframes waveformPulse {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

const AudioIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <div className="flex items-end gap-1 h-8">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-greyscale-700"
          style={{ height: `${8 + (i % 4) * 4}px` }}
        />
      ))}
    </div>
    <span className="text-xs">Waiting for audio</span>
  </div>
)

export const AudioRenderer: BattleContentRenderer = {
  contentType: 'audio',
  SubmissionRenderer: AudioSubmissionRenderer,
  IdleAnimation: AudioIdleAnimation,
  voteStyle: 'ab_choice',
}
