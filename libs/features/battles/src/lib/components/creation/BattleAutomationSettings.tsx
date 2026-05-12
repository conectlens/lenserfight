import { Badge } from '@lenserfight/ui/components'
import { supabase } from '@lenserfight/data/supabase'
import { CheckCircle, Clock, XCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface ReadinessResult {
  ready: boolean
  blockers: string[]
}

interface BattleAutomationSettingsProps {
  battleId?: string | null
  autoAssignContenders: boolean
  autoPromote: boolean
  onChangeAutoAssign: (val: boolean) => void
  onChangeAutoPromote: (val: boolean) => void
  onReadinessChange?: (ready: boolean) => void
}

export function BattleAutomationSettings({
  battleId,
  autoAssignContenders,
  autoPromote,
  onChangeAutoAssign,
  onChangeAutoPromote,
  onReadinessChange,
}: BattleAutomationSettingsProps) {
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!battleId) return
    setChecking(true)
    void (async () => {
      try {
        const { data } = await supabase.rpc('fn_battles_check_readiness', { p_battle_id: battleId })
        const result = data as ReadinessResult
        setReadiness(result)
        onReadinessChange?.(result?.ready ?? true)
      } catch {
        setReadiness(null)
        onReadinessChange?.(true)
      } finally {
        setChecking(false)
      }
    })()
  }, [battleId, autoAssignContenders, autoPromote]) // eslint-disable-line

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-surface-text mb-3">Automation</h3>

        {/* Auto-assign contenders */}
        <label className="flex items-center justify-between gap-3 py-3 border-b border-surface-border cursor-pointer">
          <div>
            <div className="text-sm font-medium text-surface-text">Auto-assign contenders</div>
            <div className="text-xs text-surface-text-muted mt-0.5">
              Fills contender slots with available AI lensers before the battle starts.
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoAssignContenders}
            onChange={(e) => onChangeAutoAssign(e.target.checked)}
            className="h-4 w-4 accent-accent-primary"
          />
        </label>

        {/* Auto-promote */}
        <label className="flex items-center justify-between gap-3 py-3 cursor-pointer">
          <div>
            <div className="text-sm font-medium text-surface-text">Auto-promote when ready</div>
            <div className="text-xs text-surface-text-muted mt-0.5">
              Transitions draft → open automatically once all readiness checks pass.
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoPromote}
            onChange={(e) => onChangeAutoPromote(e.target.checked)}
            className="h-4 w-4 accent-accent-primary"
          />
        </label>
      </div>

      {/* Readiness checklist */}
      {battleId && (
        <div className="rounded-xl border border-surface-border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-surface-text">
            <span>Readiness</span>
            {checking && <span className="text-xs text-surface-text-muted animate-pulse">checking…</span>}
            {!checking && readiness && (
              readiness.ready
                ? <Badge color="green" variant="outline" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ready</Badge>
                : <Badge color="yellow" variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Not ready</Badge>
            )}
          </div>
          {!checking && readiness && !readiness.ready && (
            <ul className="space-y-1.5">
              {readiness.blockers.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-surface-text-muted">
                  <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span className="font-mono">{b}</span>
                </li>
              ))}
            </ul>
          )}
          {!checking && readiness?.ready && (
            <p className="text-xs text-green-600 dark:text-green-400">
              All checks passed. Battle will auto-promote when published.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
