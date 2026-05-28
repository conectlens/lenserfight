import React from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useLenserOptional } from '@lenserfight/features/profile'
import { ShieldAlert, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'

interface PlatformFlags {
  autonomy_dispatch_enabled: boolean
  public_battles_enabled: boolean
  webhook_outbox_enabled: boolean
}

const FLAG_LABELS: Record<keyof PlatformFlags, { label: string; description: string }> = {
  autonomy_dispatch_enabled: {
    label: 'Autonomy dispatch',
    description: 'Allows autonomous workflows to be dispatched by the CRON scheduler.',
  },
  public_battles_enabled: {
    label: 'Public battles arena',
    description: 'Enables the cloud battles arena and BYOK streaming to the public.',
  },
  webhook_outbox_enabled: {
    label: 'Webhook outbox dispatcher',
    description: 'Allows the webhook-outbox-dispatcher cron to drain and POST events.',
  },
}

async function fetchFlags(): Promise<PlatformFlags> {
  const { data, error } = await supabase.rpc('fn_get_platform_system_flags')
  if (error) throw error
  const raw = (data ?? {}) as Record<string, boolean>
  return {
    autonomy_dispatch_enabled: raw['autonomy_dispatch_enabled'] ?? true,
    public_battles_enabled:   raw['public_battles_enabled'] ?? false,
    webhook_outbox_enabled:   raw['webhook_outbox_enabled'] ?? true,
  }
}

async function setFlag(key: keyof PlatformFlags, enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('fn_set_platform_flag', { p_key: key, p_enabled: enabled })
  if (error) throw error
}

export function PlatformFlagsAdminPage() {
  const lenserCtx = useLenserOptional()
  const lenser = lenserCtx?.lenser
  const qc = useQueryClient()

  if (lenserCtx && !lenser?.is_super_admin) {
    return <Navigate to="/" replace />
  }

  const { data: flags, isLoading, error } = useQuery({
    queryKey: ['admin', 'platform-flags'],
    queryFn: fetchFlags,
    refetchInterval: 15_000,
    enabled: !!lenser?.is_super_admin,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: keyof PlatformFlags; enabled: boolean }) =>
      setFlag(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'platform-flags'] }),
  })

  const allEnabled = flags
    ? Object.values(flags).every(Boolean)
    : false

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        {allEnabled
          ? <ShieldCheck className="w-6 h-6 text-green-500" />
          : <ShieldAlert className="w-6 h-6 text-destructive" />}
        <div>
          <h1 className="text-2xl font-semibold">Platform System Flags</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            One-click kill switches for core platform behaviours. Changes take effect immediately.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading flags…</div>
      )}

      {error && (
        <div className="text-sm text-destructive">
          Failed to load flags: {String((error as Error)?.message ?? error)}
        </div>
      )}

      {flags && (
        <div className="border rounded-xl divide-y">
          {(Object.keys(FLAG_LABELS) as (keyof PlatformFlags)[]).map((key) => {
            const enabled = flags[key]
            const meta = FLAG_LABELS[key]
            const isPending = toggleMutation.isPending && toggleMutation.variables?.key === key
            return (
              <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                  <code className="text-xs text-muted-foreground font-mono">{key}</code>
                </div>
                <button
                  aria-label={`Toggle ${meta.label}`}
                  disabled={isPending}
                  onClick={() => toggleMutation.mutate({ key, enabled: !enabled })}
                  className="shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {enabled
                    ? <ToggleRight className="w-8 h-8 text-green-500" />
                    : <ToggleLeft  className="w-8 h-8 text-muted-foreground" />}
                  <span className={`text-xs font-medium ${enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {enabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        These flags write directly to <code className="font-mono">platform.system_flags</code>.
        Changes are reflected within one dispatch cycle (≤ 60 s for cron-driven surfaces).
        See the <a href="/docs/how-to/operators/announcement-day-runbook" className="underline">operator runbook</a> for rollback SQL.
      </p>
    </div>
  )
}
