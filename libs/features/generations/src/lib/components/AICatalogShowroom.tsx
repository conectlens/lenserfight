import type { AIModelCatalogEntry } from '@lenserfight/types'
import { Badge, HelpButton } from '@lenserfight/ui/components'
import { Button } from '@lenserfight/ui/components'
import { MetricCard } from '@lenserfight/ui/data-display'
import { Input, SelectField } from '@lenserfight/ui/forms'
import { PageHeader, Stack } from '@lenserfight/ui/layout'
import { Drawer } from '@lenserfight/ui/overlays'
import { Heading, Surface, Text } from '@lenserfight/ui/primitives'
import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Search, Layers, Box, Info, CheckCircle2, XCircle, X } from 'lucide-react'

import { useAICatalogModels, useAICatalogProviders, useCatalogProviderKeys } from '../hooks/useAICatalog'

type CatalogFocus = 'all' | 'providers' | 'models'

interface AICatalogShowroomProps {
  embedded?: boolean
  focus?: CatalogFocus
  title?: string
  onModelSelect?: (model: AIModelCatalogEntry) => void
}

function supportTone(level: string): 'green' | 'yellow' | 'gray' {
  if (level === 'runnable') return 'green'
  if (level === 'byok_only') return 'yellow'
  return 'gray'
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
  const [compareOpen, setCompareOpen] = useState(false)
  const navigate = useNavigate()

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

  const providerOptions = useMemo(() => [
    { value: 'all', label: 'All providers', icon: Layers },
    ...providers.map((p) => ({ value: p.key, label: p.display_name, icon: Box }))
  ], [providers])

  const capabilityOptions = useMemo(() => [
    { value: 'all', label: 'All capabilities', icon: Sparkles },
    ...capabilities.map((c) => ({ value: c, label: c }))
  ], [capabilities])

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
    ? 'space-y-8'
    : 'p-1'

  return (
    <div className={shellClass}>
      {!embedded && (
        <PageHeader
          title={title}
          description="Compare providers, inspect model capabilities, and decide which runtime belongs in a workflow or an agent team."
          actions={
            <>
              <HelpButton
                path={focus === 'providers' ? '/reference/ai-providers' : '/reference/ai-models'}
                label={focus === 'models' ? 'Models Docs' : focus === 'providers' ? 'Provider Docs' : 'AI Catalog'}
              />
              <MetricCard
                className="!bg-transparent !shadow-none !p-0 gap-8"
                stats={[
                  { label: 'Providers', value: String(providers.length), icon: <Layers size={14} /> },
                  { label: 'Models', value: String(filteredModels.length), icon: <Box size={14} /> },
                ]}
              />
            </>
          }
        />
      )}

      {embedded && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
          <div>
            <Text variant="caption" className="uppercase tracking-[0.22em] text-primary-yellow-600 dark:text-primary-yellow-400 font-bold">
              Catalog
            </Text>
            <Heading level={1} className="mt-2 text-greyscale-900 dark:text-white">
              {title}
            </Heading>
            <Text variant="body-m" color="muted" className="mt-2 max-w-3xl">
              Compare providers, inspect model capabilities, and decide which runtime belongs in a workflow or an agent team.
            </Text>
          </div>
          <MetricCard
            stats={[
              { label: 'Providers', value: String(providers.length), icon: <Layers size={14} /> },
              { label: 'Models', value: String(filteredModels.length), icon: <Box size={14} /> },
            ]}
          />
        </div>
      )}

      <Stack gap="gap-6">
        <Surface variant="inset" className="p-4 rounded-[24px] grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr] items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search model, provider, use case..."
            startAdornment={<Search size={18} />}
            className="!bg-surface-sunken"
          />
          <SelectField
            value={providerFilter}
            onChange={setProviderFilter}
            options={providerOptions}
            className="min-w-[200px]"
          />
          <SelectField
            value={capabilityFilter}
            onChange={setCapabilityFilter}
            options={capabilityOptions}
            className="min-w-[200px]"
          />
        </Surface>

        {(focus === 'all' || focus === 'providers') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <Heading level={2} size="h3" color="default">Providers</Heading>
              <Text variant="caption" color="muted" className="uppercase tracking-widest font-semibold">
                {providersLoading ? 'Loading' : `${providers.length} listed`}
              </Text>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => {
                const configured = configuredProviders.has(provider.key)
                return (
                  <Surface
                    key={provider.key}
                    variant="raised"
                    className="rounded-[28px] p-6 flex flex-col h-full hover:shadow-neu-3 transition-all duration-300 cursor-pointer"
                    onClick={() => focus === 'providers' ? navigate(`/ai/catalog/models`) : setProviderFilter(provider.key)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Text variant="caption" color="muted" className="uppercase tracking-widest font-bold">
                          {provider.key}
                        </Text>
                        <Heading level={3} size="h3" className="mt-1 text-greyscale-900 dark:text-white">
                          {provider.display_name}
                        </Heading>
                      </div>
                      <Badge color={supportTone(provider.support_level ?? 'catalog_only')} variant="outline">
                        {provider.support_level ?? 'catalog'}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge color={configured ? 'green' : 'gray'} variant="solid">
                        {configured ? 'Configured' : 'Not configured'}
                      </Badge>
                      {provider.is_active === false && (
                        <Badge color="red" variant="solid">Inactive</Badge>
                      )}
                    </div>
                    <Text variant="body-m" color="muted" className="mt-4 flex-grow leading-relaxed">
                      {String((provider.metadata?.summary as string | undefined) ?? 'Provider metadata is available in the catalog for routing, auth, and capability inspection.')}
                    </Text>
                  </Surface>
                )
              })}
            </div>
          </section>
        )}

        {(focus === 'all' || focus === 'models') && (
          <section className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <Heading level={2} size="h3">Models</Heading>
                <Text variant="caption" color="muted" className="uppercase tracking-widest font-semibold">
                  {modelsLoading ? 'Loading' : `${filteredModels.length} visible`}
                </Text>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {filteredModels.map((model) => {
                  const compareKey = `${model.provider_key}/${model.key}`
                  const configured = configuredProviders.has(model.provider_key)
                  const selected = selectedKeys.includes(compareKey)
                  const isActive = activeModelKey === compareKey

                  return (
                    <Surface
                      key={compareKey}
                      variant={isActive ? 'inset' : 'raised'}
                      className={`
                        rounded-[28px] p-6 transition-all duration-300 group relative cursor-pointer
                        ${!isActive ? 'hover:shadow-neu-3' : ''}
                      `}
                      onClick={() => navigate(`/ai/catalog/${model.provider_key}/${model.key}`)}
                      onMouseEnter={() => setActiveModelKey(compareKey)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Text variant="caption" color="muted" className="uppercase tracking-widest font-bold">
                            {model.provider_name}
                          </Text>
                          <Heading level={3} size="h3" className="mt-1 text-greyscale-900 group-hover:text-primary-yellow-600 dark:text-white dark:group-hover:text-primary-yellow-400 transition-colors">
                            {model.name}
                          </Heading>
                        </div>
                        <Badge color={supportTone(model.support_level)} variant="outline">
                          {model.support_level}
                        </Badge>
                      </div>
                      <Text variant="body-m" color="muted" className="mt-3 line-clamp-3 leading-relaxed">
                        {model.user_summary || model.description}
                      </Text>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge color={configured ? 'green' : 'gray'} variant="solid" size="sm">
                          {configured ? 'Key ready' : 'Key missing'}
                        </Badge>
                        {model.capabilities.slice(0, 3).map((capability) => (
                          <Badge key={capability} color="gray" variant="outline" size="sm">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center gap-2 text-xs font-medium text-greyscale-500 dark:text-greyscale-400">
                        <span className="flex items-center gap-1"><Layers size={12} /> {model.context_window_tokens ? `${(model.context_window_tokens / 1000).toFixed(0)}k` : 'n/a'}</span>
                        <span>•</span>
                        <span>{model.supports_streaming ? 'Streaming' : 'Static'}</span>
                        <span>•</span>
                        <span>{model.supports_tools ? 'Tools' : 'Basic'}</span>
                      </div>
                      <div className="mt-6 flex gap-3">
                        <Button
                          variant={selected ? 'primary' : 'secondary'}
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedKeys((current) =>
                              current.includes(compareKey)
                                ? current.filter((value) => value !== compareKey)
                                : current.length >= 3
                                  ? [...current.slice(1), compareKey]
                                  : [...current, compareKey]
                            )
                          }}
                        >
                          {selected ? 'Comparing' : 'Compare'}
                        </Button>
                        {onModelSelect && (
                          <Button
                            variant="dark"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => { e.stopPropagation(); onModelSelect(model) }}
                          >
                            Use in agent
                          </Button>
                        )}
                      </div>
                    </Surface>
                  )
                })}
              </div>
            </div>

            <Stack gap="gap-6" className="h-full">
              <Surface variant="raised" className="rounded-[28px] p-6 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge color="yellow" variant="outline" className="gap-1.5 py-1 px-3">
                    <Info size={14} />
                    <span className="uppercase tracking-widest text-[10px] font-black">Model Details</span>
                  </Badge>
                  {activeModel && (
                    <Link to={`/ai/catalog/${activeModel.provider_key}/${activeModel.key}`}>
                      <Text variant="caption" className="text-primary-yellow-600 hover:underline font-bold">
                        Full Specs
                      </Text>
                    </Link>
                  )}
                </div>
                {activeModel ? (
                  <Stack gap="gap-4">
                    <div>
                      <Heading level={3} size="h2" className="text-greyscale-900 dark:text-white">
                        {activeModel.name}
                      </Heading>
                      <Text variant="caption" color="muted" className="mt-1 font-medium">
                        {activeModel.provider_name} · {activeModel.key}
                      </Text>
                    </div>
                    <Text variant="body-m" color="default" className="leading-relaxed">
                      {activeModel.user_summary || activeModel.description}
                    </Text>
                    <div className="p-4 rounded-2xl bg-surface-sunken/50 border border-surface-border">
                      <Heading level={4} size="h3" className="text-sm font-bold uppercase tracking-wider text-greyscale-800 dark:text-greyscale-200">
                        Developer notes
                      </Heading>
                      <Text variant="body-m" color="muted" className="mt-2 text-sm leading-relaxed">
                        {activeModel.developer_summary || 'No detailed developer summary yet.'}
                      </Text>
                    </div>
                    <div>
                      <Heading level={4} size="h3" className="text-sm font-bold uppercase tracking-wider text-greyscale-800 dark:text-greyscale-200">
                        Recommended use cases
                      </Heading>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeModel.use_cases.map((useCase) => (
                          <Badge key={useCase} color="yellow" variant="outline">
                            {useCase}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Stack>
                ) : (
                  <Text variant="body-m" color="muted" className="py-8 text-center italic">
                    Pick a model to inspect its modality, tool support, and recommended workflows.
                  </Text>
                )}
              </Surface>

            </Stack>
          </section>
        )}
      </Stack>

      {/* ── Floating compare bar ─────────────────────────────────────────── */}
      {selectedModels.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[800] flex items-center gap-3 bg-surface-raised/95 backdrop-blur-md shadow-neu-4 rounded-2xl px-5 py-3 border border-surface-border">
          <div className="flex items-center gap-2">
            {selectedModels.map((model) => {
              const key = `${model.provider_key}/${model.key}`
              return (
                <div
                  key={key}
                  className="flex items-center gap-1.5 bg-surface-sunken rounded-xl px-3 py-1.5 text-xs font-semibold text-greyscale-800 dark:text-greyscale-200"
                >
                  <span className="max-w-[120px] truncate">{model.name}</span>
                  <button
                    type="button"
                    className="text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-300 transition-colors"
                    onClick={() => setSelectedKeys((prev) => prev.filter((k) => k !== key))}
                    aria-label={`Remove ${model.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="w-px h-5 bg-surface-border shrink-0" />
          <Button variant="primary" size="sm" className="shrink-0 gap-1.5" onClick={() => setCompareOpen(true)}>
            <Layers size={14} />
            Compare {selectedModels.length}/3
          </Button>
          <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setSelectedKeys([])}>
            Clear
          </Button>
        </div>
      )}

      {/* ── Compare drawer ───────────────────────────────────────────────── */}
      <Drawer
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title="Model Comparison"
        side="bottom"
        height="h-[72vh]"
      >
        {selectedModels.length === 0 ? (
          <Text variant="body-m" color="muted" className="py-16 text-center italic">
            Select models from the catalog to compare them here.
          </Text>
        ) : (
          <div className="min-w-0 overflow-x-auto">
            {/* Column headers */}
            <div
              className="grid gap-3 mb-2"
              style={{ gridTemplateColumns: `180px repeat(${selectedModels.length}, 1fr)` }}
            >
              <div />
              {selectedModels.map((model) => {
                const key = `${model.provider_key}/${model.key}`
                return (
                  <Surface key={key} variant="inset" className="rounded-2xl p-4 text-center relative">
                    <button
                      type="button"
                      aria-label={`Remove ${model.name}`}
                      className="absolute top-2 right-2 text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-300 transition-colors"
                      onClick={() => setSelectedKeys((prev) => prev.filter((k) => k !== key))}
                    >
                      <X size={14} />
                    </button>
                    <Text variant="caption" color="muted" className="uppercase tracking-widest font-bold block">
                      {model.provider_name}
                    </Text>
                    <Heading level={3} size="h3" className="mt-1 text-greyscale-900 dark:text-white">
                      {model.name}
                    </Heading>
                    <div className="mt-2 flex justify-center">
                      <Badge color={supportTone(model.support_level)} variant="outline" size="sm">
                        {model.support_level}
                      </Badge>
                    </div>
                  </Surface>
                )
              })}
            </div>

            {/* Spec rows */}
            {(
              [
                {
                  label: 'Context Window',
                  render: (m: AIModelCatalogEntry) => (
                    <Text variant="caption" className="font-mono font-bold tabular-nums">
                      {m.context_window_tokens ? `${(m.context_window_tokens / 1000).toFixed(0)}k` : 'n/a'}
                    </Text>
                  ),
                },
                {
                  label: 'Status',
                  render: (m: AIModelCatalogEntry) => (
                    <Badge color={m.status === 'active' ? 'green' : 'yellow'} variant="solid" size="sm">
                      {m.status}
                    </Badge>
                  ),
                },
                {
                  label: 'Streaming',
                  render: (m: AIModelCatalogEntry) =>
                    m.supports_streaming
                      ? <CheckCircle2 size={18} className="text-status-green" />
                      : <XCircle size={18} className="text-greyscale-300 dark:text-greyscale-600" />,
                },
                {
                  label: 'Tool Use',
                  render: (m: AIModelCatalogEntry) =>
                    m.supports_tools
                      ? <CheckCircle2 size={18} className="text-status-green" />
                      : <XCircle size={18} className="text-greyscale-300 dark:text-greyscale-600" />,
                },
                {
                  label: 'Vision',
                  render: (m: AIModelCatalogEntry) =>
                    m.supports_vision
                      ? <CheckCircle2 size={18} className="text-status-green" />
                      : <XCircle size={18} className="text-greyscale-300 dark:text-greyscale-600" />,
                },
                {
                  label: 'JSON Schema',
                  render: (m: AIModelCatalogEntry) =>
                    m.supports_json_schema
                      ? <CheckCircle2 size={18} className="text-status-green" />
                      : <XCircle size={18} className="text-greyscale-300 dark:text-greyscale-600" />,
                },
              ] as { label: string; render: (m: AIModelCatalogEntry) => React.ReactNode }[]
            ).map(({ label, render }) => (
              <div
                key={label}
                className="grid gap-3 items-center border-t border-surface-border"
                style={{ gridTemplateColumns: `180px repeat(${selectedModels.length}, 1fr)` }}
              >
                <Text variant="caption" color="muted" className="py-4 font-bold uppercase tracking-widest text-[10px]">
                  {label}
                </Text>
                {selectedModels.map((model) => (
                  <div
                    key={`${model.provider_key}/${model.key}`}
                    className="py-4 flex justify-center items-center"
                  >
                    {render(model)}
                  </div>
                ))}
              </div>
            ))}

            {/* Action row */}
            <div
              className="grid gap-3 pt-4 border-t border-surface-border"
              style={{ gridTemplateColumns: `180px repeat(${selectedModels.length}, 1fr)` }}
            >
              <div />
              {selectedModels.map((model) => (
                <Button
                  key={`${model.provider_key}/${model.key}`}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setCompareOpen(false)
                    navigate(`/ai/catalog/${model.provider_key}/${model.key}`)
                  }}
                >
                  Full Specs
                </Button>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
