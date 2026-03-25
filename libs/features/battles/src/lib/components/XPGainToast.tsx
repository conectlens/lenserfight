import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface XPGainToastProps {
  visible: boolean
  xp?: number
}

export function XPGainToast({ visible, xp = 10 }: XPGainToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-50
                     bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1.5 rounded-full shadow-lg"
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: 1, y: -40, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.9 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          +{xp} XP
        </motion.div>
      )}
    </AnimatePresence>
  )
}
