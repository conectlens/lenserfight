import { ChevronDown, Check, Loader2 } from 'lucide-react'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface Option {
  value: string
  label: string
  icon?: React.ElementType
}

interface SelectFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  error?: string
  disabled?: boolean
  isLoading?: boolean
  className?: string
  required?: boolean
  dropdownClassName?: string
  onOpen?: () => void
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  disabled,
  isLoading,
  className = '',
  required,
  dropdownClassName = '',
  onOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [typeaheadBuffer, setTypeaheadBuffer] = useState('')
  const containerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Portal positioning
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const selectedOption = options.find((o) => o.value === value)

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
    const currentIndex = options.findIndex((o) => o.value === value)
    setFocusedIndex(currentIndex)
    setIsOpen(true)
  }, [onOpen, options, value])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setFocusedIndex(-1)
    setTypeaheadBuffer('')
    if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current)
  }, [])

  const scrollOptionIntoView = (index: number) => {
    optionRefs.current[index]?.scrollIntoView({ block: 'nearest' })
  }

  // Prevent modal from scrolling when mouse wheel is used over the dropdown.
  // Without this, wheel events fall through to the modal, fire a scroll event,
  // and our capture-phase listener below closes the dropdown.
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return
    const el = dropdownRef.current

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight > clientHeight) {
        el.scrollTop = Math.max(0, Math.min(scrollTop + e.deltaY, scrollHeight - clientHeight))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [isOpen])

  // Close on outside click and scroll
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

  const toggleOpen = () => {
    if (disabled) return
    if (isOpen) {
      closeDropdown()
    } else {
      openDropdown()
    }
  }

  const handleSelect = (val: string) => {
    if (val !== value) onChange(val)
    closeDropdown()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === 'Escape') {
      closeDropdown()
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isOpen && focusedIndex >= 0 && focusedIndex < options.length) {
        handleSelect(options[focusedIndex].value)
      } else {
        toggleOpen()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) { openDropdown(); return }
      const next = Math.min(focusedIndex + 1, options.length - 1)
      setFocusedIndex(next)
      scrollOptionIntoView(next)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) { openDropdown(); return }
      const prev = Math.max(focusedIndex - 1, 0)
      setFocusedIndex(prev)
      scrollOptionIntoView(prev)
      return
    }

    // Typeahead: printable single character
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()

      const newBuffer = typeaheadBuffer + e.key.toLowerCase()
      setTypeaheadBuffer(newBuffer)

      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current)
      typeaheadTimerRef.current = setTimeout(() => setTypeaheadBuffer(''), 600)

      const matchIndex = options.findIndex((o) => o.label.toLowerCase().startsWith(newBuffer))
      if (matchIndex !== -1) {
        if (!isOpen) openDropdown()
        setFocusedIndex(matchIndex)
        // Defer scroll until after dropdown renders
        requestAnimationFrame(() => scrollOptionIntoView(matchIndex))
      }
    }
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
        type="button"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
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
            className={`select-dropdown-portal absolute z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 origin-top ${dropdownClassName}`}
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
            }}
          >
            <div className="p-1">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                </div>
              ) : options.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">
                  No options available
                </div>
              ) : options.map((option, index) => {
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
                          className={
                            isSelected
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-500'
                          }
                        />
                      )}
                      {option.label}
                    </div>
                    {isSelected && <Check size={14} className="text-primary-700" />}
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
