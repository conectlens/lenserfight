import { PolicyLayout } from '@lenserfight/ui/layout'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useParams } from 'react-router-dom'

const POLICY_KEYS: Record<string, string> = {
  terms: 'terms',
  privacy: 'privacy',
  cookies: 'cookies',
  'acceptable-use': 'acceptableUse',
}

export const PolicyLayoutWrapper: React.FC = () => {
  const { policy } = useParams<{ policy: string }>()
  const { t } = useTranslation('forms')
  const key = policy && POLICY_KEYS[policy]
  const title = key ? t(`policies.${key}`) : t('policies.terms')

  return (
    <PolicyLayout title={title}>
      <Outlet />
    </PolicyLayout>
  )
}
