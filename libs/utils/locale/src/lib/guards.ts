import {
  LOCALES,
  ENABLED_LOCALES,
  SUPPORTED_LOCALES,
  type LocaleCode,
  type LocaleDefinition,
} from './locales'

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function isLocaleEnabled(code: LocaleCode): boolean {
  return (ENABLED_LOCALES as readonly string[]).includes(code)
}

export function getLocale(code: LocaleCode): LocaleDefinition {
  const found = LOCALES.find((l) => l.code === code)
  if (!found) {
    throw new Error(`Unknown locale code: ${code}`)
  }
  return found
}

export function getLocaleLabel(code: LocaleCode): string {
  return getLocale(code).nativeName
}
