import { Card } from '@lenserfight/ui/components'
import { useLocale } from '@lenserfight/shared/i18n-routing'
import { DEFAULT_LOCALE } from '@lenserfight/utils/locale'
import React, { useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'

import { MarkdownRenderer } from '../utils/MarkdownRenderer'

const VALID_POLICIES = ['terms', 'privacy', 'cookies', 'acceptable-use'] as const
type PolicySlug = (typeof VALID_POLICIES)[number]

// Vite glob: load all policy markdowns as raw strings.
const policyModules = import.meta.glob(
  '../locales/*/policies/*.md',
  { query: '?raw', import: 'default', eager: false }
)

function resolveModuleKey(lang: string, policy: string): string {
  return `../locales/${lang}/policies/${policy}.md`
}

export const PoliciesPage: React.FC = () => {
  const { policy } = useParams<{ policy: string }>()
  const { locale } = useLocale()
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!policy || !VALID_POLICIES.includes(policy as PolicySlug)) return

    setLoading(true)
    setContent(null)

    const tryLoad = async (l: string) => {
      const key = resolveModuleKey(l, policy)
      const loader = policyModules[key]
      if (loader) {
        const raw = await loader() as string
        setContent(raw)
        setLoading(false)
        return true
      }
      return false
    }

    tryLoad(locale)
      .then(ok => { if (!ok && locale !== DEFAULT_LOCALE) return tryLoad(DEFAULT_LOCALE) })
      .then(ok => { if (!ok) setLoading(false) })
      .catch(() => setLoading(false))
  }, [policy, locale])

  if (!policy || !VALID_POLICIES.includes(policy as PolicySlug)) {
    return <Navigate to={`/${locale}/policies/terms`} replace />
  }

  return (
    <div className="space-y-6">
      {loading && (
        <Card className="animate-pulse space-y-4 p-6">
          <div className="h-8 w-1/3 rounded bg-surface-raised" />
          <div className="h-4 w-full rounded bg-surface-raised" />
          <div className="h-4 w-5/6 rounded bg-surface-raised" />
          <div className="h-4 w-4/6 rounded bg-surface-raised" />
        </Card>
      )}
      {!loading && content && (
        <Card className="p-6">
          <MarkdownRenderer content={content} />
        </Card>
      )}
      {!loading && !content && (
        <Card className="p-6">
          <p className="text-greyscale-500 dark:text-greyscale-400">Policy content not available.</p>
        </Card>
      )}
    </div>
  )
}
