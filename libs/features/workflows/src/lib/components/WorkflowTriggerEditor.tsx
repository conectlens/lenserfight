import { supabase } from '@lenserfight/data/supabase'
import { Badge, Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus, Trash2 } from 'lucide-react'
import React, { useCallback, useState } from 'react'

type TriggerType = 'cron' | 'battle_event' | 'webhook' | 'manual'

interface WorkflowTrigger {
  id: string
  workflow_id: string
  trigger_type: TriggerType
  condition: Record<string, unknown>
  webhook_secret: string | null
  enabled: boolean
  last_fired_at: string | null
  created_at: string
}

const CRON_PRESETS = [
  { label: 'Every hour',  value: '0 * * * *' },
  { label: 'Every day',   value: '0 9 * * *' },
  { label: 'Every week',  value: '0 9 * * 1' },
]

function nextCronRuns(expr: string): string[] {
  // Simplified: just show expression — full cron preview needs a library
  return [`Next: schedule "${expr}"`]
}

interface WorkflowTriggerEditorProps {
  workflowId: string
}

export function WorkflowTriggerEditor({ workflowId }: WorkflowTriggerEditorProps) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [triggerType, setTriggerType] = useState<TriggerType>('cron')
  const [cronExpr, setCronExpr] = useState('0 * * * *')
  const [battleStatus, setBattleStatus] = useState('closed')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: triggers, isLoading } = useQuery<WorkflowTrigger[]>({
    queryKey: ['workflow-triggers', workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_triggers')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as WorkflowTrigger[]
    },
    staleTime: 1000 * 30,
  })

  const { mutate: addTrigger, isPending: isAdding } = useMutation({
    mutationFn: async () => {
      const condition = triggerType === 'battle_event'
        ? { status: battleStatus }
        : {}
      const webhookSecret = triggerType === 'webhook'
        ? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        : null
      const { error } = await supabase.from('workflow_triggers').insert({
        workflow_id:    workflowId,
        trigger_type:   triggerType,
        condition:      triggerType === 'cron' ? { cron: cronExpr } : condition,
        webhook_secret: webhookSecret,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-triggers', workflowId] })
      setShowForm(false)
    },
  })

  const { mutate: deleteTrigger } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflow_triggers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-triggers', workflowId] }),
  })

  const handleCopySecret = useCallback((id: string, secret: string) => {
    navigator.clipboard.writeText(secret).catch(() => undefined)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-text">Triggers</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add trigger
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-surface-border p-4 space-y-3 bg-surface-raised">
          <div>
            <label className="block text-xs font-medium text-surface-text-muted mb-1">Type</label>
            <div className="flex flex-wrap gap-2">
              {(['cron', 'battle_event', 'webhook', 'manual'] as TriggerType[]).map((t) => (
                <Button
                  key={t}
                  onClick={() => setTriggerType(t)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    triggerType === t
                      ? 'bg-accent-primary text-white border-accent-primary'
                      : 'border-surface-border text-surface-text-muted hover:border-surface-text',
                  ].join(' ')}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {triggerType === 'cron' && (
            <div>
              <label className="block text-xs font-medium text-surface-text-muted mb-1">Cron expression</label>
              <input
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <div className="flex gap-2 mt-1.5">
                {CRON_PRESETS.map((p) => (
                  <Button
                    key={p.value}
                    onClick={() => setCronExpr(p.value)}
                    className="text-[10px] text-accent-primary hover:underline"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-surface-text-muted mt-1">{nextCronRuns(cronExpr)[0]}</p>
            </div>
          )}

          {triggerType === 'battle_event' && (
            <div>
              <SelectField
                label="Battle status condition"
                value={battleStatus}
                onChange={setBattleStatus}
                options={['open', 'voting', 'closed', 'archived'].map((status) => ({
                  value: status,
                  label: status,
                }))}
              />
            </div>
          )}

          {triggerType === 'webhook' && (
            <p className="text-xs text-surface-text-muted">
              A webhook secret will be auto-generated. Use it with the webhook trigger API.
            </p>
          )}

          <Button size="sm" variant="primary" onClick={() => addTrigger()} disabled={isAdding}>
            {isAdding ? 'Creating…' : 'Create trigger'}
          </Button>
        </div>
      )}

      {isLoading && <p className="text-sm text-surface-text-muted">Loading triggers…</p>}

      {!isLoading && (!triggers || triggers.length === 0) && !showForm && (
        <p className="text-sm text-surface-text-muted">No triggers yet.</p>
      )}

      {triggers && triggers.length > 0 && (
        <div className="space-y-2">
          {triggers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge color="blue" variant="outline" className="text-[10px]">{t.trigger_type}</Badge>
                  {!t.enabled && <Badge color="gray" variant="outline" className="text-[10px]">disabled</Badge>}
                </div>
                <div className="text-xs text-surface-text-muted font-mono truncate">
                  {JSON.stringify(t.condition)}
                </div>
                {t.last_fired_at && (
                  <div className="text-[10px] text-surface-text-muted">
                    Last fired: {new Date(t.last_fired_at).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {t.trigger_type === 'webhook' && t.webhook_secret && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopySecret(t.id, t.webhook_secret!)}
                    title="Copy webhook secret"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === t.id && <span className="ml-1 text-xs">Copied!</span>}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteTrigger(t.id)}
                  title="Delete trigger"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
