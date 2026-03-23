import { History, X, RotateCcw, Loader2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { useLensVersions, useLensVersionDetail } from '../hooks/useLensVersions'

interface LensVersionHistoryButtonProps {
  lensId: string
  onRestore: (content: string) => void
}

export const LensVersionHistoryButton: React.FC<LensVersionHistoryButtonProps> = ({
  lensId,
  onRestore,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { versions, isLoading } = useLensVersions(lensId, { enabled: isOpen })
  const { data: versionDetail, isLoading: isLoadingDetail } = useLensVersionDetail(selectedVersionId)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen((v) => !v)
    if (isOpen) setSelectedVersionId(null)
  }

  const handleRestore = () => {
    if (!versionDetail?.templateBody) return
    onRestore(versionDetail.templateBody)
    setIsOpen(false)
    setSelectedVersionId(null)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        title="Version history"
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
          isOpen
            ? 'border-primary-300 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
        }`}
      >
        <History size={13} />
        <span>History</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
              Version History
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Version list */}
          <div className="max-h-44 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-gray-400">
                <Loader2 size={13} className="animate-spin" />
                Loading versions…
              </div>
            ) : versions.length === 0 ? (
              <div className="py-6 text-xs text-center text-gray-400">No versions yet.</div>
            ) : (
              versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVersionId(v.id === selectedVersionId ? null : v.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    v.id === selectedVersionId
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <span className="font-mono font-bold text-xs text-gray-900 dark:text-white w-7 shrink-0">
                    v{v.versionNumber}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      v.status === 'draft'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}
                  >
                    {v.status}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate flex-1 min-w-0">
                    {v.changelog ?? '—'}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Content preview + restore */}
          {selectedVersionId && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-400">
                  <Loader2 size={13} className="animate-spin" />
                  Loading content…
                </div>
              ) : versionDetail?.templateBody ? (
                <>
                  <pre className="px-4 py-3 text-[11px] font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 max-h-32 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">
                    {versionDetail.templateBody}
                  </pre>
                  <div className="px-4 py-2.5 flex justify-end border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={handleRestore}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                    >
                      <RotateCcw size={12} />
                      Restore this version
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
