import React, { useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MarkdownRenderer } from '../utils/MarkdownRenderer'

const VALID_POLICIES = ['terms', 'privacy', 'cookies', 'acceptable-use'] as const
type PolicySlug = (typeof VALID_POLICIES)[number]

// Vite glob: load all policy markdowns as raw strings
const policyModules = import.meta.glob(
  '../locales/*/policies/*.md',
  { query: '?raw', import: 'default', eager: false }
)

function resolveModuleKey(lang: string, policy: string): string {
  return `../locales/${lang}/policies/${policy}.md`
}

export const PoliciesPage: React.FC = () => {
  const { policy } = useParams<{ policy: string }>()
  const { i18n } = useTranslation()
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const lang = i18n.language?.slice(0, 2) ?? 'en'
  const validLangs = ['en', 'tr']
  const resolvedLang = validLangs.includes(lang) ? lang : 'en'

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

    tryLoad(resolvedLang)
      .then(ok => { if (!ok) return tryLoad('en') })
      .then(ok => { if (!ok) setLoading(false) })
      .catch(() => setLoading(false))
  }, [policy, resolvedLang])

  if (!policy || !VALID_POLICIES.includes(policy as PolicySlug)) {
    return <Navigate to="/policies/terms" replace />
  }

  return (
    <div className="py-6">
      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-4/6" />
        </div>
      )}
      {!loading && content && (
        <MarkdownRenderer content={content} />
      )}
      {!loading && !content && (
        <p className="text-gray-500 dark:text-gray-400">Policy content not available.</p>
      )}
    </div>
  )
}
