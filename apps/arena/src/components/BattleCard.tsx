import React from 'react'
import { Link } from 'react-router-dom'
import { BattleStatusBadge } from './BattleStatusBadge'

interface BattleCardProps {
  id: string
  slug: string
  title: string
  taskPrompt: string
  status: string
  totalVoteCount: number
  publishedAt?: string | null
  contenders?: { displayName: string; slot: string }[]
}

export function BattleCard({ slug, title, taskPrompt, status, totalVoteCount, contenders }: BattleCardProps) {
  return (
    <Link
      to={`/battles/${slug}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{title}</h3>
        <BattleStatusBadge status={status as any} />
      </div>
      <p className="text-gray-500 text-xs line-clamp-2 mb-3">{taskPrompt}</p>
      {contenders && contenders.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {contenders.map((c) => (
            <span key={c.slot} className="text-xs bg-gray-100 rounded px-2 py-0.5 text-gray-600">
              {c.slot}: {c.displayName}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span>🗳</span>
        <span>{totalVoteCount} votes</span>
      </div>
    </Link>
  )
}
