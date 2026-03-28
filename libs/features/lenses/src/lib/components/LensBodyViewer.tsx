import { LensVersionParam } from '@lenserfight/types'
import { Terminal } from 'lucide-react'
import React from 'react'

import { LensContentReadonly } from './LensContentReadonly'

interface LensBodyViewerProps {
  content?: string | null
  /** Rich version params — forwarded to LensContentReadonly for tooltip display. */
  versionParams?: LensVersionParam[]
}

export const LensBodyViewer: React.FC<LensBodyViewerProps> = ({ content, versionParams }) => {
  const safeContent = content ?? ''

  return (
    <div className="w-full relative group">
      {/* Container */}
      <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-base shadow-neu-1 transition-shadow hover:shadow-neu-2">

        {/* Content */}
        <div className="block max-h-[70vh] overflow-y-auto bg-surface-base p-6 pt-10 text-sm font-mono leading-7 text-greyscale-700 md:p-8 md:pt-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <div className="absolute left-4 top-4 select-none text-greyscale-400 opacity-30 pointer-events-none">
            <Terminal size={16} />
          </div>
          <div className="pl-6">
            {safeContent ? (
              <LensContentReadonly
                content={safeContent}
                versionParams={versionParams}
                className="break-words text-greyscale-700 dark:text-greyscale-200"
              />
            ) : (
              <span className="text-greyscale-400">No lens content available.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
