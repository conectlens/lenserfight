import { Clock3, GitBranch, Lock, ImageIcon, Video, Mic, Music, AlignLeft } from 'lucide-react'
import React from 'react'

import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { WorkflowScheduleRecord } from '@lenserfight/types'

interface AILenserWorkflowPanelProps {
  workflows: WorkflowRecord[]
  schedules: WorkflowScheduleRecord[]
  onOpenWorkflow: (workflowId: string) => void
}

// ─── Output-modality pill ─────────────────────────────────────────────────────

type ModalityKey = 'text' | 'image' | 'video' | 'audio' | 'music'

const MODALITY_META: Record<ModalityKey, { label: string; Icon: React.ElementType; className: string }> = {
  text:  { label: 'Text',  Icon: AlignLeft, className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  image: { label: 'Image', Icon: ImageIcon, className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  video: { label: 'Video', Icon: Video,     className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  audio: { label: 'Audio', Icon: Mic,       className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  music: { label: 'Music', Icon: Music,     className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
}

function ModalityPill({ modality }: { modality: string }) {
  const meta = MODALITY_META[modality as ModalityKey]
  if (!meta) return null
  const { label, Icon, className } = meta
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${className}`}>
      <Icon size={9} />
      {label}
    </span>
  )
}

function ModalityRow({ modalities }: { modalities: string[] }) {
  const unique = [...new Set(modalities.filter(Boolean))]
  if (unique.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {unique.map((m) => <ModalityPill key={m} modality={m} />)}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AILenserWorkflowPanel: React.FC<AILenserWorkflowPanelProps> = ({
  workflows,
  schedules,
  onOpenWorkflow,
}) => {
  const scheduleCountByWorkflow = schedules.reduce<Record<string, number>>((acc, schedule) => {
    acc[schedule.workflow_id] = (acc[schedule.workflow_id] ?? 0) + 1
    return acc
  }, {})

  const activeScheduleCountByWorkflow = schedules
    .filter((s) => s.is_active)
    .reduce<Record<string, number>>((acc, schedule) => {
      acc[schedule.workflow_id] = (acc[schedule.workflow_id] ?? 0) + 1
      return acc
    }, {})

  if (workflows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        This AI workspace does not own any workflows yet.
      </div>
    )
  }

  // Summarise modalities across all workflows for the header row
  const allModalities = [...new Set(
    workflows.flatMap((w) => w.output_modalities ?? []).filter(Boolean)
  )]

  return (
    <div className="flex flex-col gap-6">
      {/* Cross-workflow media summary — only shown when generative modalities exist */}
      {allModalities.some((m) => m !== 'text') && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Generates:</span>
          <ModalityRow modalities={allModalities} />
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {workflows.map((workflow) => {
          const modalities = workflow.output_modalities ?? []
          const hasMedia = modalities.some((m) => m !== 'text')
          const totalSchedules = scheduleCountByWorkflow[workflow.id] ?? 0
          const activeSchedules = activeScheduleCountByWorkflow[workflow.id] ?? 0

          return (
            <div key={workflow.id} className="space-y-3">
              <button
                onClick={() => onOpenWorkflow(workflow.id)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-primary-yellow-500 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 flex items-start gap-3">
                  {/* Icon — coloured for generative workflows */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    hasMedia
                      ? 'bg-violet-50 dark:bg-violet-900/20'
                      : 'bg-gray-100 dark:bg-gray-700/70'
                  }`}>
                    <GitBranch size={16} className={hasMedia ? 'text-violet-500' : 'text-gray-500 dark:text-gray-300'} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{workflow.title}</p>
                      {workflow.visibility === 'private' && (
                        <Lock size={12} className="text-gray-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Output modality pills */}
                    {modalities.length > 0 && (
                      <div className="mt-1">
                        <ModalityRow modalities={modalities} />
                      </div>
                    )}

                    {workflow.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                        {workflow.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{workflow.node_count ?? 0} lenses</span>
                  <span>{workflow.visibility}</span>
                </div>
              </button>

              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
                <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Clock3 size={14} />
                  {activeSchedules} of {totalSchedules} schedule{totalSchedules === 1 ? '' : 's'} active
                </span>
                <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <GitBranch size={14} />
                  {workflow.node_count ?? 0} lenses
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
