import { useAuth } from '@lenserfight/features/auth'
import { Button } from '@lenserfight/ui/components'
import { sanitizeReturnUrl } from '@lenserfight/utils/dom'
import { ShieldOff } from 'lucide-react'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

export const NotAuthorizedPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading } = useAuth()

  const returnUrl = sanitizeReturnUrl(searchParams.get('return_url'))
  const isSafeReturnUrl =
    returnUrl &&
    returnUrl !== '/' &&
    !returnUrl.includes('/not-authorized')

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated && isSafeReturnUrl) {
      navigate(returnUrl, { replace: true })
    }
  }, [isAuthenticated, isLoading, isSafeReturnUrl, returnUrl, navigate])

  const loginHref =
    isSafeReturnUrl
      ? `/auth/login?return_url=${encodeURIComponent(returnUrl)}`
      : '/auth/login'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised mb-6">
        <ShieldOff size={28} className="text-greyscale-400" />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 mb-2">
        {t('auth.notAuthorized.title')}
      </h1>
      <p className="text-sm text-greyscale-500 dark:text-greyscale-400 max-w-sm mb-8">
        {t('auth.notAuthorized.message')}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          {t('auth.notAuthorized.goBack')}
        </Button>
        <Button onClick={() => navigate(loginHref)} className="w-auto">
          {t('auth.notAuthorized.signIn')}
        </Button>
      </div>
    </div>
  )
}
