import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Github, Loader2 } from 'lucide-react'
import {
  LOCALES,
  type LocaleCode,
  type LocaleDefinition,
} from '@lenserfight/utils/locale'
import { makeFlagIcon } from './FlagIcon'

const CONTRIBUTION_BASE = 'https://github.com/conectlens/lenserfight/blob/main/docs/en/how-to/contributors/adding-a-language.md'

export interface LocaleLanguageSelectProps {
  value: LocaleCode
  onChange: (next: LocaleCode) => void
  label?: string
  className?: string
  dropdownClassName?: string
  disabled?: boolean
}

function isActive(l: LocaleDefinition): boolean {
  return l.status === 'stable' || l.status === 'wip'
}

export const LocaleLanguageSelect: React.FC<LocaleLanguageSelectProps> = ({
  value,
  onChange,
  label = 'Language',
  className,
  dropdownClassName,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selected = LOCALES.find((l) => l.code === value) ?? LOCALES[0]

  const openDropdown = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 220),
      })
    }
    setIsOpen(true)
  }, [])

  const closeDropdown = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (dropdownRef.current?.contains(e.target as Node)) return
      closeDropdown()
    }
    const onScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return
      closeDropdown()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, { capture: true })
    window.addEventListener('resize', closeDropdown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', closeDropdown)
    }
  }, [isOpen, closeDropdown])

  const handleSelect = (locale: LocaleDefinition) => {
    if (!isActive(locale)) return
    if (locale.code !== value) onChange(locale.code as LocaleCode)
    closeDropdown()
  }

  const SelectedFlag = makeFlagIcon(selected.countryCode)

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (disabled ? undefined : isOpen ? closeDropdown() : openDropdown())}
        disabled={disabled}
        aria-label={label}
        title={label}
        className="flex h-7 items-center gap-1.5 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SelectedFlag size={14} />
        <span className="tabular-nums uppercase tracking-wide">{selected.code}</span>
        <ChevronDown
          size={11}
          className={`text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`absolute z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top ${dropdownClassName ?? ''}`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="p-1">
              {LOCALES.map((locale) => {
                const active = isActive(locale)
                const isSelected = locale.code === value
                const Flag = makeFlagIcon(locale.countryCode)
                return (
                  <div key={locale.code} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleSelect(locale)}
                      disabled={!active}
                      className={[
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                        active && isSelected
                          ? 'bg-primary/10 text-gray-900 dark:text-gray-100 font-semibold'
                          : active
                          ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white font-medium'
                          : 'text-gray-300 dark:text-gray-600 cursor-default font-medium',
                      ].join(' ')}
                    >
                      <span className={active ? '' : 'opacity-40'}>
                        <Flag size={16} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={active ? '' : 'opacity-40'}>{locale.nativeName}</span>
                        {!active && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                            <Loader2 size={10} className="animate-spin opacity-60" />
                            coming soon
                          </span>
                        )}
                      </span>
                      {active && isSelected && (
                        <Check size={13} className="text-primary-700 flex-shrink-0" />
                      )}
                      {!active && (
                        <a
                          href={`${CONTRIBUTION_BASE}#${locale.englishName.toLowerCase()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={`Help translate LenserFight to ${locale.englishName}`}
                          aria-label={`Contribute ${locale.englishName} translation on GitHub`}
                          className="flex-shrink-0 p-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <Github size={13} />
                        </a>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
