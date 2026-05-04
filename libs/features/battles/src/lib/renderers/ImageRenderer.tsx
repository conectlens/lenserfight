import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

const ImageSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ url }) => {
  const [lightbox, setLightbox] = useState(false)

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting image submission…
      </div>
    )
  }

  return (
    <>
      <div
        className="flex items-center justify-center h-full min-h-[120px] cursor-zoom-in"
        onClick={() => setLightbox(true)}
        title="Click to enlarge"
      >
        <img
          src={url}
          alt="Battle submission"
          className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
        />
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
              src={url}
              alt="Battle submission fullscreen"
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
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

const ImageIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <div className="w-24 h-16 rounded-xl bg-greyscale-800 animate-pulse" />
    <span className="text-xs">Waiting for image</span>
  </div>
)

export const ImageRenderer: BattleContentRenderer = {
  contentType: 'image',
  SubmissionRenderer: ImageSubmissionRenderer,
  IdleAnimation: ImageIdleAnimation,
  voteStyle: 'ab_choice',
}
