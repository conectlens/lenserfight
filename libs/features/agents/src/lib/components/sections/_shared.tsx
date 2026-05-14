import { Bot, ChevronRight } from 'lucide-react'
import React from 'react'

import type {
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
} from '@lenserfight/types'

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString()
}

export function StatCard({
  label,
  value,
  detail,
  action,
}: {
  label: string
  value: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{detail}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function ProfileCard({
  title,
  subtitle,
  children,
  toolbar,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  toolbar?: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
        {toolbar}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export function TeamBoard({
  team,
  members,
  edges,
}: {
  team: AgentTeamRecord
  members: AgentTeamMemberRecord[]
  edges: AgentTeamEdgeRecord[]
}) {
  if (members.length <= 1) {
    const member = members[0]
    return (
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          Single agent operating view
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
          {team.name}
        </h3>
        <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {member?.role ?? 'Lead operator'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {member?.responsibility || 'Primary operator for this workspace.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const lanes = Array.from(new Set(members.map((m) => m.lane))).sort(
    (a, b) => a - b
  )

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Agent team graph
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {team.name}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {edges.length} communication edges
        </p>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {lanes.map((lane) => (
          <div
            key={lane}
            className="rounded-[24px] border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Lane {lane + 1}
            </p>
            <div className="mt-4 space-y-3">
              {members
                .filter((m) => m.lane === lane)
                .map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {member.role}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {member.responsibility || 'No responsibility set yet.'}
                        </p>
                      </div>
                      <span className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        Sort {member.sort_order}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      {edges.length > 0 && (
        <div className="mt-6 rounded-[24px] border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Delegation and handoff edges
          </p>
          <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {edges.map((edge) => (
              <div key={edge.id} className="flex items-center gap-2">
                <span className="font-medium">{edge.edge_type}</span>
                <ChevronRight size={14} className="text-gray-400" />
                <span>
                  {edge.is_blocking
                    ? 'blocking dependency'
                    : 'parallel-safe handoff'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
