import { Hash, TrendingUp } from 'lucide-react'
import React from 'react'

import { TagUsage } from '@lenserfight/types'
import { formatCount } from '@lenserfight/utils/number'

interface TagHeaderProps {
  tag: TagUsage
  totalItems: number // Items currently visible/fetched
}

export const TagHeader: React.FC<TagHeaderProps> = ({ tag, totalItems }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 mb-8 shadow-sm relative overflow-hidden transition-colors">
      {/* Decorative Background Element */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-start gap-6">
        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 flex-shrink-0 border border-gray-100 dark:border-gray-600 shadow-inner">
          <Hash size={40} strokeWidth={1.5} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white capitalize tracking-tight">
              {tag.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">
              Topic
            </span>
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl leading-relaxed mb-4">
            {tag.description ||
              `Explore a collection of prompts and discussions related to ${tag.name}.`}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5" title="Total global uses across all types">
              <span className="text-gray-900 dark:text-gray-200 font-bold">
                {formatCount(tag.count)}
              </span>
              <span>global uses</span>
            </div>

            {tag.trendingScore > 0 && (
              <>
                <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="flex items-center gap-1.5 text-primary-700 dark:text-primary-400">
                  <TrendingUp size={16} />
                  <span className="font-bold">{formatCount(tag.trendingScore)}</span>
                  <span>trend score</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
