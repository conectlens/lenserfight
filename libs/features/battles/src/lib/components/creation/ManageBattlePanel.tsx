import { Button } from '@lenserfight/ui/components'
import { battlesService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { useFinalizeBattle } from '../../hooks/mutations/useFinalizeBattle'
import { useAiJudgeVerdicts } from '../../hooks/query/useAiJudgeVerdicts'
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

  const finalize = useFinalizeBattle(battle.slug)

  // ai_judge battles are finalized by the DB only once verdicts are recorded;
  // fn_battles_finalize RAISES 'ai_verdicts_missing' otherwise. Surface a waiting
  // state and only enable the manual button once verdicts exist (the worker
  // normally finalizes these autonomously). Only fetch verdicts when relevant.
  const isAiJudge = battle.judging_mode === 'ai_judge'
  const showVerdictGate = battle.status === 'scoring' && isAiJudge
  const verdicts = useAiJudgeVerdicts(showVerdictGate ? battle.id : undefined)
  const hasVerdicts = (verdicts.data?.length ?? 0) > 0
  const awaitingVerdicts = showVerdictGate && !hasVerdicts

  const anyPending = publish.isPending || openVoting.isPending || closeVoting.isPending || finalize.isPending
  const anyError = publish.error ?? openVoting.error ?? closeVoting.error ?? finalize.error

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
      {battle.status === 'scoring' && awaitingVerdicts && (
        <p className="text-xs text-surface-text-muted text-center">
          Waiting for AI verdicts. This battle finalizes automatically once the AI
          judge has scored it.
        </p>
      )}
      {battle.status === 'scoring' && !awaitingVerdicts && (
        <Button
          size="sm"
          onClick={() => finalize.mutate(battle.id, { onSuccess: onMutated })}
          isLoading={finalize.isPending}
          disabled={anyPending}
          className="w-full"
        >
          Finalize Battle
        </Button>
      )}
      {anyError && <p className="text-xs text-status-red">{(anyError as Error).message}</p>}
    </div>
  )
}
