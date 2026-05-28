import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const AvatarSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ url, content, metadata }) => {
  const [lightbox, setLightbox] = useState(false)
  const src = url ?? content
  const style = (metadata?.style as string) ?? 'generated'

  if (!src) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting avatar submission…
      </div>
    )
  }

  return (
    <>
      <div
        className="flex flex-col items-center justify-center gap-3 h-full min-h-[200px] cursor-zoom-in"
        onClick={() => setLightbox(true)}
        title="Click to enlarge"
      >
        <div className="relative">
          <img
            src={src}
            alt="Avatar submission"
            className="h-48 w-48 rounded-full object-cover shadow-xl ring-4 ring-surface-border"
          />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-surface-raised px-2.5 py-0.5 text-[10px] font-medium text-greyscale-500 shadow-sm border border-surface-border">
            {style}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
          >
            <motion.img
              src={src}
              alt="Avatar fullscreen"
              className="max-h-[80vh] max-w-[80vw] rounded-3xl object-contain shadow-2xl"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const AvatarIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <div className="h-16 w-16 rounded-full bg-greyscale-800 animate-pulse flex items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    </div>
    <span className="text-xs">Waiting for avatar</span>
  </div>
)

export const AvatarRenderer: BattleContentRenderer = {
  contentType: 'avatar' as 'text',
  SubmissionRenderer: AvatarSubmissionRenderer,
  IdleAnimation: AvatarIdleAnimation,
  voteStyle: 'ab_choice',
}
