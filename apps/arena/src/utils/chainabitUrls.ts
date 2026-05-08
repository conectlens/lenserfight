const CHAINABIT_SITE = 'https://chainabit.com'

const SUPPORTED_LANG_SHORTS = new Set(['en', 'tr'])

function normalizeLang(lang?: string | null): string | null {
  if (!lang) return null
  const short = lang.slice(0, 2).toLowerCase()
  return SUPPORTED_LANG_SHORTS.has(short) ? short : null
}

export interface ChainabitContactOptions {
  lang?: string | null
  utmMedium?: string
  utmCampaign?: string
}

export function chainabitContactUrl({
  lang,
  utmMedium = 'referral',
  utmCampaign = 'arena_contact',
}: ChainabitContactOptions = {}): string {
  const short = normalizeLang(lang)
  const base = short ? `${CHAINABIT_SITE}/${short}/contact` : `${CHAINABIT_SITE}/contact`
  const params = new URLSearchParams({
    utm_source: 'lenserfight',
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
  })
  return `${base}?${params.toString()}`
}
