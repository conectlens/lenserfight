import React from 'react'

type BattleStatus = 'draft' | 'open' | 'voting' | 'scoring' | 'closed' | 'published' | 'archived'

const STATUS_STYLES: Record<BattleStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  open: { label: 'Open', className: 'bg-green-100 text-green-700' },
  voting: { label: 'Voting', className: 'bg-blue-100 text-blue-700' },
  scoring: { label: 'Scoring', className: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'Closed', className: 'bg-gray-200 text-gray-500' },
  published: { label: 'Published', className: 'bg-purple-100 text-purple-700' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-400' },
}

export function BattleStatusBadge({ status }: { status: BattleStatus }) {
  const { label, className } = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
