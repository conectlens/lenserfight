import { supabase } from '@lenserfight/data/supabase'
import { Tooltip } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { useMutation } from '@tanstack/react-query'
import { HelpCircle } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DrawerDocsLink } from './DrawerDocsLink'

export type BattleExecutionMode = 'cloud' | 'local' | 'hybrid'

interface Props {
  open: boolean
  onClose: () => void
  agentId: string | null
  onCreated?: () => void
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-yellow-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const EXECUTION_MODE_OPTIONS = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'local', label: 'Local (Ollama / BYOK)' },
  { value: 'hybrid', label: 'Hybrid' },
]

const NewBattleSubscriptionDrawerImpl: React.FC<Props> = ({ open, onClose, agentId, onCreated }) => {
  const [category, setCategory] = useState('')
  const [executionMode, setExecutionMode] = useState<BattleExecutionMode>('cloud')
  const [requireApproval, setRequireApproval] = useState(false)
  const [maxPerDay, setMaxPerDay] = useState(5)

  useEffect(() => {
    if (!open) return
    setCategory('')
    setExecutionMode('cloud')
    setRequireApproval(false)
    setMaxPerDay(5)
  }, [open])

  const subscribe = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error('No agent ID')
      const { data, error } = await supabase.rpc('fn_agent_subscribe_to_battles', {
        p_agent_id: agentId,
        p_category: category.trim() || null,
        p_execution_mode: executionMode,
        p_workflow_id: null,
        p_require_approval: requireApproval,
        p_max_joins_per_day: maxPerDay,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      toast.success('Battle subscription created')
      onCreated?.()
      onClose()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const onCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value),
    [],
  )
  const onModeChange = useCallback(
    (v: string) => setExecutionMode(v as BattleExecutionMode),
    [],
  )
  const onMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setMaxPerDay(Number(e.target.value)),
    [],
  )
  const onApprovalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setRequireApproval(e.target.checked),
    [],
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[420px]"
      title="New battle subscription"
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/new-battle-subscription"
          tip="Subscribe the agent to auto-join matching battles. Set a daily cap to limit compute costs, choose execution mode (cloud/local/hybrid), and optionally gate every auto-join behind an approval request."
        />
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={() => subscribe.mutate()}
          submitLabel={subscribe.isPending ? 'Subscribing…' : 'Subscribe'}
          isLoading={subscribe.isPending}
          disabled={subscribe.isPending || !agentId}
        />
      }
    >
      <div className="space-y-4">
        <FieldLabel
          label="Category filter"
          tooltip="Leave blank to subscribe to all categories. Enter a category slug (e.g. 'coding', 'reasoning') to limit auto-join to matching battles only."
        >
          <input
            id="bs-category"
            type="text"
            placeholder="All categories (leave blank)"
            value={category}
            onChange={onCategoryChange}
            className={inputClass}
          />
        </FieldLabel>

        <FieldLabel
          label="Execution mode"
          tooltip="'Cloud' uses the platform's hosted runners; 'Local' routes through your gateway (Ollama / BYOK); 'Hybrid' prefers local and falls back to cloud when the gateway is unavailable."
        >
          <SelectField
            value={executionMode}
            onChange={onModeChange}
            options={EXECUTION_MODE_OPTIONS}
          />
        </FieldLabel>

        <FieldLabel
          label="Max joins per day (1–20)"
          tooltip="Hard cap on automatic battle entries per calendar day. Prevents unexpected compute costs if many battles launch simultaneously. Resets at midnight UTC."
        >
          <input
            id="bs-max"
            type="number"
            min={1}
            max={20}
            value={maxPerDay}
            onChange={onMaxChange}
            className={inputClass}
          />
        </FieldLabel>

        <Tooltip
          content="When checked, every auto-matched battle is held in the approval queue rather than joining immediately. The agent waits for owner sign-off before committing."
          position="top"
          contentClassName="max-w-xs whitespace-normal text-left"
        >
          <div className="flex items-center gap-3">
            <input
              id="require-approval"
              type="checkbox"
              checked={requireApproval}
              onChange={onApprovalChange}
              className="h-4 w-4 rounded accent-primary-yellow-500"
            />
            <label htmlFor="require-approval" className="text-sm text-gray-700 dark:text-gray-300">
              Require owner approval per battle
            </label>
          </div>
        </Tooltip>
      </div>
    </Drawer>
  )
}

export const NewBattleSubscriptionDrawer = React.memo(NewBattleSubscriptionDrawerImpl)
NewBattleSubscriptionDrawer.displayName = 'NewBattleSubscriptionDrawer'

const FieldLabel: React.FC<{
  label: string
  tooltip?: string
  children: React.ReactNode
}> = ({ label, tooltip, children }) => (
  <div className="block">
    <div className="mb-1 flex items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {tooltip && (
        <Tooltip content={tooltip} position="top" contentClassName="max-w-xs whitespace-normal text-left">
          <HelpCircle
            size={12}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label={`${label} — help`}
          />
        </Tooltip>
      )}
    </div>
    {children}
  </div>
)
