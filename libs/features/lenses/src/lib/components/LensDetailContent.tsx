import { Pencil } from 'lucide-react'
import React from 'react'

interface LensDetailContentProps {
  content: string
  canEdit?: boolean
  onEdit?: () => void
}

export const LensDetailContent: React.FC<LensDetailContentProps> = ({
  content,
  canEdit = false,
  onEdit,
}) => {
  return (
    <div className="w-full max-w-[860px] mx-auto bg-white rounded-2xl border border-gray-200/70 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-6 md:p-10 transition-all duration-200">
      {canEdit && onEdit && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 transition-colors hover:border-primary/40 hover:text-primary-700 dark:border-gray-700 dark:text-gray-300 dark:hover:text-primary-400"
            aria-label="Edit lens"
            title="Edit lens"
          >
            <Pencil size={13} />
            Edit
          </button>
        </div>
      )}
      <div className="prose prose-lg md:prose-xl max-w-none text-gray-800 leading-loose whitespace-pre-wrap font-sans font-normal">
        {content}
      </div>
    </div>
  )
}
