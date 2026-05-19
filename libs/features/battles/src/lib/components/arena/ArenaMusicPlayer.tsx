import React from 'react'
import { Music2 } from 'lucide-react'
import type { UseArenaMusicReturn } from '../../hooks/utils/useArenaMusic'

interface ArenaMusicPlayerProps {
  music: UseArenaMusicReturn
}

/**
 * Small floating music widget rendered in the Battle Arena.
 *
 * The YouTube IFrame player must be visible per YouTube Terms of Service —
 * this component renders it in a compact, unobtrusive card above the mobile
 * chat FAB (bottom-left, z-40 to stay below overlays).
 *
 * When music is disabled the widget collapses to a minimal icon badge so
 * the user knows music is available but paused.
 */
export const ArenaMusicPlayer: React.FC<ArenaMusicPlayerProps> = ({ music }) => {
  const { isEnabled, currentTrack, playerDivRef, playerReady } = music

  return (
    <div
      className={[
        'fixed bottom-5 left-4 z-40 flex flex-col items-start gap-1.5 transition-all duration-300',
        isEnabled ? 'opacity-100' : 'opacity-60',
      ].join(' ')}
      aria-label="Arena music player"
    >
      {/* Track info label — only when enabled and player ready */}
      {isEnabled && playerReady && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-base/90 border border-surface-border backdrop-blur-sm shadow-sm">
          <Music2 size={10} className="text-primary-yellow-500 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-medium text-surface-text-muted truncate max-w-[120px]">
            {currentTrack.title}
          </span>
        </div>
      )}

      {/* YouTube IFrame — must remain visible per YouTube ToS (cannot set to 0×0 or hidden) */}
      <div
        className={[
          'rounded-xl overflow-hidden shadow-md border border-surface-border',
          'transition-opacity duration-300',
          isEnabled ? 'opacity-100' : 'opacity-30',
        ].join(' ')}
        style={{ width: 140, height: 80 }}
      >
        <div ref={playerDivRef} />
      </div>
    </div>
  )
}
