import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useAICatalogModels } from '@lenserfight/features/generations'
import type { AIModelCatalogEntry, AgentModelProfileRecord } from '@lenserfight/types'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Cpu, Pencil, Star, Trash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { BindModelDrawer } from '../drawers/BindModelDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard } from './_shared'
import { SectionPage } from './SectionPage'

export const ModelsSection: React.FC = () => {
  const { bootstrap, profile, isOwner, agentProfile } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<AgentModelProfileRecord | null>(null)
  const [confirmState, setConfirmState] = useState<{
    title: string
    body: string
    onConfirm: () => void
  } | null>(null)

  const catalogQuery = useAICatalogModels()
  const modelProfiles =
    (bootstrap?.profiles?.models as AgentModelProfileRecord[] | undefined) ?? []

  const isSingleProviderMode = agentProfile?.model_binding_mode === 'single'
  const effectiveProvider = modelProfiles.length > 0 ? modelProfiles[0].provider_key : null

  const sortedModels = useMemo(
    () => [...(catalogQuery.data ?? [])].sort(compareModelsByCost),
    [catalogQuery.data]
  )

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const create = useMutation({
    mutationFn: (model: AIModelCatalogEntry) =>
      agentWorkspaceService.createModelProfile({
        ai_lenser_id: bootstrap!.ai_lenser_id,
        name: `${model.name} profile`,
        provider_key: model.provider_key,
        model_key: model.key,
        model_id: model.id,
        support_level: model.support_level,
        params: { temperature: 0.4, maxTokens: 4096 },
      }),
    onSuccess: () => {
      toast.success('Model profile created')
      invalidate()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const deleteProfile = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteModelProfile(id),
    onSuccess: () => {
      toast.success('Model profile deleted')
      invalidate()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  return (
    <SectionPage
      eyebrow="Models"
      title="Model catalog"
      description="Review every available model, sorted by current list price, then bind the ones that should be available to this AI lenser. Models without pricing remain visible but sort after priced entries."
    >
      {isSingleProviderMode && effectiveProvider && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>
            Single-provider mode active: <span className="font-semibold">{effectiveProvider}</span>. Only models from this provider can be added. Remove all bindings first to switch providers.
          </span>
        </div>
      )}
      {isSingleProviderMode && !effectiveProvider && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>
            Single-provider mode: the first model you bind will lock this agent to that provider.
          </span>
        </div>
      )}

      <ProfileCard
        title="Catalog"
        subtitle="This is the catalog view for the selected AI lenser. Bind from here instead of jumping to the global showroom."
      >
        {catalogQuery.isLoading ? (
          <CenteredLoader label="Loading models..." />
        ) : catalogQuery.isError ? (
          <EmptyPanel
            icon={<Cpu size={20} />}
            title="Models failed to load"
            description={
              catalogQuery.error instanceof Error
                ? catalogQuery.error.message
                : 'The AI catalog request failed.'
            }
          />
        ) : sortedModels.length === 0 ? (
          <EmptyPanel
            icon={<Cpu size={20} />}
            title="No models available"
            description="The catalog RPC returned no active models. Check the provider and pricing seed state before relying on this page."
          />
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Support</th>
                  {isOwner && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900">
                {sortedModels.map((model) => (
                  <tr key={model.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {model.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {model.key}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {model.provider_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {formatModelPricing(model)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {model.support_level}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3">
                        {isSingleProviderMode && effectiveProvider && model.provider_key !== effectiveProvider ? (
                          <span className="text-xs text-gray-400 dark:text-gray-600" title={`Only ${effectiveProvider} models allowed`}>
                            Locked
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => bootstrap && create.mutate(model)}
                            disabled={!bootstrap || create.isPending}
                            className="rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
                          >
                            Bind model
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ProfileCard>

      {modelProfiles.length === 0 ? (
        <EmptyPanel
          icon={<Star size={20} />}
          title="No bound model profiles yet"
          description="Bind at least one model from the catalog above so the selected AI lenser has an explicit runtime default and fallback set."
        />
      ) : (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Bound model profiles
          </p>
          <div className="overflow-x-auto rounded-[24px] border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Temp</th>
                  <th className="px-4 py-3">Default</th>
                  {isOwner && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900">
                {modelProfiles.map((modelProfile) => (
                  <tr key={modelProfile.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {modelProfile.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {modelProfile.model_key ?? modelProfile.model_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {modelProfile.provider_key ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {(modelProfile.params?.temperature as number | undefined) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {modelProfile.is_default && (
                        <Star
                          size={14}
                          className="text-amber-500"
                          aria-label="Default model"
                        />
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditTarget(modelProfile)}
                            aria-label="Edit model profile"
                            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                title: 'Delete model profile?',
                                body: `Delete "${modelProfile.name}"? This cannot be undone.`,
                                onConfirm: () => deleteProfile.mutate(modelProfile.id),
                              })
                            }
                            aria-label="Delete model profile"
                            className="rounded-xl p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editTarget && (
        <BindModelDrawer
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          profile={editTarget}
          onSaved={() => {
            invalidate()
            setEditTarget(null)
          }}
        />
      )}

      <AlertDialog
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title ?? ''}
        bodyText={confirmState?.body}
        variant="destructive"
        confirmAction={{
          label: 'Delete',
          onClick: () => {
            confirmState?.onConfirm()
            setConfirmState(null)
          },
          loading: deleteProfile.isPending,
        }}
      />
    </SectionPage>
  )
}

function compareModelsByCost(left: AIModelCatalogEntry, right: AIModelCatalogEntry) {
  const leftScore = modelCostScore(left)
  const rightScore = modelCostScore(right)

  if (leftScore === null && rightScore === null) {
    return left.name.localeCompare(right.name)
  }
  if (leftScore === null) return 1
  if (rightScore === null) return -1
  if (leftScore !== rightScore) return leftScore - rightScore
  return left.name.localeCompare(right.name)
}

function modelCostScore(model: AIModelCatalogEntry): number | null {
  if (model.unit_type && model.unit_type !== 'tokens') {
    return model.cost_per_unit
  }
  if (
    model.input_cost_per_1k_tokens === null &&
    model.output_cost_per_1k_tokens === null
  ) {
    return null
  }
  return (
    (model.input_cost_per_1k_tokens ?? 0) +
    (model.output_cost_per_1k_tokens ?? 0)
  )
}

function formatModelPricing(model: AIModelCatalogEntry): string {
  if (model.unit_type && model.unit_type !== 'tokens') {
    return model.cost_per_unit !== null
      ? `$${model.cost_per_unit.toFixed(4)} / ${model.unit_type}`
      : 'Pricing unavailable'
  }

  if (
    model.input_cost_per_1k_tokens === null &&
    model.output_cost_per_1k_tokens === null
  ) {
    return 'Pricing unavailable'
  }

  const input = model.input_cost_per_1k_tokens?.toFixed(4) ?? '0.0000'
  const output = model.output_cost_per_1k_tokens?.toFixed(4) ?? '0.0000'
  return `$${input} in / $${output} out`
}

const CenteredLoader: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
    {label}
  </div>
)
