import { useAuth } from '@lenserfight/features/auth/native'
import { useLenserOptional } from '@lenserfight/features/profile/native'
import {
  DetailSection,
  EmptyContentState,
  ErrorState,
  LoadingState,
  MobileButton,
} from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Chip, Text } from '@lenserfight/ui/primitives/native'
import { ARENA_BASE_URL } from '@lenserfight/utils/env'
import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, View } from 'react-native'

import { useAuthSheet } from '../../context/AuthSheetContext'
import {
  useBattleDetail,
  useBattleResult,
  useBattleVoteEligibility,
  useMyBattleVote,
  useSubmitBattleVote,
} from '../../hooks/useMobileContent'
import { getBattleTypeLabel } from '../../utils/battleTypeLabel'
import { screenStyles } from '../../styles/screenStyles'

// Maps real BattleStatus values to battles.status.* locale keys.
const STATUS_LABELS: Record<string, string> = {
  draft: 'draft',
  open: 'open',
  executing: 'executing',
  voting: 'voting',
  scoring: 'scoring',
  closed: 'closed',
  published: 'published',
  archived: 'archived',
}

const RESULT_STATUSES = new Set(['scoring', 'closed', 'published'])

export default function BattleDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { open: openAuthSheet } = useAuthSheet()
  const lenserId = useLenserOptional()?.lenser?.id

  const query = useBattleDetail(id)
  const battle = query.data

  const isResultStage =
    !!battle && (RESULT_STATUSES.has(battle.status) || battle.winner_contender_id != null)
  const isVotingOpen =
    !!battle &&
    battle.status === 'voting' &&
    (!battle.voting_closes_at || new Date(battle.voting_closes_at) > new Date())

  // Contenders + aggregates feed both the Result view and the Vote buttons
  // (which need contender names/ids), so fetch whenever either is shown.
  const resultQuery = useBattleResult(isResultStage || isVotingOpen ? id : '')
  const eligibilityQuery = useBattleVoteEligibility(
    isVotingOpen ? id : undefined,
    isVotingOpen ? lenserId : undefined
  )
  const myVoteQuery = useMyBattleVote(isVotingOpen && isAuthenticated ? id : undefined)
  const submitVote = useSubmitBattleVote(id)

  const openOnWeb = () => {
    Linking.openURL(`${ARENA_BASE_URL}/battles/${id}`)
  }

  const result = resultQuery.data
  const contenders = result?.contenders ?? []
  const aggregates = result?.aggregates ?? []
  const voteCountFor = (contenderId: string) =>
    aggregates.find((a) => a.contender_id === contenderId)?.raw_vote_count ?? 0

  // Derive the winner slot from the authoritative winner_contender_id by matching
  // contender ids — same id->slot mapping the web deriveBattleWinner uses.
  const winnerContender = battle?.winner_contender_id
    ? contenders.find((c) => c.id === battle.winner_contender_id)
    : undefined
  const winnerSlot = winnerContender?.slot ?? null

  const myVoteValue = myVoteQuery.data?.vote_value

  const castVote = (value: 'contender_a' | 'contender_b' | 'draw') => {
    if (!lenserId) return
    const votedContenderId =
      value === 'contender_a'
        ? (contenders.find((c) => c.slot === 'A')?.id ?? null)
        : value === 'contender_b'
        ? (contenders.find((c) => c.slot === 'B')?.id ?? null)
        : null
    submitVote.mutate({
      battle_id: id,
      voter_lenser_id: lenserId,
      vote_value: value,
      voted_contender_id: votedContenderId,
      is_draw: value === 'draw',
    })
  }

  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')

  return (
    <>
      <Stack.Screen options={{ title: t('battles.detail') }} />
      <SafeAreaContainer testID="battle-detail-screen">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={screenStyles.scroll}
        >
          {query.isLoading && <LoadingState label={t('states.loading')} />}
          {query.isError && (
            <ErrorState
              message={query.error.message}
              fallbackMessage={t('states.error')}
              retryLabel={t('states.retry')}
              onRetry={() => query.refetch()}
            />
          )}
          {!query.isLoading && !query.isError && !battle && (
            <EmptyContentState title={t('states.empty')} description={t('states.notFound')} />
          )}
          {battle && (
            <>
              <DetailSection title={battle.title}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip
                    label={t(
                      `battles.status.${STATUS_LABELS[battle.status] ?? battle.status}`,
                      battle.status
                    )}
                  />
                  <Chip label={getBattleTypeLabel(battle)} />
                </View>
                {battle.voting_opens_at && (
                  <Text variant="caption" color="muted">
                    {t('battles.timeLeft')}:{' '}
                    {new Date(battle.voting_closes_at ?? battle.voting_opens_at).toLocaleDateString()}
                  </Text>
                )}
              </DetailSection>

              {isResultStage && (
                <DetailSection title={t('battles.result.title')}>
                  {resultQuery.isLoading && <LoadingState label={t('states.loading')} />}
                  {!resultQuery.isLoading && winnerContender ? (
                    <Text variant="bodyL" weight="bold" color="success">
                      {t('battles.result.winner')}: {winnerContender.display_name}
                    </Text>
                  ) : (
                    !resultQuery.isLoading && (
                      <Text variant="bodyM" color="muted">
                        {battle.status === 'published' || battle.status === 'closed'
                          ? t('battles.result.tie')
                          : t('battles.result.pending')}
                      </Text>
                    )
                  )}
                  {contenders.map((c) => (
                    <View
                      key={c.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                      <Text variant="bodyM" style={{ flex: 1 }}>
                        {c.display_name}: {voteCountFor(c.id)} {t('battles.result.votes')}
                      </Text>
                      {winnerSlot === c.slot && (
                        <Chip label={t('battles.result.winner')} />
                      )}
                    </View>
                  ))}
                </DetailSection>
              )}

              {isVotingOpen && (
                <DetailSection title={t('battles.vote.title')}>
                  {!isAuthenticated ? (
                    <MobileButton
                      label={t('battles.vote.signInToVote')}
                      onPress={() => openAuthSheet('login')}
                    />
                  ) : (
                    <View style={{ gap: 8 }}>
                      {/* Eligibility is advisory: the check can return false on a
                          transient RPC error (swallowed in the repo) as well as
                          for genuine ineligibility, so we surface a hint instead
                          of hard-blocking. fn_submit_vote is the authoritative
                          gate and its rejection message reaches the UI below. */}
                      {eligibilityQuery.data === false && !eligibilityQuery.isError && (
                        <Text variant="bodyM" color="muted">
                          {t('battles.vote.ineligible')}
                        </Text>
                      )}
                      {contenderA && (
                        <MobileButton
                          label={t('battles.vote.voteFor', { name: contenderA.display_name })}
                          variant={myVoteValue === 'contender_a' ? 'primary' : 'outline'}
                          disabled={submitVote.isPending || myVoteValue === 'contender_a'}
                          onPress={() => castVote('contender_a')}
                        />
                      )}
                      {contenderB && (
                        <MobileButton
                          label={t('battles.vote.voteFor', { name: contenderB.display_name })}
                          variant={myVoteValue === 'contender_b' ? 'primary' : 'outline'}
                          disabled={submitVote.isPending || myVoteValue === 'contender_b'}
                          onPress={() => castVote('contender_b')}
                        />
                      )}
                      <MobileButton
                        label={t('battles.vote.draw')}
                        variant={myVoteValue === 'draw' ? 'primary' : 'ghost'}
                        disabled={submitVote.isPending || myVoteValue === 'draw'}
                        onPress={() => castVote('draw')}
                      />
                      {submitVote.isError && (
                        <Text variant="bodyS" color="error">
                          {(submitVote.error as Error).message}
                        </Text>
                      )}
                      {submitVote.isSuccess && (
                        <Text variant="bodyS" color="success">
                          {t('battles.vote.submitted')}
                        </Text>
                      )}
                    </View>
                  )}
                </DetailSection>
              )}

              <DetailSection title={t('battles.viewOnWeb')}>
                <Text variant="bodyM" color="muted">
                  {t('battles.webNote')}
                </Text>
                <MobileButton label={t('battles.viewOnWeb')} onPress={openOnWeb} />
              </DetailSection>
            </>
          )}
        </ScrollView>
      </SafeAreaContainer>
    </>
  )
}
