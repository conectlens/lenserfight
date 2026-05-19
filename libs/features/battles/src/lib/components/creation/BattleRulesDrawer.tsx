import { Badge } from '@lenserfight/ui/components'
import { Drawer } from '@lenserfight/ui/overlays'
import { workflowsRepository } from '@lenserfight/data/repositories'
import type { WorkflowBootstrapRecord } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import {
  TASK_SOURCE_LABEL,
  CONTENDER_STRUCTURE_LABEL,
  JUDGING_MODE_LABEL,
  MEMORY_MODE_LABELS,
  INSTRUCTION_DISCLOSURE_LABELS,
  getChallengeType,
} from '@lenserfight/domain/battle-governance'
import type { TaskSource, ContenderStructure, JudgingMode } from '@lenserfight/domain/battle-governance'
import {
  GitBranch,
  Layers,
  Clock,
  Info,
  Swords,
  Users,
  Trophy,
  Cpu,
  Puzzle,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Timer,
} from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

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

function formatSeconds(seconds: number | null): string {
  if (!seconds) return 'No limit'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
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

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="mt-0.5 flex-shrink-0 text-greyscale-400" />
      <div className="min-w-0 flex-1">
        <span className="text-xs text-greyscale-400">{label}: </span>
        <span className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300">{value}</span>
      </div>
    </div>
  )
}

// ─── WorkflowSection ─────────────────────────────────────────────────────────

