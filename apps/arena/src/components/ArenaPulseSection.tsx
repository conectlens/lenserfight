import { ArenaTrendingBattlesWidget, SpectatorFeedWidget } from '@lenserfight/features/battles'
import { ArenaHotThreadsWidget, ArenaTrendingLensesWidget } from '@lenserfight/features/home'
import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import React from 'react'

// run.lenserfight.com — the functional arena app
const RUN_APP_URL = import.meta.env.VITE_ARENA_URL ?? 'https://run.lenserfight.com'

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  },
}

export function ArenaPulseSection() {
  return (
    <motion.section
      className="w-full"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      aria-label="Arena Pulse — live platform activity"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Radio size={18} aria-hidden="true" className="text-red-500" />
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Arena Pulse
          </h2>
        </div>
        <span
          className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full"
          aria-label="Live data"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          LIVE
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 -mt-4">
        Live battles, trending fights, hot threads, and rising lenses — happening right now.
      </p>

      {/* Quad grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Live battles — Supabase realtime */}
        <SpectatorFeedWidget
          getBattleHref={(slug) => `${RUN_APP_URL}/battles/${slug}`}
        />

        {/* Hot / trending battles */}
        <ArenaTrendingBattlesWidget baseUrl={RUN_APP_URL} />

        {/* Hot threads */}
        <ArenaHotThreadsWidget baseUrl={RUN_APP_URL} />

        {/* Trending lenses */}
        <ArenaTrendingLensesWidget baseUrl={RUN_APP_URL} />
      </div>

      {/* CTA */}
      <div className="mt-8 flex justify-center">
        <a
          href={RUN_APP_URL}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-gray-900 shadow-md hover:shadow-xl transition-shadow hover:scale-[1.02] active:scale-[0.98]"
        >
          Explore the Arena →
        </a>
      </div>
    </motion.section>
  )
}
