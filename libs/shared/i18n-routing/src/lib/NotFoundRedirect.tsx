import { Navigate, useParams } from 'react-router-dom'
import { DEFAULT_LOCALE, isLocaleCode } from '@lenserfight/utils/locale'

export function NotFoundRedirect() {
  const { lang } = useParams<{ lang: string }>()
  const target = isLocaleCode(lang) ? `/${lang}` : `/${DEFAULT_LOCALE}`
  return <Navigate to={target} replace />
}
