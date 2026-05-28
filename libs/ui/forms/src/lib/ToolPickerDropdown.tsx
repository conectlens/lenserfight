import React, { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { ToolRecord } from '@lenserfight/types'

// ─── Type-to-color map (mirrors ParamChip TYPE_COLORS) ────────────────────────
const TYPE_BADGE: Record<string, string> = {
  text:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  textarea:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  json:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  number:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  integer:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  float:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  decimal:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  boolean:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  select:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  url:       'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  date:      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  datetime:  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  file:      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const CATEGORY_LABEL: Record<string, string> = {
  input:     'Input',
  media:     'Media',
  execution: 'Execution',
  battle:    'Battle',
  system:    'System',
}

interface ToolPickerDropdownProps {
  /** The [[label]] name of the parameter being configured. */
  paramLabel: string
  /** Currently selected tool id (if any). */
  currentToolId?: string | null
  /** Available tools from lenses.tools. */
  tools: ToolRecord[]
  /** Bounding rect of the anchor element (the chip). */
  anchorRect: DOMRect
  onSelect: (toolId: string) => void
  onClose: () => void
}

export const ToolPickerDropdown: React.FC<ToolPickerDropdownProps> = ({
  paramLabel,
  currentToolId,
  tools,
  anchorRect,
  onSelect,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Position: prefer below the anchor, flip up if near bottom of viewport
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - anchorRect.bottom
  const dropdownHeight = 280
  const top = spaceBelow > dropdownHeight
    ? anchorRect.bottom + window.scrollY + 6
    : anchorRect.top + window.scrollY - dropdownHeight - 6
  const left = Math.min(anchorRect.left + window.scrollX, window.innerWidth - 260)

  // Group tools by category
  const grouped = tools.reduce<Record<string, ToolRecord[]>>((acc, tool) => {
    const cat = tool.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(tool)
    return acc
  }, {})

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, zIndex: 9999 }}
      className="w-60 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
      role="listbox"
      aria-label={`Select tool for [[${paramLabel}]]`}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Tool for
        </span>{' '}
        <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">
          [[{paramLabel}]]
        </span>
      </div>

      {/* Tool list */}
      <div className="max-h-64 overflow-y-auto py-1">
        {Object.entries(grouped).map(([category, categoryTools]) => (
          <div key={category}>
            <div className="px-3 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
              {CATEGORY_LABEL[category] ?? category}
            </div>
            {categoryTools.map((tool) => {
              const isSelected = tool.id === currentToolId
              const badgeClass = TYPE_BADGE[tool.type] ?? TYPE_BADGE.text
              return (
                <button
                  key={tool.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onSelect(tool.id); onClose() }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                >
                  {/* Check or spacer */}
                  <span className="w-3 flex-shrink-0">
                    {isSelected && <Check size={11} className="text-primary-600 dark:text-primary-400" />}
                  </span>

                  {/* Tool label */}
                  <span className={`flex-1 text-xs font-medium ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {tool.label ?? tool.key}
                  </span>

                  {/* Type badge */}
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium ${badgeClass}`}>
                    {tool.type}
                  </span>
                </button>
              )
            })}
          </div>
        ))}

        {tools.length === 0 && (
          <p className="px-3 py-3 text-xs text-gray-400 text-center">No tools available.</p>
        )}
      </div>
    </div>
  )
}
