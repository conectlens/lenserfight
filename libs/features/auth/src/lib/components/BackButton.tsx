import { ArrowLeft } from 'lucide-react'
import React from 'react'

import { sanitizeReturnUrl } from '@lenserfight/utils/dom'

export const BackButton: React.FC = () => {
  const returnUrl = sanitizeReturnUrl(new URLSearchParams(window.location.search).get('return_url'))
  return (
    <a
      href={returnUrl}
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-2.5 rounded-full hover:bg-white dark:hover:bg-gray-800 shadow-sm border border-gray-200/50 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 w-auto"
    >
      <ArrowLeft size={16} />
      Return back
    </a>
  )
}
