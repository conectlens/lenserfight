import { seoService } from '@lenserfight/data/repositories'
import { PageHeader } from '@lenserfight/ui/components'
import { PageMeta } from '@lenserfight/ui/layout'
import { FEATURES } from '@lenserfight/utils/env'
import { Sparkles } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { WorkflowCard } from '../components/WorkflowCard'
import { useForkWorkflow } from '../hooks/useForkWorkflow'
import { useTemplateWorkflows } from '../hooks/useTemplateWorkflows'

export function WorkflowTemplateGalleryPage() {
  const navigate = useNavigate()
  const { data: templates = [], isLoading } = useTemplateWorkflows(24)
  const fork = useForkWorkflow()

  if (!FEATURES.AGENTS) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Sparkles size={32} className="text-gray-400" />
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Workflow templates require the Agents feature.
        </p>
        <p className="text-sm text-gray-500">
          Enable <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">FEATURE_AGENTS=true</code> to access templates.
        </p>
      </div>
    )
  }

  async function handleUseTemplate(templateId: string) {
    const workflow = await fork.mutateAsync(templateId)
    navigate(`/workflows/manage?id=${workflow.id}`)
  }

  const wfTplMeta = seoService.getWorkflowTemplatesMeta()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageMeta title={wfTplMeta.title} description={wfTplMeta.description} />
      <PageHeader
        title="Workflow Templates"
        description="Start from a curated template — fork it to your workspace and customise freely."
        icon={<Sparkles size={20} />}
      />

      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Sparkles size={24} className="text-gray-400" />
          <p className="text-gray-500">No templates available yet.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="relative">
              <WorkflowCard
                workflow={template as unknown as Parameters<typeof WorkflowCard>[0]['workflow']}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={fork.isPending}
                  onClick={() => handleUseTemplate(template.id)}
                  className="rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  Use template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
