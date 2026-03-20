import React from 'react'
import { GitBranch, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'

interface LabVersionGraphProps {
  currentPromptId: string
  parentPromptId: string | null | undefined
  onNavigate: (promptId: string) => void
  onFork: () => void
  isForking: boolean
}

export const LabVersionGraph: React.FC<LabVersionGraphProps> = ({
  currentPromptId,
  parentPromptId,
  onNavigate,
  onFork,
  isForking,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs">
      <GitBranch size={13} className="text-gray-400 flex-shrink-0" />

      {/* Lineage breadcrumb */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        {parentPromptId ? (
          <>
            <button
              type="button"
              onClick={() => onNavigate(parentPromptId)}
              className="text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[120px]"
              title={`Go to parent: ${parentPromptId}`}
            >
              Parent
            </button>
            <ChevronRight size={11} className="text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[100px]" title={currentPromptId}>
              This prompt
            </span>
          </>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Root prompt</span>
        )}
      </div>

      {/* Fork button */}
      <Button
        type="button"
        onClick={onFork}
        disabled={isForking}
        className="flex items-center gap-1 h-auto px-2 py-1 text-xs"
      >
        {isForking ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <GitBranch size={11} />
        )}
        Fork
      </Button>
    </div>
  )
}
