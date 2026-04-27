import type { AIModelCatalogEntry } from '@lenserfight/types'
import React, { useMemo, useState } from 'react'

import { useAICatalogModels, useAICatalogProviders, useCatalogProviderKeys } from '../hooks/useAICatalog'

type CatalogFocus = 'all' | 'providers' | 'models'

interface AICatalogShowroomProps {
  embedded?: boolean
  focus?: CatalogFocus
  title?: string
  onModelSelect?: (model: AIModelCatalogEntry) => void
}

function badgeClass(tone: 'neutral' | 'success' | 'warning') {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
  }
  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
  }
  return 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

function supportTone(level: string) {
  if (level === 'runnable') return 'success'
  if (level === 'byok_only') return 'warning'
  return 'neutral'
}

export const AICatalogShowroom: React.FC<AICatalogShowroomProps> = ({
  embedded = false,
  focus = 'all',
  title = 'AI Catalog',
  onModelSelect,
}) => {
  const [providerFilter, setProviderFilter] = useState('all')
  const [capabilityFilter, setCapabilityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [activeModelKey, setActiveModelKey] = useState<string | null>(null)

  const { data: providers = [], isLoading: providersLoading } = useAICatalogProviders()
  const { data: models = [], isLoading: modelsLoading } = useAICatalogModels({
    providerKey: providerFilter === 'all' ? undefined : providerFilter,
    capability: capabilityFilter === 'all' ? undefined : capabilityFilter,
  })
  const { data: keys = [] } = useCatalogProviderKeys()

  const configuredProviders = useMemo(() => new Set(keys.filter((key) => key.isActive).map((key) => key.providerKey)), [keys])

  const capabilities = useMemo(() => {
    const all = new Set<string>()
    models.forEach((model) => model.capabilities.forEach((capability) => all.add(capability)))
    return Array.from(all).sort()
  }, [models])

  const filteredModels = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return models
    return models.filter((model) => {
      const haystack = [
        model.name,
        model.key,
        model.provider_name,
        model.description,
        ...model.use_cases,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [models, search])

  const selectedModels = useMemo(
    () => filteredModels.filter((model) => selectedKeys.includes(`${model.provider_key}/${model.key}`)),
    [filteredModels, selectedKeys]
  )

  const activeModel =
    filteredModels.find((model) => `${model.provider_key}/${model.key}` === activeModelKey) ??
    filteredModels[0] ??
    null

  const shellClass = embedded
    ? 'space-y-6'
    : 'rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900'

  return (
    <div className={shellClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
            Catalog
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            Compare providers, inspect model capabilities, and decide which runtime belongs in a workflow or an agent team.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm lg:w-[360px]">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Providers</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{providers.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Models</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{filteredModels.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search model, provider, use case"
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <select
          value={providerFilter}
          onChange={(event) => setProviderFilter(event.target.value)}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">All providers</option>
          {providers.map((provider) => (
            <option key={provider.key} value={provider.key}>
              {provider.display_name}
            </option>
          ))}
        </select>
        <select
          value={capabilityFilter}
          onChange={(event) => setCapabilityFilter(event.target.value)}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">All capabilities</option>
          {capabilities.map((capability) => (
            <option key={capability} value={capability}>
              {capability}
            </option>
          ))}
        </select>
      </div>

      {(focus === 'all' || focus === 'providers') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Providers</h2>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              {providersLoading ? 'Loading' : `${providers.length} listed`}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => {
              const configured = configuredProviders.has(provider.key)
              return (
                <article
                  key={provider.key}
                  className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {provider.key}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                        {provider.display_name}
                      </h3>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(supportTone(provider.support_level ?? 'catalog_only'))}`}>
                      {provider.support_level ?? 'catalog_only'}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${configured ? badgeClass('success') : badgeClass('neutral')}`}>
                      {configured ? 'Configured' : 'Not configured'}
                    </span>
                    {provider.is_active === false && (
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass('warning')}`}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {String((provider.metadata?.summary as string | undefined) ?? 'Provider metadata is available in the catalog for routing, auth, and capability inspection.')}
                  </p>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {(focus === 'all' || focus === 'models') && (
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Models</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                {modelsLoading ? 'Loading' : `${filteredModels.length} visible`}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {filteredModels.map((model) => {
                const compareKey = `${model.provider_key}/${model.key}`
                const configured = configuredProviders.has(model.provider_key)
                const selected = selectedKeys.includes(compareKey)

                return (
                  <article
                    key={compareKey}
                    className={`rounded-[24px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      activeModelKey === compareKey
                        ? 'border-amber-400 bg-amber-50/50 dark:border-amber-400/60 dark:bg-amber-500/10'
                        : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                          {model.provider_name}
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveModelKey(compareKey)}
                          className="mt-2 text-left text-lg font-semibold text-gray-900 hover:text-amber-700 dark:text-white dark:hover:text-amber-300"
                        >
                          {model.name}
                        </button>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(supportTone(model.support_level))}`}>
                        {model.support_level}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {model.user_summary || model.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${configured ? badgeClass('success') : badgeClass('neutral')}`}>
                        {configured ? 'Key ready' : 'Key missing'}
                      </span>
                      {model.capabilities.slice(0, 4).map((capability) => (
                        <span key={capability} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass('neutral')}`}>
                          {capability}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Context {model.context_window_tokens ? model.context_window_tokens.toLocaleString() : 'n/a'}</span>
                      <span>•</span>
                      <span>{model.supports_streaming ? 'Streaming' : 'Non-streaming'}</span>
                      <span>•</span>
                      <span>{model.supports_tools ? 'Tools' : 'No tools'}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedKeys((current) =>
                            current.includes(compareKey)
                              ? current.filter((value) => value !== compareKey)
                              : current.length >= 3
                                ? [...current.slice(1), compareKey]
                                : [...current, compareKey]
                          )
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          selected
                            ? 'border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                            : 'border-gray-200 text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {selected ? 'Comparing' : 'Compare'}
                      </button>
                      {onModelSelect && (
                        <button
                          type="button"
                          onClick={() => onModelSelect(model)}
                          className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
                        >
                          Use in agent
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Details
              </p>
              {activeModel ? (
                <>
                  <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                    {activeModel.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {activeModel.provider_name} · {activeModel.key}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {activeModel.user_summary || activeModel.description}
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Developer notes</p>
                      <p className="mt-1 leading-6">{activeModel.developer_summary || 'No detailed developer summary yet.'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Recommended use cases</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeModel.use_cases.map((useCase) => (
                          <span key={useCase} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass('neutral')}`}>
                            {useCase}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Pick a model to inspect its modality, tool support, and recommended workflows.
                </p>
              )}
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Compare
                </p>
                <span className="text-xs text-gray-400">{selectedModels.length}/3</span>
              </div>
              {selectedModels.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Add up to three models to compare context, tools, support tier, and provider readiness.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedModels.map((model) => (
                    <div key={`${model.provider_key}/${model.key}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      <p className="font-semibold text-gray-900 dark:text-white">{model.name}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{model.provider_name}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <span>Context</span>
                        <span className="text-right">{model.context_window_tokens?.toLocaleString() ?? 'n/a'}</span>
                        <span>Streaming</span>
                        <span className="text-right">{model.supports_streaming ? 'Yes' : 'No'}</span>
                        <span>Tools</span>
                        <span className="text-right">{model.supports_tools ? 'Yes' : 'No'}</span>
                        <span>Status</span>
                        <span className="text-right">{model.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>
      )}
    </div>
  )
}
