import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LensParam } from '@lenserfight/types'
import { Plus } from 'lucide-react'
import { ParamChip } from './ParamChip'

interface ParamAutocompleteProps {
  params: LensParam[]
  query: string
  position: { top: number; left: number }
  onSelect: (param: LensParam) => void
  onCreateNew: (name: string) => void
  onClose: () => void
}

export const ParamAutocomplete: React.FC<ParamAutocompleteProps> = ({
  params,
  query,
  position,
  onSelect,
  onCreateNew,
  onClose,
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const lowerQuery = query.toLowerCase()

  const filtered = params.filter((p) =>
    p.name.toLowerCase().includes(lowerQuery)
  )

  const showCreate = lowerQuery.length >= 1 && !filtered.some((p) => p.name === lowerQuery)
  const totalItems = filtered.length + (showCreate ? 1 : 0)

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Keyboard navigation (handled by parent editor's onKeyDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex < filtered.length) {
          onSelect(filtered[activeIndex])
        } else if (showCreate) {
          onCreateNew(lowerQuery)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [activeIndex, filtered, totalItems, showCreate, lowerQuery, onSelect, onCreateNew, onClose])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (totalItems === 0) return null

  const dropdown = (
    <div
      ref={listRef}
      className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-[240px] overflow-y-auto min-w-[200px] max-w-[280px]"
      style={{ top: position.top + 4, left: position.left }}
    >
      {filtered.map((param, i) => (
        <button
          key={`${param.name}-${i}`}
          type="button"
          onClick={() => onSelect(param)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
            i === activeIndex
              ? 'bg-primary-50 dark:bg-primary-900/20'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <ParamChip name={param.name} type={param.type} required={param.required} readonly size="xs" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase">
            {param.type}
          </span>
        </button>
      ))}

      {showCreate && (
        <button
          type="button"
          onClick={() => onCreateNew(lowerQuery)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-t border-gray-100 dark:border-gray-800 transition-colors ${
            activeIndex === filtered.length
              ? 'bg-primary-50 dark:bg-primary-900/20'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Plus size={12} className="text-primary-500 flex-shrink-0" />
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Create <code className="font-mono text-primary-600 dark:text-primary-400">{`{{${lowerQuery}}}`}</code>
          </span>
        </button>
      )}
    </div>
  )

  return createPortal(dropdown, document.body)
}
