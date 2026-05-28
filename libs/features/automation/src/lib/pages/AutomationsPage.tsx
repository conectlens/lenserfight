import React from 'react'
import { Plug, BookOpen } from 'lucide-react'
import { Loader, PageHeader, SEOHead } from '@lenserfight/ui/components'

import { RuleCard } from '../components/RuleCard'
import { RuleEmptyState } from '../components/RuleEmptyState'
import { useAutomationRules } from '../hooks/query/useAutomationRules'
import { useRuleDispatchHistory } from '../hooks/query/useRuleDispatchHistory'

const DOCS_HREF = '/docs/how-to/automation/build-your-first-trigger'

export function AutomationsPage() {
  const rulesQuery = useAutomationRules()
  const historyQuery = useRuleDispatchHistory()

  const rules = rulesQuery.data ?? []
  const history = historyQuery.data

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <SEOHead type="default" overrideTitle="Automations" />

      <PageHeader
        title="Automations"
        description="Trigger rules listen for events like battle.finalized and dispatch a workflow, webhook, or notification."
        action={
          <a
            href={DOCS_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-2xl bg-primary text-greyscale-900 hover:bg-primary-yellow-400 active:bg-primary-yellow-500 transition-all duration-150 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-400/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-greyscale-900"
            aria-label="Create rule — opens automation guide in a new tab"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>Create rule</span>
          </a>
        }
      />

      {rulesQuery.isLoading && (
        <div className="rounded-2xl border border-surface-border py-12">
          <Loader variant="inline" message="Loading automations…" />
        </div>
      )}

      {rulesQuery.isError && !rulesQuery.isLoading && (
        <div
          role="alert"
          className="rounded-2xl border border-status-red/40 bg-status-red/5 p-5 text-sm text-status-red"
        >
          Failed to load automation rules. Try refreshing the page.
        </div>
      )}

      {!rulesQuery.isLoading && !rulesQuery.isError && rules.length === 0 && (
        <RuleEmptyState docsHref={DOCS_HREF} />
      )}

      {!rulesQuery.isLoading && rules.length > 0 && (
        <section
          aria-label="Automation rules"
          className="space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-greyscale-500">
            <span className="inline-flex items-center gap-1.5">
              <Plug size={14} aria-hidden="true" />
              {rules.length} rule{rules.length === 1 ? '' : 's'}
            </span>
            {historyQuery.isLoading && <span>Loading dispatch history…</span>}
          </div>

          <div className="space-y-3">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                summary={history?.get(rule.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
