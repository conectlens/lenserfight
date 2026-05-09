import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import { useLenserOptional } from '@lenserfight/features/profile'
import { Button } from '@lenserfight/ui/components'
import { ShieldAlert, ShieldCheck, ShieldX, Plus } from 'lucide-react'

interface KillSwitch {
  id: string
  scope: string
  target_id: string | null
  reason: string
  expires_at: string | null
  activated_at: string
  lifted_at: string | null
  operator_handle: string | null
}

type ScopeType = 'system' | 'battle' | 'agent' | 'run'

async function listKillSwitches(): Promise<KillSwitch[]> {
  const { data, error } = await supabase.rpc('fn_kill_switch_list', {})
  if (error) throw error
  return (data ?? []) as KillSwitch[]
}

async function activateKillSwitch(params: {
  scope: ScopeType
  targetId: string | null
  reason: string
  expiresAt: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('fn_kill_switch_activate', {
    p_scope:      params.scope,
    p_target_id:  params.targetId,
    p_reason:     params.reason,
    p_expires_at: params.expiresAt,
  })
  if (error) throw error
  return data as string
}

async function liftKillSwitch(switchId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_kill_switch_lift', { p_switch_id: switchId })
  if (error) throw error
}

function isActive(ks: KillSwitch): boolean {
  if (ks.lifted_at) return false
  if (ks.expires_at && new Date(ks.expires_at) < new Date()) return false
  return true
}

export function KillSwitchAdminPage() {
  const lenserCtx = useLenserOptional()
  const lenser = lenserCtx?.lenser
  const qc = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [scope, setScope] = useState<ScopeType>('system')
  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  if (lenserCtx && !lenser?.is_super_admin) {
    return <Navigate to="/" replace />
  }

  const { data: switches = [], isLoading } = useQuery({
    queryKey: ['admin', 'kill-switches'],
    queryFn: listKillSwitches,
    refetchInterval: 10_000,
    enabled: !!lenser?.is_super_admin,
  })

  const activateMutation = useMutation({
    mutationFn: activateKillSwitch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'kill-switches'] })
      setShowForm(false)
      setScope('system')
      setTargetId('')
      setReason('')
      setExpiresAt('')
    },
  })

  const liftMutation = useMutation({
    mutationFn: liftKillSwitch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'kill-switches'] }),
  })

  const handleActivate = () => {
    if (!reason.trim()) return
    activateMutation.mutate({
      scope,
      targetId: scope !== 'system' && targetId ? targetId : null,
      reason: reason.trim(),
      expiresAt: expiresAt || null,
    })
  }

  const active = switches.filter(isActive)
  const inactive = switches.filter((s) => !isActive(s))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-destructive" />
            Platform Kill Switches
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Emergency stops for autonomous operations. System scope halts all cron jobs.
          </p>
        </div>
        <Button
          variant="danger"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Activate Kill Switch
        </Button>
      </div>

      {showForm && (
        <div className="border border-destructive/40 rounded-xl p-5 space-y-4 bg-destructive/5">
          <h2 className="font-semibold text-sm text-destructive">New Kill Switch</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ScopeType)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="system">system — halt ALL autonomous ops</option>
                <option value="battle">battle — halt specific battle</option>
                <option value="agent">agent — halt specific agent</option>
                <option value="run">run — halt specific execution run</option>
              </select>
            </div>

            {scope !== 'system' && (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Target {scope.charAt(0).toUpperCase() + scope.slice(1)} UUID
                </label>
                <input
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Reason (required)</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why this kill switch is needed..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Expires At (optional ISO 8601)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="danger"
              onClick={handleActivate}
              disabled={activateMutation.isPending || !reason.trim()}
            >
              {activateMutation.isPending ? 'Activating…' : 'Activate Kill Switch'}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>

          {activateMutation.isError && (
            <p className="text-xs text-destructive">
              {String((activateMutation.error as Error)?.message ?? 'Failed to activate')}
            </p>
          )}
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
            <ShieldX className="w-4 h-4" /> Active Kill Switches ({active.length})
          </h2>
          <div className="border border-destructive/30 rounded-xl divide-y divide-destructive/20">
            {active.map((ks) => (
              <div key={ks.id} className="flex items-start justify-between px-4 py-3 gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                      {ks.scope}
                    </span>
                    {ks.target_id && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {ks.target_id.slice(0, 8)}…
                      </span>
                    )}
                    {!ks.target_id && <span className="text-xs text-destructive font-medium">ALL</span>}
                  </div>
                  <p className="text-sm truncate">{ks.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    by @{ks.operator_handle ?? '—'} · {new Date(ks.activated_at).toLocaleString()}
                    {ks.expires_at && ` · expires ${new Date(ks.expires_at).toLocaleString()}`}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => liftMutation.mutate(ks.id)}
                  disabled={liftMutation.isPending}
                  className="shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Lift
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {active.length === 0 && !isLoading && (
        <div className="border rounded-xl p-8 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-green-500 mx-auto" />
          <p className="text-sm font-medium">No active kill switches</p>
          <p className="text-xs text-muted-foreground">All autonomous operations are running normally.</p>
        </div>
      )}

      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">History ({inactive.length})</h2>
          <div className="border rounded-xl divide-y">
            {inactive.slice(0, 10).map((ks) => (
              <div key={ks.id} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground">
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{ks.scope}</span>
                <span className="text-sm flex-1 truncate">{ks.reason}</span>
                <span className="text-xs">
                  {ks.lifted_at ? `lifted ${new Date(ks.lifted_at).toLocaleDateString()}` : 'expired'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
