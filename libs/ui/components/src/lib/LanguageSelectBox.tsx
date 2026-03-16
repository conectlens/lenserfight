import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Language } from '@lenserfight/types'

interface LanguageSelectBoxProps {
  value: string
  onChange: (code: string) => void
  languages: Language[]
  isLoading?: boolean
  placeholder?: string
}

export const LanguageSelectBox: React.FC<LanguageSelectBoxProps> = ({
  value,
  onChange,
  languages,
  isLoading = false,
  placeholder = 'Select a language',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = languages.find((l) => l.code === value) ?? null

  const close = useCallback(() => {
    setIsOpen(false)
    setFocusedIndex(-1)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [close])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement | null
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(languages.findIndex((l) => l.code === value))
      }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((i) => Math.min(i + 1, languages.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      onChange(languages[focusedIndex].code)
      close()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => { if (!isLoading) setIsOpen((o) => !o) }}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className={[
          'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          isOpen ? 'ring-2 ring-primary/30 border-primary dark:border-primary' : '',
          isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {isLoading ? (
          <span className="text-gray-400">Loading languages…</span>
        ) : selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate">{selected.name}</span>
            <span className="text-gray-400 dark:text-gray-500 truncate text-xs">
              {selected.native_name}
            </span>
            {selected.direction === 'rtl' && (
              <span className="ml-auto shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-mono">
                RTL
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <svg
          className={['w-4 h-4 text-gray-400 shrink-0 transition-transform', isOpen ? 'rotate-180' : ''].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className={[
            'absolute z-50 mt-1 w-full max-h-56 overflow-y-auto',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'rounded-xl shadow-lg py-1 text-sm',
          ].join(' ')}
        >
          {languages.map((lang, index) => {
            const isSelected = lang.code === value
            const isFocused = index === focusedIndex
            return (
              <li
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                onPointerDown={(e) => {
                  e.preventDefault()
                  onChange(lang.code)
                  close()
                }}
                onPointerEnter={() => setFocusedIndex(index)}
                className={[
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-primary dark:text-primary-400'
                    : isFocused
                      ? 'bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40',
                ].join(' ')}
              >
                <span className="flex-1 truncate font-medium">{lang.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{lang.native_name}</span>
                {lang.direction === 'rtl' && (
                  <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-mono">
                    RTL
                  </span>
                )}
                {isSelected && (
                  <svg className="w-4 h-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
