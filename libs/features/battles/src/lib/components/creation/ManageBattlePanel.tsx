import { Button } from '@lenserfight/ui/components'
import { battlesService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import type { Battle } from '../../types/battle.types'

interface ManageBattlePanelProps {
  battle: Battle
  /** Called after any successful mutation — use to close the parent panel / invalidate */
  onMutated: () => void
}

export function ManageBattlePanel({ battle, onMutated }: ManageBattlePanelProps) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.battles.detail(battle.slug) })
    onMutated()
  }

  const publish = useMutation({
    mutationFn: () => battlesService.publishBattle(battle.id),
    onSuccess: invalidate,
  })

  const openVoting = useMutation({
    mutationFn: () => battlesService.openVoting(battle.id),
    onSuccess: invalidate,
  })

  const closeVoting = useMutation({
    mutationFn: () => battlesService.closeVoting(battle.id),
    onSuccess: invalidate,
  })

  const anyPending = publish.isPending || openVoting.isPending || closeVoting.isPending
  const anyError = publish.error ?? openVoting.error ?? closeVoting.error

  return (
    <div className="p-5 space-y-3">
      {battle.status === 'draft' && (
        <Button
          size="sm"
          onClick={() => publish.mutate()}
          isLoading={publish.isPending}
          disabled={anyPending}
          className="w-full"
        >
          Publish Battle
        </Button>
      )}
      {battle.status === 'open' && (
        <Button
          size="sm"
          onClick={() => openVoting.mutate()}
          isLoading={openVoting.isPending}
          disabled={anyPending}
          className="w-full"
        >
          Open Voting
        </Button>
      )}
      {battle.status === 'voting' && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => closeVoting.mutate()}
          isLoading={closeVoting.isPending}
          disabled={anyPending}
          className="w-full"
        >
          Close Voting
        </Button>
      )}
      {anyError && (
        <p className="text-xs text-status-red">{(anyError as Error).message}</p>
      )}
    </div>
  )
}
