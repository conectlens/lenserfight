import { supabase } from '@lenserfight/data/supabase'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { useMutation } from '@tanstack/react-query'
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

const labelClass =
  'mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400'

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
          tip="Subscribe the agent to a battle template. Set a daily cap, stake limit, and notify-on-entry preference. Kill switch hard-stops all auto-entries."
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
        <div>
          <label className={labelClass} htmlFor="bs-category">
            Category filter
          </label>
          <input
            id="bs-category"
            type="text"
            placeholder="All categories (leave blank)"
            value={category}
            onChange={onCategoryChange}
            className={inputClass}
          />
        </div>

        <SelectField
          label="Execution mode"
          value={executionMode}
          onChange={onModeChange}
          options={EXECUTION_MODE_OPTIONS}
        />

        <div>
          <label className={labelClass} htmlFor="bs-max">
            Max joins per day (1–20)
          </label>
          <input
            id="bs-max"
            type="number"
            min={1}
            max={20}
            value={maxPerDay}
            onChange={onMaxChange}
            className={inputClass}
          />
        </div>

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


      </div>
    </Drawer>
  )
}

export const NewBattleSubscriptionDrawer = React.memo(NewBattleSubscriptionDrawerImpl)
NewBattleSubscriptionDrawer.displayName = 'NewBattleSubscriptionDrawer'
