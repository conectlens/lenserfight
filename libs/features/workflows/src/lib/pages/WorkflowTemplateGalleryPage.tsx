import { seoService } from '@lenserfight/data/repositories'
import { Button, PageHeader } from '@lenserfight/ui/components'
import { PageMeta } from '@lenserfight/ui/layout'
import { Search, Sparkles } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { WorkflowCard } from '../components/WorkflowCard'
import { useTemplateWorkflows } from '../hooks/useTemplateWorkflows'

const CATEGORY_FILTERS = [
  'text',
  'image',
  'research',
  'transform',
  'orchestration',
  'validation',
  'code',
  'data',
] as const

export function WorkflowTemplateGalleryPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const { data: templates = [], isLoading } = useTemplateWorkflows({
    limit: 24,
    search,
    category,
  })

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  function handleUseTemplate(templateId: string) {
    navigate(`/workflows/manage?template_id=${templateId}`)
  }

  const wfTplMeta = seoService.getWorkflowTemplatesMeta()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageMeta title={wfTplMeta.title} description={wfTplMeta.description} />
      <PageHeader
        title="Workflow Templates"
        description="Start from a curated template and customise the fork in your workspace."
        icon={<Sparkles size={20} />}
      />

      <div className="mt-6 flex flex-col gap-3 border-b border-surface-border pb-4">
        <label className="relative block max-w-xl">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-greyscale-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search templates"
            className="h-10 w-full rounded-lg border border-surface-border bg-surface-base pl-9 pr-3 text-sm text-surface-text outline-none transition focus:border-primary-yellow-500"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              category === null
                ? 'border-primary-yellow-500 bg-primary-yellow-500/10 text-primary-yellow-700'
                : 'border-surface-border text-greyscale-500 hover:bg-surface-raised'
            }`}
          >
            All
          </button>
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setCategory((current) => current === filter ? null : filter)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
                category === filter
                  ? 'border-primary-yellow-500 bg-primary-yellow-500/10 text-primary-yellow-700'
                  : 'border-surface-border text-greyscale-500 hover:bg-surface-raised'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Sparkles size={24} className="text-gray-400" />
          <p className="text-gray-500">No templates match that filter.</p>
          {(search || category) && (
            <Button size="sm" variant="secondary" onClick={() => { setSearchInput(''); setSearch(''); setCategory(null) }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="relative">
              <WorkflowCard
                workflow={template as unknown as Parameters<typeof WorkflowCard>[0]['workflow']}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-greyscale-500">
                  {template.executions_30d ?? 0} runs in 30d
                </span>
                <button
                  type="button"
                  onClick={() => handleUseTemplate(template.id)}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
                >
                  Use this template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
