import React, { useMemo } from 'react'
import {
  ENABLED_LOCALES,
  LOCALES,
  type LocaleCode,
} from '@lenserfight/utils/locale'
import { SelectField, type Option } from './SelectField'
import { makeFlagIcon } from './FlagIcon'

export interface LocaleLanguageSelectProps {
  value: LocaleCode
  onChange: (next: LocaleCode) => void
  /** Visually hidden label for assistive tech. */
  label?: string
  /** Show only locales whose status is not `stub`. Defaults to true. */
  enabledOnly?: boolean
  /** Display style for each option: native name (default), English name, or code. */
  optionLabel?: 'native' | 'english' | 'code'
  /** Hide the trailing language code badge inside the trigger area. */
  hideTriggerLabel?: boolean
  className?: string
  dropdownClassName?: string
  disabled?: boolean
}

/**
 * Country-flag language selector built on the shared `SelectField`.
 *
 * Layer placement: lives in `layer:ui` because it composes `SelectField`.
 * Apps wire it to a locale store (`useLocale`) by passing `value` / `onChange`.
 */
export const LocaleLanguageSelect: React.FC<LocaleLanguageSelectProps> = ({
  value,
  onChange,
  label = 'Language',
  enabledOnly = true,
  optionLabel = 'native',
  className,
  dropdownClassName,
  disabled,
}) => {
  const options: Option[] = useMemo(() => {
    const list = enabledOnly
      ? LOCALES.filter((l) => (ENABLED_LOCALES as readonly string[]).includes(l.code))
      : LOCALES
    return list.map((l) => ({
      value: l.code,
      label:
        optionLabel === 'english'
          ? l.englishName
          : optionLabel === 'code'
            ? l.code.toUpperCase()
            : l.nativeName,
      icon: makeFlagIcon(l.countryCode),
    }))
  }, [enabledOnly, optionLabel])

  return (
    <SelectField
      value={value}
      onChange={(v) => onChange(v as LocaleCode)}
      options={options}
      className={className}
      dropdownClassName={dropdownClassName}
      disabled={disabled}
      placeholder={label}
    />
  )
}