function WorkflowSection({ workflowId }: { workflowId: string }) {
  const { data: bootstrap, isLoading } = useQuery<WorkflowBootstrapRecord | null>({
    queryKey: ['battle-rules-workflow', workflowId],
    queryFn: () => workflowsRepository.getBootstrap(workflowId),
    staleTime: 1000 * 60 * 5,
  })

  const wf = bootstrap?.workflow
  const nodes = bootstrap?.nodes ?? []
  const sortedNodes = [...nodes].sort((a, b) => a.ordinal - b.ordinal)

  return (
    <Section label="Workflow">
      {isLoading && (
        <div className="space-y-2">
          <div className="h-14 rounded-2xl bg-surface-raised animate-pulse" />
          <div className="h-10 rounded-xl bg-surface-raised animate-pulse" />
        </div>
      )}

      {!isLoading && wf && (
        <div className="space-y-3">
          {/* Workflow card */}
          <div className="rounded-2xl border border-surface-border bg-surface-raised p-3 space-y-2">
            <div className="flex items-start gap-2.5">
              <GitBranch size={14} className="mt-0.5 flex-shrink-0 text-primary-yellow-600 dark:text-primary-yellow-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                  {wf.title}
                </p>
                {wf.description && (
                  <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400 line-clamp-2">
                    {wf.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-greyscale-500 dark:text-greyscale-400">
              {typeof wf.node_count === 'number' && (
                <span>{wf.node_count} node{wf.node_count !== 1 ? 's' : ''}</span>
              )}
              {wf.output_modalities && wf.output_modalities.length > 0 && (
                <div className="flex items-center gap-1">
                  {wf.output_modalities.map((m) => (
                    <span
                      key={m}
                      className="rounded border border-surface-border bg-surface-base px-1.5 py-0.5 font-mono text-[10px] capitalize text-greyscale-500 dark:text-greyscale-400"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Link
              to={`/workflows/${workflowId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-yellow-600 dark:text-primary-yellow-400 hover:underline"
            >
              View Workflow
              <ExternalLink size={11} />
            </Link>
          </div>

          {/* Node list */}
          {sortedNodes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-greyscale-400">
                Nodes ({sortedNodes.length})
              </p>
              <div className="space-y-1">
                {sortedNodes.map((node, idx) => (
                  <div
                    key={node.id}
                    className="flex items-start gap-2 rounded-xl border border-surface-border bg-surface-base px-2.5 py-2"
                  >
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary-yellow-500/15 text-[9px] font-bold text-primary-yellow-700 dark:text-primary-yellow-300">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-greyscale-800 dark:text-greyscale-200">
                        {node.label ?? `Node ${node.ordinal}`}
                      </p>
                      {node.lens_id && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <Layers size={10} className="flex-shrink-0 text-greyscale-400" />
                          <span className="text-[10px] text-greyscale-400 font-mono truncate">{node.lens_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && !wf && (
        <Badge color="blue" variant="outline">
          <GitBranch size={11} className="mr-1" />
          Workflow linked
        </Badge>
      )}
    </Section>
  )
}

// ─── LensSection ─────────────────────────────────────────────────────────────

function LensSection({
  battle,
  contenders,
  lensDetails,
}: {
  battle: Battle
  contenders?: Contender[]
  lensDetails?: Record<string, LensContextDetail | null>
}) {
  const sharedParams = battle.shared_input_snapshot
    ? Object.entries(battle.shared_input_snapshot).filter(([, v]) => v !== undefined && v !== null && v !== '')
    : []

  return (
    <div className="space-y-3">
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

      {sharedParams.length > 0 && (
        <Section label="Shared Parameters">
          <div className="space-y-1.5 rounded-xl border border-surface-border bg-surface-raised p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-greyscale-500 dark:text-greyscale-400">
              <Info size={11} className="text-primary-yellow-500 flex-shrink-0" />
              All contenders receive these identical inputs.
            </div>
            {sharedParams.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-[11px] font-semibold text-greyscale-500 min-w-0 shrink-0 max-w-[40%] truncate">
                  {key}
                </span>
                <span className="text-[11px] text-greyscale-700 dark:text-greyscale-300 min-w-0 break-words">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ─── ChallengeSection ────────────────────────────────────────────────────────

function ChallengeSection({ challengeTypeId }: { challengeTypeId: string }) {
  const def = getChallengeType(challengeTypeId)
  if (!def) {
    return (
      <Section label="Challenge">
        <Badge color="gray" variant="outline">
          <Puzzle size={11} className="mr-1" />
          {challengeTypeId}
        </Badge>
      </Section>
    )
  }

  return (
    <Section label="Challenge">
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-3 space-y-3">
        <div className="flex items-start gap-2.5">
          <Puzzle size={14} className="mt-0.5 flex-shrink-0 text-primary-yellow-600 dark:text-primary-yellow-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
              {def.label}
            </p>
            <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400 leading-relaxed">
              {def.description}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-surface-border pt-2.5">
          <Row icon={Timer} label="Time limit" value={formatSeconds(def.timeLimitDefault)} />
          <Row
            icon={CheckCircle2}
            label="Scoring"
            value={
              <span className="flex flex-wrap gap-1">
                {def.scoringOptions.map((mode) => (
                  <span
                    key={mode}
                    className="rounded border border-surface-border bg-surface-base px-1.5 py-0.5 text-[10px] font-medium text-greyscale-600 dark:text-greyscale-400"
                  >
                    {JUDGING_MODE_LABEL[mode as JudgingMode] ?? mode}
                  </span>
                ))}
              </span>
            }
          />
          {def.localeDependent && (
            <Row
              icon={Info}
              label="Note"
              value={<span className="text-greyscale-500">Language-specific</span>}
            />
          )}
          {!def.implemented && (
            <div className="flex items-center gap-1.5 rounded-lg border border-status-yellow/30 bg-status-yellow/5 px-2.5 py-1.5 text-[11px] text-status-yellow">
              <AlertTriangle size={11} className="flex-shrink-0" />
              This challenge type is not yet available.
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

// ─── HandicapSection ─────────────────────────────────────────────────────────

function HandicapSection({ config }: { config: Battle['handicap_config'] }) {
  const entries: Array<{ label: string; value: string }> = []

  if (config?.injected_delay_ms) {
    entries.push({ label: 'Response delay', value: `${config.injected_delay_ms as number}ms` })
  }
  if (config?.time_budget_ms) {
    entries.push({ label: 'Time budget', value: `${Math.round((config.time_budget_ms as number) / 1000)}s` })
  }
  if (config?.max_context_tokens) {
    entries.push({ label: 'Context limit', value: `${(config.max_context_tokens as number).toLocaleString()} tokens` })
  }
  if (config?.max_tokens_per_second) {
    entries.push({ label: 'Speed cap', value: `${config.max_tokens_per_second as number} tok/s` })
  }
  if (config?.allowed_model_tier) {
    entries.push({ label: 'Tier limit', value: String(config.allowed_model_tier) })
  }

  if (entries.length === 0) return null

  return (
    <Section label="AI Handicap">
      <div className="space-y-1.5 rounded-xl border border-surface-border bg-surface-raised p-3">
        {entries.map(({ label, value }) => (
          <Row key={label} icon={Cpu} label={label} value={value} />
        ))}
      </div>
    </Section>
  )
}

// ─── LenserPolicySection ──────────────────────────────────────────────────────

function LenserPolicySection({ policy }: { policy: Record<string, unknown> }) {
  const memoryMode = policy.memory_mode as string | undefined
  const disclosure = policy.instruction_disclosure as string | undefined

  if (!memoryMode && !disclosure) return null

  return (
    <Section label="Lenser Battle Policy">
      <div className="space-y-1.5 rounded-xl border border-surface-border bg-surface-raised p-3">
        {memoryMode && (
          <Row
            icon={Trophy}
            label="Memory mode"
            value={MEMORY_MODE_LABELS[memoryMode as keyof typeof MEMORY_MODE_LABELS] ?? memoryMode}
          />
        )}
        {disclosure && (
          <Row
            icon={Info}
            label="Instructions"
            value={INSTRUCTION_DISCLOSURE_LABELS[disclosure as keyof typeof INSTRUCTION_DISCLOSURE_LABELS] ?? disclosure}
          />
        )}
      </div>
    </Section>
  )
}

// ─── BattleRulesSection ───────────────────────────────────────────────────────

function BattleRulesSection({ battle }: { battle: Battle }) {
  const taskSource = battle.task_source as TaskSource | null | undefined
  const contenderStructure = battle.contender_structure as ContenderStructure | null | undefined
  const judgingMode = battle.judging_mode as JudgingMode | null | undefined
  const hasV2 = !!(taskSource || contenderStructure || judgingMode)

  // Choose icons by task source
  const TaskIcon = taskSource === 'workflow' ? GitBranch
    : taskSource === 'challenge' ? Puzzle
    : Layers

  return (
    <Section label="Battle Format">
      <div className="space-y-1.5 rounded-xl border border-surface-border bg-surface-raised p-3">
        {hasV2 ? (
          <>
            {taskSource && (
              <Row
                icon={TaskIcon}
                label="Task"
                value={TASK_SOURCE_LABEL[taskSource] ?? taskSource}
              />
            )}
            {contenderStructure && (
              <Row
                icon={Users}
                label="Contenders"
                value={CONTENDER_STRUCTURE_LABEL[contenderStructure] ?? contenderStructure}
              />
            )}
            {judgingMode && (
              <Row
                icon={Swords}
                label="Judging"
                value={JUDGING_MODE_LABEL[judgingMode] ?? judgingMode}
              />
            )}
          </>
        ) : (
          // Fallback for battles created before Phase CS
          <Row
            icon={Swords}
            label="Type"
            value={BATTLE_TYPE_LABELS[battle.battle_type] ?? battle.battle_type}
          />
        )}
      </div>
    </Section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BattleRulesDrawerProps {
  open: boolean
  onClose: () => void
  battle: Battle
  lensDetails?: Record<string, LensContextDetail | null>
  contenders?: Contender[]
}

export function BattleRulesDrawer({ open, onClose, battle, lensDetails, contenders }: BattleRulesDrawerProps) {
  const taskSource = battle.task_source as TaskSource | null | undefined
  const hasAIContenders =
    battle.contender_structure === 'ai_vs_ai' || battle.contender_structure === 'human_vs_ai' ||
    battle.battle_type === 'ai_vs_ai' || battle.battle_type === 'human_vs_ai' ||
    battle.battle_type === 'workflow_battle' || battle.battle_type === 'lenser_battle'

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

        {/* Battle format (V2 axes or legacy type) */}
        <BattleRulesSection battle={battle} />

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

        {/* ── Type-specific sections ─────────────────────────────────────── */}

        {/* Workflow task */}
        {(taskSource === 'workflow' || battle.battle_type === 'workflow_battle') && battle.workflow_id && (
          <WorkflowSection workflowId={battle.workflow_id} />
        )}

        {/* Lens task */}
        {(taskSource === 'lens' || (!taskSource && battle.lens_id && battle.battle_type !== 'workflow_battle')) && (
          <LensSection battle={battle} contenders={contenders} lensDetails={lensDetails} />
        )}

        {/* Challenge task */}
        {(taskSource === 'challenge') && battle.challenge_type && (
          <ChallengeSection challengeTypeId={battle.challenge_type} />
        )}

        {/* Legacy: lens linked (no task_source, has lens_id, no contender lens details handled above) */}
        {!taskSource && battle.lens_id && battle.battle_type === 'lenser_battle' && (
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

        {/* AI Handicap */}
        {hasAIContenders && <HandicapSection config={battle.handicap_config} />}

        {/* Lenser Battle Policy */}
        {battle.lenser_battle_policy && Object.keys(battle.lenser_battle_policy).length > 0 && (
          <LenserPolicySection policy={battle.lenser_battle_policy} />
        )}


      </div>
    </Drawer>
  )
}
