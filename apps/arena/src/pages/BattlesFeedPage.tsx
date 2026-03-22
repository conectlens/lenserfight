import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BattleCard } from '../components/BattleCard'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface Battle {
  id: string
  slug: string
  title: string
  task_prompt: string
  status: string
  total_vote_count: number
  published_at: string | null
}

const FILTERS = ['all', 'open', 'voting', 'published', 'closed'] as const

export function BattlesFeedPage() {
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const client = createClient(supabaseUrl, supabaseKey)
    let query = client
      .schema('battles')
      .from('battles')
      .select('id, slug, title, task_prompt, status, total_vote_count, published_at')
      .order('published_at', { ascending: false })
      .limit(50)

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    query.then(({ data, error }) => {
      if (!error && data) setBattles(data)
      setLoading(false)
    })
  }, [filter])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Battles</h1>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filter === f
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : battles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="font-medium">No battles yet.</p>
          <p className="text-sm mt-1">Be the first to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {battles.map((b) => (
            <BattleCard
              key={b.id}
              id={b.id}
              slug={b.slug}
              title={b.title}
              taskPrompt={b.task_prompt}
              status={b.status}
              totalVoteCount={b.total_vote_count}
              publishedAt={b.published_at}
            />
          ))}
        </div>
      )}
    </div>
  )
}
