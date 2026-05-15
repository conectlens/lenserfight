import {
  DEFAULT_LOCALE,
  isLocaleCode,
  isLocaleEnabled,
  type LocaleCode,
} from '@lenserfight/utils/locale'

export interface ResolverInput {
  profileLocale?: string | null
  cookieValue?: string | null
  storageValue?: string | null
  navigatorLanguage?: string | null
}

function accept(value: string | null | undefined): LocaleCode | null {
  if (!value) return null
  if (isLocaleCode(value) && isLocaleEnabled(value)) return value
  return null
}

function fromNavigator(language: string | null | undefined): LocaleCode | null {
  if (!language) return null
  const short = language.split('-')[0]
  return accept(short)
}

export function resolveInitialLocale(input: ResolverInput): LocaleCode {
  return (
    accept(input.profileLocale) ??
    accept(input.cookieValue) ??
    accept(input.storageValue) ??
    fromNavigator(input.navigatorLanguage) ??
    DEFAULT_LOCALE
  )
}
