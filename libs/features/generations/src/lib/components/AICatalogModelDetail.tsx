import { AIModelCatalogEntry } from '@lenserfight/types'
import { Badge, Button } from '@lenserfight/ui/components'
import { MetricCard } from '@lenserfight/ui/data-display'
import { Stack } from '@lenserfight/ui/layout'
import { Heading, Surface, Text } from '@lenserfight/ui/primitives'
import { 
  ExternalLink, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  ShieldCheck,
  Globe,
  Terminal,
  Activity
} from 'lucide-react'
import React from 'react'

interface AICatalogModelDetailProps {
  model: AIModelCatalogEntry
}

export const AICatalogModelDetail: React.FC<AICatalogModelDetailProps> = ({ model }) => {
  const metadata = model.metadata as any
  const pricingNotes = metadata?.pricing?.notes

  return (
    <Stack gap="gap-8">
      <Surface variant="raised" className="rounded-[32px] p-8 md:p-12 overflow-hidden relative">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
          <Stack gap="gap-4" className="max-w-3xl">
            <div className="flex items-center gap-3">
              <Badge color="yellow" variant="outline" className="uppercase tracking-widest font-bold">
                {model.provider_name}
              </Badge>
              <Badge color={model.status === 'active' ? 'green' : 'yellow'} variant="solid">
                {model.status}
              </Badge>
            </div>
            
            <div>
              <Heading level={1} size="display" className="text-greyscale-900 dark:text-white">
                {model.name}
              </Heading>
              <Text variant="body-l" color="muted" className="mt-4 leading-relaxed max-w-2xl">
                {model.description}
              </Text>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {model.use_cases.map((useCase) => (
                <Badge key={useCase} color="gray" variant="solid" className="bg-surface-sunken/50">
                  {useCase}
                </Badge>
              ))}
            </div>
          </Stack>

          <MetricCard
            className="w-full md:w-auto min-w-[240px]"
            stats={[
              { 
                label: 'Context', 
                value: model.context_window_tokens ? `${(model.context_window_tokens / 1000).toFixed(0)}k` : 'n/a',
                icon: <Layers size={14} /> 
              },
              { 
                label: 'Streaming', 
                value: model.supports_streaming ? 'Ready' : 'No',
                icon: <Zap size={14} /> 
              },
              { 
                label: 'Tools', 
                value: model.supports_tools ? 'Ready' : 'No',
                icon: <Terminal size={14} /> 
              }
            ]}
          />
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          {model.docs_url && (
            <Button 
              variant="primary"
              className="gap-2"
              onClick={() => window.open(model.docs_url!, '_blank')}
            >
              <ExternalLink size={18} />
              Upstream Docs
            </Button>
          )}
          <Button variant="secondary" className="gap-2">
            <Activity size={18} />
            Benchmarks
          </Button>
        </div>
      </Surface>

      <div className="grid gap-8 lg:grid-cols-2">
        <Stack gap="gap-6">
          <Surface variant="raised" className="rounded-[28px] p-8 h-full">
            <Stack gap="gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-yellow-500/10 text-primary-yellow-600">
                  <Sparkles size={20} />
                </div>
                <Heading level={2} size="h3">User Summary</Heading>
              </div>
              <Text variant="body-m" className="leading-relaxed text-greyscale-800 dark:text-greyscale-200">
                {model.user_summary}
              </Text>
              
              <div className="pt-6 border-t border-surface-border">
                <Heading level={3} size="h3" className="text-sm font-bold uppercase tracking-widest text-greyscale-500 mb-4">
                  Capabilities Matrix
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <FeatureRow label="Contextual Memory" active={!!model.context_window_tokens} />
                  <FeatureRow label="Tool Invocation" active={model.supports_tools} />
                  <FeatureRow label="Vision / Modal" active={model.supports_vision} />
                  <FeatureRow label="JSON Schema" active={model.supports_json_schema} />
                  <FeatureRow label="Streaming Output" active={model.supports_streaming} />
                  <FeatureRow label="Real-time Latency" active={model.status === 'active'} />
                </div>
              </div>
            </Stack>
          </Surface>

          <Surface variant="inset" className="rounded-[28px] p-8 bg-surface-sunken/40">
            <Stack gap="gap-4">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-primary-yellow-600" />
                <Heading level={2} size="h3">Provider Readiness</Heading>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 mt-2">
                <Surface variant="raised" className="p-4 rounded-2xl flex items-center justify-between">
                  <Text variant="caption" color="muted">Support Tier</Text>
                  <Badge color="yellow" variant="outline">{model.support_level}</Badge>
                </Surface>
                <Surface variant="raised" className="p-4 rounded-2xl flex items-center justify-between">
                  <Text variant="caption" color="muted">Auth Mode</Text>
                  <Text variant="caption" className="font-bold">{metadata?.auth_modes?.[0] || 'api_key'}</Text>
                </Surface>
              </div>
              {pricingNotes && (
                <div className="mt-4 p-4 rounded-2xl border border-surface-border bg-white/5">
                  <Text variant="caption" color="muted" className="leading-relaxed italic">
                    Note: {pricingNotes}
                  </Text>
                </div>
              )}
            </Stack>
          </Surface>
        </Stack>

        <Surface variant="raised" className="rounded-[28px] p-8">
          <Stack gap="gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-greyscale-900 dark:bg-white text-white dark:text-greyscale-900">
                <ShieldCheck size={20} />
              </div>
              <Heading level={2} size="h3">Developer Logic</Heading>
            </div>
            
            <div className="p-6 rounded-2xl bg-surface-sunken border border-surface-border">
              <Heading level={3} size="h3" className="text-xs font-bold uppercase tracking-widest text-primary-yellow-600 mb-3">
                Runtime Strategy
              </Heading>
              <Text variant="body-m" className="leading-relaxed italic">
                {model.developer_summary}
              </Text>
            </div>

            <div>
              <Heading level={3} size="h3" className="text-xs font-bold uppercase tracking-widest text-greyscale-500 mb-4">
                Supported Modalities
              </Heading>
              <Stack gap="gap-3">
                <ModalityItem label="Input (Context)" values={model.input_modalities || ['text']} />
                <ModalityItem label="Output (Response)" values={model.output_modalities || ['text']} />
              </Stack>
            </div>

            <div className="pt-6 border-t border-surface-border">
              <Heading level={3} size="h3" className="text-xs font-bold uppercase tracking-widest text-greyscale-500 mb-4">
                Raw Identifiers
              </Heading>
              <div className="flex flex-col gap-2">
                <IdentifierRow label="Internal Key" value={model.key} />
                <IdentifierRow label="Provider ID" value={model.provider_id} />
              </div>
            </div>
          </Stack>
        </Surface>
      </div>
    </Stack>
  )
}

const FeatureRow: React.FC<{ label: string, active: boolean }> = ({ label, active }) => (
  <div className="flex items-center gap-2">
    {active ? (
      <CheckCircle2 size={16} className="text-status-green" />
    ) : (
      <XCircle size={16} className="text-greyscale-400" />
    )}
    <Text variant="caption" color={active ? 'default' : 'muted'} className="font-medium">{label}</Text>
  </div>
)

const ModalityItem: React.FC<{ label: string, values: string[] }> = ({ label, values }) => (
  <div>
    <Text variant="caption" color="muted" className="mb-2 block">{label}</Text>
    <div className="flex flex-wrap gap-2">
      {values.map(v => (
        <Badge key={v} color="blue" variant="outline" size="sm">{v}</Badge>
      ))}
    </div>
  </div>
)

const IdentifierRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken/30 border border-surface-border/50">
    <Text variant="caption" color="muted">{label}</Text>
    <Text variant="caption" className="font-mono bg-greyscale-100 dark:bg-greyscale-800 px-2 py-0.5 rounded text-[10px]">{value}</Text>
  </div>
)
