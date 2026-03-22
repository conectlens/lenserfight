import React from 'react'
import { useNavigate } from 'react-router-dom'

import { TagRecord } from '@lenserfight/types'

interface LensTagsBarProps {
  tags: TagRecord[]
}

export const LensTagsBar: React.FC<LensTagsBarProps> = ({ tags }) => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => navigate(`/len/${tag.slug}`)}
          className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          #{tag.name}
        </button>
      ))}
    </div>
  )
}
