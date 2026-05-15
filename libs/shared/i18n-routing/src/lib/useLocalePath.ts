import { withLocale } from '@lenserfight/utils/locale'
import { useLocale } from './useLocale'

export function useLocalePath(path: string): string {
  const { locale } = useLocale()
  return withLocale(path, locale)
}
