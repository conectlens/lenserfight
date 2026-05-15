import { ChevronDown, Check, Search, Loader2 } from 'lucide-react'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { type Option } from './SelectField'

interface SearchSelectFieldProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  searchPlaceholder?: string
  error?: string
  disabled?: boolean
  isLoading?: boolean
  className?: string
  required?: boolean
  dropdownClassName?: string
  onOpen?: () => void
}

export const SearchSelectField: React.FC<SearchSelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  error,
  disabled,
  isLoading,
  className = '',
  required,
  dropdownClassName = '',
  onOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const selectedOption = options.find((o) => o.value === value)

  const filteredOptions = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const openDropdown = useCallback(() => {
    if (onOpen) onOpen()
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
    setIsOpen(true)
    setQuery('')
    setFocusedIndex(0)
  }, [onOpen])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setFocusedIndex(0)
  }, [])

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [isOpen])

  // Reset focused index when filtered list changes
  useEffect(() => {
    setFocusedIndex(0)
  }, [query])

  // Close on outside click / scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(event.target as Node)) return
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return
      closeDropdown()
    }

    const handleScrollOrResize = (e: Event) => {
      if (!isOpen) return
      const target = e.target as Node
      if (dropdownRef.current && target && (dropdownRef.current === target || dropdownRef.current.contains(target))) return
      closeDropdown()
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScrollOrResize, { capture: true })
      window.addEventListener('resize', handleScrollOrResize)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true })
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen, closeDropdown])

  const handleSelect = (val: string) => {
    if (val !== value) onChange(val)
    closeDropdown()
    containerRef.current?.focus()
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeDropdown()
      containerRef.current?.focus()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.min(focusedIndex + 1, filteredOptions.length - 1)
      setFocusedIndex(next)
      optionRefs.current[next]?.scrollIntoView({ block: 'nearest' })
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = Math.max(focusedIndex - 1, 0)
      setFocusedIndex(prev)
      optionRefs.current[prev]?.scrollIntoView({ block: 'nearest' })
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0].value)
      } else if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[focusedIndex].value)
      }
    }
  }

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) openDropdown()
    }
    if (e.key === 'Escape' && isOpen) closeDropdown()
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        ref={containerRef}
        id={id}
        type="button"
        onClick={() => { if (disabled) return; isOpen ? closeDropdown() : openDropdown() }}
        onKeyDown={handleTriggerKeyDown}
        className={`
            w-full flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-left transition-all shadow-sm
            ${
              error
                ? 'border-red-500 focus:ring-red-200'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-primary/50 focus:border-primary'
            }
            ${disabled ? 'bg-gray-50 dark:bg-gray-900 cursor-not-allowed opacity-70' : 'cursor-pointer focus:ring-2'}
        `}
      >
        <span
          className={`flex items-center gap-2 truncate ${!selectedOption ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}
        >
          {selectedOption?.icon && (
            <selectedOption.icon size={16} className="text-gray-500 dark:text-gray-400" />
          )}
          <span className="text-sm font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        {isLoading ? (
          <Loader2 size={16} className="text-gray-400 animate-spin" />
        ) : (
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`select-dropdown-portal absolute z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-100 origin-top ${dropdownClassName}`}
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
          >
            {/* Search input — hidden while loading */}
            {!isLoading && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div className="p-1 max-h-52 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">
                  No results for "{query}"
                </div>
              ) : filteredOptions.map((option, index) => {
                const isSelected = option.value === value
                const isFocused = index === focusedIndex
                return (
                  <button
                    key={`${index}-${String(option.value)}`}
                    ref={(el) => { optionRefs.current[index] = el }}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`
                              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                              ${
                                isFocused && !isSelected
                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium ring-1 ring-primary/30'
                                  : isSelected
                                    ? 'bg-primary/10 text-gray-900 dark:text-gray-100 font-semibold'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white font-medium'
                              }
                          `}
                  >
                    <div className="flex items-center gap-2.5">
                      {option.icon && (
                        <option.icon
                          size={16}
                          className={isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}
                        />
                      )}
                      {option.label}
                    </div>
                    {isSelected && <Check size={14} className="text-primary-700 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body
        )}

      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}
