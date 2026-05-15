import { useId, type ChangeEvent } from 'react'
import {
  ENABLED_LOCALES,
  LOCALES,
  type LocaleCode,
} from '@lenserfight/utils/locale'
import { useLocale } from './useLocale'

export interface LocaleSelectProps {
  variant?: 'select' | 'inline'
  className?: string
  onChange?: (next: LocaleCode, previous: LocaleCode) => void
  /** Visually hidden label for assistive tech. */
  label?: string
}

const enabledDefinitions = () =>
  LOCALES.filter((l) => (ENABLED_LOCALES as readonly string[]).includes(l.code))

function countryCodeToFlag(countryCode: string): string {
  const upper = (countryCode ?? '').toUpperCase()
  if (upper.length !== 2) return ''
  const A = 0x41
  const REGIONAL_A = 0x1f1e6
  const a = upper.charCodeAt(0)
  const b = upper.charCodeAt(1)
  if (a < A || a > A + 25 || b < A || b > A + 25) return ''
  return (
    String.fromCodePoint(REGIONAL_A + (a - A)) +
    String.fromCodePoint(REGIONAL_A + (b - A))
  )
}

export function LocaleSelect({
  variant = 'select',
  className,
  onChange,
  label = 'Language',
}: LocaleSelectProps) {
  const { locale, setLocale } = useLocale()
  const id = useId()
  const options = enabledDefinitions()

  function selectLocale(next: LocaleCode) {
    if (next === locale) return
    onChange?.(next, locale)
    setLocale(next)
  }

  if (variant === 'inline') {
    return (
      <div className={className} role="group" aria-label={label}>
        <ul className="flex flex-col gap-1">
          {options.map((opt) => {
            const isActive = opt.code === locale
            return (
              <li key={opt.code}>
                <button
                  type="button"
                  onClick={() => selectLocale(opt.code)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? 'bg-foreground/5 text-foreground'
                      : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-base leading-none">
                      {countryCodeToFlag(opt.countryCode)}
                    </span>
                    <span>{opt.nativeName}</span>
                  </span>
                  <span className="text-xs uppercase tracking-wide text-foreground/40">
                    {opt.code}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  const active = options.find((o) => o.code === locale)
  return (
    <label htmlFor={id} className={`relative inline-flex items-center ${className ?? ''}`}>
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2 text-base leading-none"
      >
        {active ? countryCodeToFlag(active.countryCode) : ''}
      </span>
      <select
        id={id}
        value={locale}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          selectLocale(e.target.value as LocaleCode)
        }
        className="cursor-pointer appearance-none rounded-md border border-foreground/10 bg-transparent pl-8 pr-2 py-1 text-sm text-foreground/80 transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
      >
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {countryCodeToFlag(opt.countryCode)} {opt.nativeName}
          </option>
        ))}
      </select>
    </label>
  )
}
