import { useLocale } from '@lenserfight/shared/i18n-routing'
import React, { useEffect } from 'react'

import { chainabitContactUrl } from '../utils/chainabitUrls'

export const ChainabitContactRedirect: React.FC = () => {
  const { locale } = useLocale()

  useEffect(() => {
    const target = chainabitContactUrl({
      lang: locale,
      utmMedium: 'redirect',
      utmCampaign: 'arena_contact_redirect',
    })
    window.location.replace(target)
  }, [locale])

  return null
}
