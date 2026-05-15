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
                  <span>{opt.nativeName}</span>
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

  return (
    <label htmlFor={id} className={className}>
      <span className="sr-only">{label}</span>
      <select
        id={id}
        value={locale}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          selectLocale(e.target.value as LocaleCode)
        }
        className="cursor-pointer rounded-md border border-foreground/10 bg-transparent px-2 py-1 text-sm text-foreground/80 transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
      >
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.nativeName}
          </option>
        ))}
      </select>
    </label>
  )
}
