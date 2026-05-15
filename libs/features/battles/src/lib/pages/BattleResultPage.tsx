import { useLenserOptional } from '@lenserfight/features/profile'
import { Button } from '@lenserfight/ui/components'
import { TrustMetadataPanel } from '@lenserfight/ui/widgets'
import type { ExecutionTrustEvaluation } from '@lenserfight/types'
import { Loader2, ShieldAlert, Swords } from 'lucide-react'
import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'

import { ArenaView } from '../components/arena/ArenaView'
import { BattleShareCard } from '../components/display/BattleShareCard'
import { BattleStatusBadge } from '../components/display/BattleStatusBadge'
import { ResultBanner } from '../components/scoring/ResultBanner'
import { RubricPanel } from '../components/scoring/RubricPanel'
import { VotePanel } from '../components/scoring/VotePanel'
import { ContenderSlot } from '../components/submission/ContenderSlot'
import { useCreateRematch } from '../hooks/mutations/useCreateRematch'
import { useBattle } from '../hooks/query/useBattle'
import { useModerationDecisions } from '../hooks/query/useModerationDecisions'

import type { BattleStatus } from '../types/battle.types'

function useTrustEvaluations(submissionIds: string[]) {
  return useQuery<ExecutionTrustEvaluation[]>({
    queryKey: ['trust-evaluations', submissionIds],
    queryFn: async () => {
      if (!submissionIds.length) return []
      const results: ExecutionTrustEvaluation[] = []
      for (const id of submissionIds) {
        const { data } = await supabase.rpc('fn_get_submission_trust', { p_submission_id: id })
        if (data) {
          const row = data as Record<string, unknown>
          results.push({
            id: id,
            submissionId: row['submission_id'] as string,
            attestationId: (row['attestation_id'] as string) ?? null,
            trustLevel: (row['trust_level'] as ExecutionTrustEvaluation['trustLevel']) ?? 'unverified',
            factors: (row['factors'] as Record<string, boolean>) ?? {},
            evaluatedAt: row['evaluated_at'] as string,
          })
        }
      }
      return results
    },
    enabled: submissionIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

function BattleAdminModerationLink({ slug }: { slug: string }) {
  // Owner-scoped RPC — empty result if user has no moderation visibility for this battle.
  const { data } = useModerationDecisions('all', 100)
  const hasModeration = !!data?.some((d) => d.battle_slug === slug)
  if (!hasModeration) return null

  return (
    <div className="mt-4 flex justify-end">
      <Link
        to="/admin/battles/moderation?status=flagged"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-greyscale-500 dark:text-greyscale-400 hover:text-primary-yellow-600 dark:hover:text-primary-yellow-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500 rounded-sm"
      >
        <ShieldAlert size={14} aria-hidden="true" />
        Open in admin
      </Link>
    </div>
  )
}

// V1 — Rematch CTA visible only to the battle creator. Invokes the
// `fn_battles_create_rematch` RPC, then navigates to the new draft battle.
function RematchButton({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const lenserCtx = useLenserOptional()
  const currentLenserId = lenserCtx?.lenser?.id
  const { data: battle } = useBattle(slug)
  const { mutateAsync, isPending } = useCreateRematch()

  const isCreator =
    !!currentLenserId && !!battle?.creator_lenser_id && battle.creator_lenser_id === currentLenserId

  if (!battle || !isCreator) return null

  const handleClick = async () => {
    if (isPending || !battle.id) return
    try {
      const result = await mutateAsync(battle.id)
      navigate(`/battles/${result.slug}`)
    } catch {
      // useCreateRematch already toasts on error.
    }
  }

  return (
    <div className="mt-4 flex justify-end">
      <Button
        onClick={handleClick}
        disabled={isPending}
        variant="primary"
        size="sm"
        className="flex items-center gap-2"
        aria-label="Create a rematch of this battle"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <Swords size={14} aria-hidden="true" />
        )}
        {isPending ? 'Creating rematch...' : 'Rematch'}
      </Button>
    </div>
  )
}

export function BattleResultPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: battle } = useBattle(slug ?? '')

  const submissionIds = ((battle as unknown as { submissions?: Array<{ id: string }> } | undefined)?.submissions)
    ?.map((s) => s.id) ?? []
  const { data: trustEvaluations = [] } = useTrustEvaluations(submissionIds)
  const verifiedSubmissions = trustEvaluations.filter(
    (te) => te.trustLevel !== 'unverified'
  )

  return (
    <>
    <ArenaView
      slug={slug ?? ''}
      forcePhase="result"
      renderContenderSlot={(props) => (
        <ContenderSlot
          slot={props.slot}
          displayName={props.displayName}
          contenderType={props.contenderType}
          contentText={props.contentText}
          contentUrl={props.contentUrl}
          mediaUrl={props.mediaUrl}
          mimeType={props.mimeType}
          outputModality={props.outputModality}
          voteCount={props.voteCount}
          votePercentage={props.votePercentage}
        />
      )}
      renderVotePanel={(props) => (
        <VotePanel
          battleId={props.battleId}
          contenderA={props.contenderA}
          contenderB={props.contenderB}
          disabled={props.disabled}
          onVote={props.onVote}
          voterEligibility={props.voterEligibility}
          isEligible={props.isEligible}
        />
      )}
      renderRubricPanel={(props) => (
        <RubricPanel
          criteria={props.criteria}
          scorecardA={props.scorecardA}
          scorecardB={props.scorecardB}
          verdictsA={props.verdictsA}
          verdictsB={props.verdictsB}
        />
      )}
      renderResultBanner={(props) => (
        <ResultBanner
          winnerName={props.winnerName}
          winnerSlot={props.winnerSlot}
          voteA={props.voteA}
          voteB={props.voteB}
        />
      )}
      renderShareCard={(props) => (
        <BattleShareCard
          battleSlug={props.battleSlug}
          battleTitle={props.battleTitle}
          winnerName={props.winnerName}
          ogImageUrl={props.ogImageUrl}
        />
      )}
      renderStatusBadge={(props) => (
        <BattleStatusBadge status={props.status as BattleStatus} />
      )}
    />
    {slug && <RematchButton slug={slug} />}
    {slug && <BattleAdminModerationLink slug={slug} />}
    {verifiedSubmissions.length > 0 && (
      <div className="mt-6 px-4 space-y-3 max-w-2xl mx-auto">
        <h3 className="text-sm font-medium text-muted-foreground">Execution Trust</h3>
        {verifiedSubmissions.map((te) => (
          <TrustMetadataPanel key={te.submissionId} trustEvaluation={te} />
        ))}
      </div>
    )}
    </>
  )
}
