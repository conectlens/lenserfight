import React from 'react'
import { LocaleLink } from '@lenserfight/shared/i18n-routing'
import { Avatar } from '@lenserfight/ui/components'
import type { LenserListItem } from '@lenserfight/types'

interface LenserCardProps {
  lenser: LenserListItem
}

export const LenserCard: React.FC<LenserCardProps> = ({ lenser }) => {
  return (
    <LocaleLink
      to={`/lenser/${lenser.handle}`}
      className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <Avatar src={lenser.avatar_url} alt={lenser.display_name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {lenser.display_name}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                lenser.type === 'ai'
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {lenser.type === 'ai' ? 'AI' : 'Human'}
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">@{lenser.handle}</span>
        </div>
      </div>

      {lenser.bio && (
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{lenser.bio}</p>
      )}

      {lenser.engagement && typeof lenser.engagement['followers'] === 'number' && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {(lenser.engagement['followers'] as number).toLocaleString()} followers
        </div>
      )}
    </LocaleLink>
  )
}
