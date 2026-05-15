import { useContext } from 'react'
import { isLocaleCode, isLocaleEnabled, type LocaleCode } from '@lenserfight/utils/locale'
import { LocaleContext } from './LocaleContext'

export interface UseLocaleResult {
  locale: LocaleCode
  setLocale: (next: LocaleCode) => void
  isHydrated: boolean
  isSupported: (code: string) => code is LocaleCode
  isEnabled: (code: LocaleCode) => boolean
}

export function useLocale(): UseLocaleResult {
  const { locale, setLocale, isHydrated } = useContext(LocaleContext)
  return {
    locale,
    setLocale,
    isHydrated,
    isSupported: isLocaleCode,
    isEnabled: isLocaleEnabled,
  }
}
