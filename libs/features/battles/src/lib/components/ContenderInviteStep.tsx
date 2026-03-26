import { Badge, Button, Card } from '@lenserfight/ui/components'
import { Users } from 'lucide-react'
import React, { useState } from 'react'

import { useInviteContender } from '../hooks/useInviteContender'

interface SlotState {
  handle: string
  displayName: string
}

interface ContenderInviteStepProps {
  battleId: string
  onDone: (contenderAId?: string, contenderAName?: string, contenderBId?: string, contenderBName?: string) => void
}

export const ContenderInviteStep: React.FC<ContenderInviteStepProps> = ({ battleId, onDone }) => {
  const [slotA, setSlotA] = useState<SlotState>({ handle: '', displayName: '' })
  const [slotB, setSlotB] = useState<SlotState>({ handle: '', displayName: '' })

  const inviteA = useInviteContender(battleId)
  const inviteB = useInviteContender(battleId)

  const isLoading = inviteA.isPending || inviteB.isPending

  const handleInvite = async () => {
    let contenderAId: string | undefined
    let contenderAName: string | undefined
    let contenderBId: string | undefined
    let contenderBName: string | undefined

    if (slotA.handle.trim()) {
      const result = await inviteA.mutateAsync({
        battle_id: battleId,
        slot: 'A',
        contender_ref_id: slotA.handle.trim(),
        display_name: slotA.displayName.trim() || slotA.handle.trim(),
        contender_type: 'human',
      })
      contenderAId = result.id
      contenderAName = result.display_name
    }

    if (slotB.handle.trim()) {
      const result = await inviteB.mutateAsync({
        battle_id: battleId,
        slot: 'B',
        contender_ref_id: slotB.handle.trim(),
        display_name: slotB.displayName.trim() || slotB.handle.trim(),
        contender_type: 'human',
      })
      contenderBId = result.id
      contenderBName = result.display_name
    }

    onDone(contenderAId, contenderAName, contenderBId, contenderBName)
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="space-y-2">
        <Badge color="blue" variant="outline">Step 4 of 4</Badge>
        <h2 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
          Invite contenders
        </h2>
        <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
          Add up to two contenders by their lenser handle. You can also skip and invite them later from the battle page.
        </p>
      </div>

      <div className="space-y-4">
        {/* Slot A */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-status-blue/15 text-xs font-black text-status-blue">A</span>
            Contender A
          </label>
          <input
            type="text"
            value={slotA.handle}
            onChange={(e) => setSlotA((s) => ({ ...s, handle: e.target.value }))}
            placeholder="@handle or display name"
            className="w-full rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none transition-colors placeholder:text-greyscale-400 focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
          />
        </div>

        {/* Slot B */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-status-yellow/15 text-xs font-black text-status-yellow">B</span>
            Contender B
          </label>
          <input
            type="text"
            value={slotB.handle}
            onChange={(e) => setSlotB((s) => ({ ...s, handle: e.target.value }))}
            placeholder="@handle or display name"
            className="w-full rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none transition-colors placeholder:text-greyscale-400 focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
          />
        </div>
      </div>

      {(inviteA.error || inviteB.error) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {(inviteA.error?.message ?? inviteB.error?.message) ?? 'Failed to invite contender.'}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          className="w-auto"
        >
          Skip for now
        </Button>
        <Button

          onClick={handleInvite}
          isLoading={isLoading}
          disabled={isLoading || (!slotA.handle.trim() && !slotB.handle.trim())}
          className="gap-2 w-auto"
        >
          <Users size={15} /> Invite contenders
        </Button>
      </div>
    </Card>
  )
}
