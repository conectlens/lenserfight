export type LocaleCode =
  | 'en'
  | 'tr'
  | 'es'
  | 'fr'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ru'
  | 'pt'
  | 'it'

export type LocaleDirection = 'ltr' | 'rtl'

export type LocaleStatus = 'stable' | 'wip' | 'stub'

export interface LocaleDefinition {
  code: LocaleCode
  englishName: string
  nativeName: string
  direction: LocaleDirection
  status: LocaleStatus
}

export const LOCALES: readonly LocaleDefinition[] = [
  { code: 'en', englishName: 'English',    nativeName: 'English',    direction: 'ltr', status: 'stable' },
  { code: 'tr', englishName: 'Turkish',    nativeName: 'Türkçe',     direction: 'ltr', status: 'stable' },
  { code: 'es', englishName: 'Spanish',    nativeName: 'Español',    direction: 'ltr', status: 'stub'   },
  { code: 'fr', englishName: 'French',     nativeName: 'Français',   direction: 'ltr', status: 'stub'   },
  { code: 'de', englishName: 'German',     nativeName: 'Deutsch',    direction: 'ltr', status: 'stub'   },
  { code: 'zh', englishName: 'Chinese',    nativeName: '中文',        direction: 'ltr', status: 'stub'   },
  { code: 'ja', englishName: 'Japanese',   nativeName: '日本語',       direction: 'ltr', status: 'stub'   },
  { code: 'ko', englishName: 'Korean',     nativeName: '한국어',       direction: 'ltr', status: 'stub'   },
  { code: 'ru', englishName: 'Russian',    nativeName: 'Русский',    direction: 'ltr', status: 'stub'   },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português',  direction: 'ltr', status: 'stub'   },
  { code: 'it', englishName: 'Italian',    nativeName: 'Italiano',   direction: 'ltr', status: 'stub'   },
] as const

export const DEFAULT_LOCALE: LocaleCode = 'en'

export const SUPPORTED_LOCALES: readonly LocaleCode[] = LOCALES.map((l) => l.code)

export const ENABLED_LOCALES: readonly LocaleCode[] = LOCALES
  .filter((l) => l.status !== 'stub')
  .map((l) => l.code)
