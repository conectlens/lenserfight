import type { AIModelCatalogEntry } from '@lenserfight/types'
import { Badge } from '@lenserfight/ui/components'
import { Button } from '@lenserfight/ui/components'
import { MetricCard } from '@lenserfight/ui/data-display'
import { Input, SelectField } from '@lenserfight/ui/forms'
import { PageHeader, Stack } from '@lenserfight/ui/layout'
import { Heading, Surface, Text } from '@lenserfight/ui/primitives'
import React, { useMemo, useState } from 'react'
import { Sparkles, Search, Layers, Box, Info } from 'lucide-react'

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
            <MetricCard
              className="!bg-transparent !shadow-none !p-0 gap-8"
              stats={[
                { label: 'Providers', value: String(providers.length), icon: <Layers size={14} /> },
                { label: 'Models', value: String(filteredModels.length), icon: <Box size={14} /> },
              ]}
            />
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
                    className="rounded-[28px] p-6 flex flex-col h-full hover:shadow-neu-3 transition-all duration-300"
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
                        rounded-[28px] p-6 transition-all duration-300 group relative
                        ${!isActive ? 'hover:shadow-neu-3' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Text variant="caption" color="muted" className="uppercase tracking-widest font-bold">
                            {model.provider_name}
                          </Text>
                          <button
                            type="button"
                            onClick={() => setActiveModelKey(compareKey)}
                            className="mt-1 block text-left"
                          >
                            <Heading level={3} size="h3" className="text-greyscale-900 group-hover:text-primary-yellow-600 dark:text-white dark:group-hover:text-primary-yellow-400 transition-colors">
                              {model.name}
                            </Heading>
                          </button>
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
                          onClick={() =>
                            setSelectedKeys((current) =>
                              current.includes(compareKey)
                                ? current.filter((value) => value !== compareKey)
                                : current.length >= 3
                                  ? [...current.slice(1), compareKey]
                                  : [...current, compareKey]
                            )
                          }
                        >
                          {selected ? 'Comparing' : 'Compare'}
                        </Button>
                        {onModelSelect && (
                          <Button
                            variant="dark"
                            size="sm"
                            className="flex-1"
                            onClick={() => onModelSelect(model)}
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
                <div className="flex items-center gap-2 mb-4">
                  <Info size={16} className="text-primary-yellow-600" />
                  <Text variant="caption" color="muted" className="uppercase tracking-widest font-bold">
                    Model Details
                  </Text>
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

              <Surface variant="raised" className="rounded-[28px] p-6 h-fit">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-primary-yellow-600" />
                    <Text variant="caption" color="muted" className="uppercase tracking-widest font-bold">
                      Compare Models
                    </Text>
                  </div>
                  <Badge color="yellow" variant="solid" size="sm">{selectedModels.length}/3</Badge>
                </div>
                {selectedModels.length === 0 ? (
                  <Text variant="body-m" color="muted" className="py-4 text-center italic text-sm">
                    Add up to three models to compare context, tools, support tier, and provider readiness.
                  </Text>
                ) : (
                  <Stack gap="gap-4">
                    {selectedModels.map((model) => (
                      <Surface key={`${model.provider_key}/${model.key}`} variant="inset" className="p-4 rounded-2xl border border-surface-border">
                        <Heading level={4} size="h3" className="text-base font-bold text-greyscale-900 dark:text-white">
                          {model.name}
                        </Heading>
                        <Text variant="caption" color="muted" className="font-medium">{model.provider_name}</Text>
                        <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs font-medium">
                          <Text color="muted">Context</Text>
                          <Text className="text-right tabular-nums">{model.context_window_tokens?.toLocaleString() ?? 'n/a'}</Text>
                          <Text color="muted">Streaming</Text>
                          <Text className="text-right">{model.supports_streaming ? 'Yes' : 'No'}</Text>
                          <Text color="muted">Tools</Text>
                          <Text className="text-right">{model.supports_tools ? 'Yes' : 'No'}</Text>
                          <Text color="muted">Status</Text>
                          <Text className="text-right" color={model.status === 'active' ? 'success' : 'default'}>{model.status}</Text>
                        </div>
                      </Surface>
                    ))}
                  </Stack>
                )}
              </Surface>
            </Stack>
          </section>
        )}
      </Stack>
    </div>
  )
}
