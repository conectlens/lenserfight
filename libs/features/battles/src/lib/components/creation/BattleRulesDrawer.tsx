import { Badge, Button } from '@lenserfight/ui/components'
import { Drawer } from '@lenserfight/ui/overlays'
import { battlesService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { GitBranch, Layers, Clock, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import React, { useState } from 'react'

import { BattleStatusBadge } from '../display/BattleStatusBadge'
import type { Battle, BattleType, Contender, VoterEligibility } from '../../types/battle.types'
import type { LensContextDetail } from '../../types/battle-layout.types'

// ─── Labels ──────────────────────────────────────────────────────────────────

const BATTLE_TYPE_LABELS: Record<BattleType, string> = {
  ai_vs_ai: 'AI vs AI',
  human_vs_human_ai_votes: 'Human vs Human · AI Judge',
  human_vs_human_open_votes: 'Human vs Human · Open Vote',
  human_vs_ai: 'Human vs AI',
  workflow_battle: 'Workflow Battle',
  lenser_battle: 'Lenser Battle',
}

const VOTER_ELIGIBILITY_LABELS: Record<VoterEligibility, string> = {
  open: 'Open — anyone can vote',
  human_only: 'Humans only',
  ai_only: 'AI judge only',
  verified_lenser: 'Verified lensers only',
  lenser_only: 'Lensers only',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-greyscale-400">{label}</p>
      <div className="text-sm text-greyscale-700 dark:text-greyscale-300">{children}</div>
    </div>
  )
}

// ─── Manage panel (owner only) ───────────────────────────────────────────────

function ManagePanel({ battle, onMutated }: { battle: Battle; onMutated: () => void }) {
  const [open, setOpen] = useState(false)
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
    <div className="border-t border-surface-border pt-4 space-y-3">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left text-sm font-semibold text-greyscale-700 dark:text-greyscale-200"
        onClick={() => setOpen((p) => !p)}
      >
        <Shield size={14} className="text-greyscale-400" />
        Manage Battle
        {open ? <ChevronUp size={14} className="ml-auto text-greyscale-400" /> : <ChevronDown size={14} className="ml-auto text-greyscale-400" />}
      </button>

      {open && (
        <div className="space-y-2 pl-5">
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
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BattleRulesDrawerProps {
  open: boolean
  onClose: () => void
  battle: Battle
  isOwner: boolean
  lensDetails?: Record<string, LensContextDetail | null>
  contenders?: Contender[]
}

export function BattleRulesDrawer({ open, onClose, battle, isOwner, lensDetails, contenders }: BattleRulesDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-80 sm:w-96"
      title="Battle Rules"
    >
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Status */}
        <div className="flex items-center gap-2">
          <BattleStatusBadge status={battle.status} />
          <span className="text-xs text-greyscale-400">Current status</span>
        </div>

        {/* Format */}
        <Section label="Format">
          <span className="font-medium">{BATTLE_TYPE_LABELS[battle.battle_type] ?? battle.battle_type}</span>
        </Section>

        {/* Voters */}
        <Section label="Voters">
          {VOTER_ELIGIBILITY_LABELS[battle.voter_eligibility] ?? battle.voter_eligibility}
        </Section>

        {/* Prompt */}
        <Section label="Task Prompt">
          <p className="leading-relaxed whitespace-pre-wrap break-words">{battle.task_prompt}</p>
        </Section>

        {/* Timing */}
        {(battle.voting_opens_at || battle.voting_closes_at) && (
          <Section label="Timing">
            <div className="space-y-1">
              {battle.voting_opens_at && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-greyscale-400 flex-shrink-0" />
                  <span>Voting opens: {formatDate(battle.voting_opens_at)}</span>
                </div>
              )}
              {battle.voting_closes_at && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-greyscale-400 flex-shrink-0" />
                  <span>Voting closes: {formatDate(battle.voting_closes_at)}</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Linked workflow */}
        {battle.workflow_id && (
          <Section label="Workflow">
            <Badge color="blue" variant="outline">
              <GitBranch size={11} className="mr-1" />
              Workflow linked
            </Badge>
          </Section>
        )}

        {/* Linked lens — show per-contender titles when available */}
        {battle.lens_id && (
          <Section label="Lens">
            {contenders && contenders.length > 0 ? (
              <div className="space-y-2">
                {contenders.map((c) => {
                  const detail = lensDetails?.[c.id]
                  return (
                    <div key={c.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-greyscale-500 w-10 flex-shrink-0">
                        Slot {c.slot}
                      </span>
                      {detail ? (
                        <>
                          <span className="text-sm font-medium text-greyscale-800 dark:text-greyscale-200 truncate">
                            {detail.lensTitle}
                          </span>
                          {detail.versionNumber != null && (
                            <span className="text-[11px] text-greyscale-400">v{detail.versionNumber}</span>
                          )}
                          {detail.paramCount > 0 && (
                            <Badge color="yellow" variant="outline">
                              <Layers size={10} className="mr-1" />
                              {detail.paramCount}p
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge color="yellow" variant="outline">
                          <Layers size={11} className="mr-1" />
                          Lens linked
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <Badge color="yellow" variant="outline">
                <Layers size={11} className="mr-1" />
                Lens linked
              </Badge>
            )}
          </Section>
        )}

        {/* Owner management */}
        {isOwner && (
          <ManagePanel battle={battle} onMutated={onClose} />
        )}
      </div>
    </Drawer>
  )
}
