import { createContext } from 'react'
import { DEFAULT_LOCALE, type LocaleCode } from '@lenserfight/utils/locale'

export interface LocaleContextValue {
  locale: LocaleCode
  setLocale: (next: LocaleCode) => void
  isHydrated: boolean
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {
    // no-op default; LocaleProvider replaces it
  },
  isHydrated: false,
})
