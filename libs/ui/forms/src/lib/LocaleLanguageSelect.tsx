import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Github } from 'lucide-react'
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

/** Premium background loader for list items shown for incomplete languages. */
const SelectListItemLoader: React.FC<{ active: boolean; isSelected: boolean }> = ({
  active,
  isSelected,
}) => (
  <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden pointer-events-none">
    <div
      className={[
        'h-full transition-all duration-1000 animate-[shimmer_2s_infinite]',
        active
          ? 'bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0'
          : 'bg-gradient-to-r from-gray-400/0 via-gray-400/20 to-gray-400/0',
      ].join(' ')}
      style={{ backgroundSize: '200% 100%', width: '100%' }}
    />
    <div
      className={[
        'absolute bottom-0 left-3 h-[2px] rounded-full transition-colors',
        active ? 'bg-primary/60' : 'bg-gray-400/30',
      ].join(' ')}
      style={{ width: '40%' }}
    />
  </div>
)

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
        width: Math.max(rect.width, 240),
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
        className="flex h-8 items-center gap-2 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all hover:border-gray-300 dark:hover:border-gray-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SelectedFlag size={14} />
        <span className="tabular-nums uppercase tracking-wide opacity-90">{selected.code}</span>
        <ChevronDown
          size={12}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`absolute z-[9999] bg-white dark:bg-[#121212] rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top ${dropdownClassName ?? ''}`}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="p-1.5 flex flex-col gap-0.5">
              {LOCALES.map((locale) => {
                const active = isActive(locale)
                const incomplete = locale.status !== 'stable'
                const isSelected = locale.code === value
                const Flag = makeFlagIcon(locale.countryCode)
                return (
                  <div key={locale.code} className="relative">
                    <button
                      type="button"
                      onClick={() => handleSelect(locale)}
                      disabled={!active}
                      className={[
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left relative overflow-hidden group',
                        active && isSelected
                          ? 'bg-primary/10 dark:bg-primary-yellow-900/40 text-gray-900 dark:text-white font-semibold'
                          : active
                          ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium'
                          : 'text-gray-400 dark:text-gray-600 cursor-default font-medium',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'transition-transform duration-200 group-hover:scale-110',
                          active ? '' : 'opacity-40 grayscale-[0.5]',
                        ].join(' ')}
                      >
                        <Flag size={18} />
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col leading-tight">
                        <span className={active ? '' : 'opacity-50'}>{locale.nativeName}</span>
                        <span className="text-[10px] opacity-50 font-normal uppercase tracking-wider">
                          {locale.englishName}
                        </span>
                      </span>

                      {active && isSelected && !incomplete && (
                        <Check size={14} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      )}

                      {incomplete && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`${CONTRIBUTION_BASE}#${locale.englishName.toLowerCase()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={`Help translate LenserFight to ${locale.englishName}`}
                            aria-label={`Contribute ${locale.englishName} translation on GitHub`}
                            className={[
                              'flex-shrink-0 p-1 rounded-md transition-all hover:bg-gray-200/50 dark:hover:bg-white/10',
                              active
                                ? 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                : 'text-gray-300 dark:text-gray-700 hover:text-gray-500 dark:hover:text-gray-500',
                            ].join(' ')}
                          >
                            <Github size={14} />
                          </a>
                        </div>
                      )}

                      {incomplete && (
                        <SelectListItemLoader active={active} isSelected={isSelected} />
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
