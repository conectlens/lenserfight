import { Copy, Check, Terminal, GitFork, Loader2 } from 'lucide-react'
import React, { useState } from 'react'

interface LensBodyViewerProps {
  content?: string | null
  onCopy?: () => void
  onFork?: () => void
  isForking?: boolean
}

export const LensBodyViewer: React.FC<LensBodyViewerProps> = ({ content, onCopy, onFork, isForking }) => {
  const [copied, setCopied] = useState(false)
  const safeContent = content ?? ''

  const handleCopy = async () => {
    if (!safeContent) return
    try {
      if (onCopy) {
        onCopy()
      } else {
        await navigator.clipboard.writeText(safeContent)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="w-full relative group">
      {/* Container */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-all hover:shadow-md relative">
        {/* Floating Actions */}
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          {onFork && (
            <button
              onClick={onFork}
              disabled={isForking}
              className="relative p-2 rounded-lg transition-all duration-200 border shadow-sm group/fork bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Fork lens"
            >
              {isForking ? <Loader2 size={16} className="animate-spin" /> : <GitFork size={16} />}
              {!isForking && (
                <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 pointer-events-none group-hover/fork:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Fork
                </span>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`
                relative p-2 rounded-lg transition-all duration-200 border shadow-sm group/btn
                ${
                  copied
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            aria-label="Copy lens content"
          >
            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}

            {/* Tooltip */}
            {!copied && (
              <span
                className="
                  absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 
                  bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 pointer-events-none
                  group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap
                "
              >
                Copy
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <pre className="block p-6 pt-10 md:p-8 md:pt-8 overflow-y-auto max-h-[70vh] text-sm md:text-base font-mono leading-7 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="absolute top-4 left-4 select-none opacity-30 pointer-events-none text-gray-400">
            <Terminal size={16} />
          </div>
          <code className="pl-6 block">{safeContent || 'No lens content available.'}</code>
        </pre>
      </div>
    </div>
  )
}
