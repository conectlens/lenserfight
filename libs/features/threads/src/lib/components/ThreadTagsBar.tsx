import React from 'react'
import { useNavigate } from 'react-router-dom'

import { TagRecord } from '@lenserfight/types'

interface ThreadTagsBarProps {
  tags: TagRecord[]
}

export const ThreadTagsBar: React.FC<ThreadTagsBarProps> = ({ tags }) => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => navigate(`/len/${tag.slug}`)}
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
