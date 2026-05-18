import type { AgentProfileView } from '@lenserfight/data/repositories'
import type { AgentTeamMemberRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { Bot, ChevronRight, GripVertical, Plus } from 'lucide-react'
import React, { useState } from 'react'

interface AgentPalettePanelProps {
  agents: AgentProfileView[]
  members: AgentTeamMemberRecord[]
  loading?: boolean
  disabled?: boolean
  onAdd: (agentId: string) => void
  onCreateAgent?: () => void
}

export const AgentPalettePanel: React.FC<AgentPalettePanelProps> = ({
  agents,
  members,
  loading,
  disabled,
  onAdd,
  onCreateAgent,
}) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={[
        'pointer-events-none absolute inset-y-0 left-0 z-10 flex transition-all duration-300',
      ].join(' ')}
    >
      {/* Collapsed tab */}
      <button
        type="button"
        title={expanded ? 'Collapse palette' : 'Expand palette'}
        onClick={() => setExpanded((v) => !v)}
        className={[
          'pointer-events-auto flex w-9 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 self-stretch rounded-l-none rounded-r-2xl border-y border-r border-gray-200 bg-white/95 text-gray-500 shadow-sm backdrop-blur-sm transition hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/95 dark:hover:text-white',
          expanded ? 'rounded-r-none border-r-0' : '',
        ].join(' ')}
      >
        <ChevronRight
          size={14}
          className={['transition-transform duration-300', expanded ? 'rotate-180' : ''].join(' ')}
        />
        <span
          className="origin-center -rotate-90 text-[10px] font-semibold uppercase tracking-widest"
          style={{ writingMode: 'vertical-rl' }}
        >
        </span>
      </button>

      {/* Expanded panel */}
      <div
        className={[
          'pointer-events-auto flex flex-col overflow-hidden rounded-r-2xl border border-gray-200 bg-white/95 shadow-md backdrop-blur-sm transition-all duration-300 dark:border-gray-700 dark:bg-gray-900/95',
          expanded ? 'w-56 opacity-100' : 'w-0 opacity-0',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Agent palette</span>
          <span className="text-[10px] text-gray-400">{agents.length} agents</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="space-y-2 px-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <Bot size={20} className="text-gray-400" />
              <p className="text-xs text-gray-500 dark:text-gray-400">No agents yet</p>
              {onCreateAgent && (
                <Button
                  type="button"
                  variant="dark"
                  size="sm"
                  className="mt-1"
                  onClick={onCreateAgent}
                >
                  Create agent
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 px-2">
              {agents.map((agent) => {
                const onCanvas = members.some((m) => m.agent_id === agent.ai_lenser_id)
                return (
                  <PaletteChip
                    key={agent.ai_lenser_id}
                    agent={agent}
                    onCanvas={onCanvas}
                    disabled={disabled || false}
                    onAdd={() => onAdd(agent.ai_lenser_id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const PaletteChip: React.FC<{
  agent: AgentProfileView
  onCanvas: boolean
  disabled: boolean
  onAdd: () => void
}> = ({ agent, onCanvas, disabled, onAdd }) => {
  const initials = (agent.display_name || agent.handle).slice(0, 2).toUpperCase()

  return (
    <div
      draggable={!disabled && !onCanvas}
      onDragStart={(e) => {
        e.dataTransfer.setData('agent-id', agent.ai_lenser_id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={[
        'flex items-center gap-2 rounded-xl border px-2 py-2 text-xs transition',
        onCanvas
          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-700/40 dark:bg-emerald-900/20'
          : 'cursor-grab border-gray-200 bg-gray-50 hover:border-primary-yellow-300 hover:bg-primary-yellow-50/50 active:cursor-grabbing dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-primary-yellow-600',
      ].join(' ')}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-[10px] font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900 dark:text-white">
          {agent.display_name || `@${agent.handle}`}
        </p>
        <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">
          @{agent.handle}
        </p>
      </div>
      {onCanvas ? (
        <span className="size-2 shrink-0 rounded-full bg-emerald-500" title="On canvas" />
      ) : disabled ? null : (
        <Button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdd() }}
          title="Add to canvas"
          className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:text-primary-yellow-600 dark:hover:text-primary-yellow-400"
        >
          <Plus size={12} />
        </Button>
      )}
      {!onCanvas && !disabled && (
        <GripVertical size={12} className="shrink-0 text-gray-300 dark:text-gray-600" />
      )}
    </div>
  )
}
