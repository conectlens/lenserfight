import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { chainabitContactUrl } from '../utils/chainabitUrls'

export const ChainabitContactRedirect: React.FC = () => {
  const { i18n } = useTranslation()

  useEffect(() => {
    const target = chainabitContactUrl({
      lang: i18n.language,
      utmMedium: 'redirect',
      utmCampaign: 'arena_contact_redirect',
    })
    window.location.replace(target)
  }, [i18n.language])

  return null
}
