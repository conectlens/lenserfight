import { Lenser } from '@lenserfight/types'
import { ARENA_BASE_URL } from '@lenserfight/utils/env'
import { storage } from '@lenserfight/utils/storage'
import { Swords, X } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DISMISSED_KEY = 'lf:welcome_banner_dismissed'
const NEW_USER_WINDOW_MS = 48 * 60 * 60 * 1000

const CONCEPTS = [
  { term: 'Battle', definition: 'Two contenders. One prompt. Community verdict.' },
  { term: 'Lens', definition: 'The prompt template both sides run.' },
  { term: 'Rubric', definition: 'The scoring rules the AI judge follows.' },
] as const

interface NewUserWelcomeBannerProps {
  lenser: Lenser
}

export function NewUserWelcomeBanner({ lenser }: NewUserWelcomeBannerProps) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => !!storage.getItem(DISMISSED_KEY))

  const isNewUser = Date.now() - new Date(lenser.created_at).getTime() < NEW_USER_WINDOW_MS

  if (dismissed || !isNewUser) return null

  const dismiss = () => {
    storage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  return (
    <section className="lg:col-span-12 rounded-2xl border border-primary-yellow-500/30 bg-primary-yellow-500/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-black text-greyscale-900 dark:text-greyscale-0">
            Welcome to the arena, {lenser.display_name}.
          </p>
          <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
            Here's what the three core concepts mean before you dive in.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss welcome banner"
          className="shrink-0 rounded-full p-1.5 text-greyscale-400 transition-colors hover:bg-surface-raised hover:text-greyscale-700 dark:hover:text-greyscale-200"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {CONCEPTS.map(({ term, definition }) => (
          <div key={term} className="flex gap-3 rounded-xl border border-surface-border bg-white px-4 py-3 dark:bg-surface-raised">
            <p className="min-w-[4rem] text-xs font-black uppercase tracking-[0.12em] text-greyscale-500 dark:text-greyscale-400 pt-0.5">{term}</p>
            <p className="text-sm text-greyscale-700 dark:text-greyscale-300">{definition}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => { dismiss(); navigate('/battles/create') }}
          className="inline-flex items-center gap-2 rounded-full bg-primary-yellow-500 px-5 py-2.5 text-sm font-bold text-greyscale-900 transition-all hover:bg-primary-yellow-400"
        >
          <Swords size={15} /> Start your first battle
        </button>
        <a
          href={`${ARENA_BASE_URL}/battle-showcase`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-white px-5 py-2.5 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:bg-transparent dark:text-greyscale-300 dark:hover:text-greyscale-0"
        >
          Watch a real battle
        </a>
      </div>
    </section>
  )
}
