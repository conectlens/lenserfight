import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import type { AgentTeamEdgeRecord, AgentTeamEdgeType, AgentTeamMemberRecord } from '@lenserfight/types'
import { Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface TeamEdgesDrawerProps {
  open: boolean
  onClose: () => void
  teamId: string
  members: AgentTeamMemberRecord[]
  edges: AgentTeamEdgeRecord[]
  onChanged?: () => void
}

const EDGE_TYPES: AgentTeamEdgeType[] = [
  'delegates',
  'reviews',
  'reports_to',
  'shares_context',
  'handoff',
]

export const TeamEdgesDrawer: React.FC<TeamEdgesDrawerProps> = ({
  open,
  onClose,
  teamId,
  members,
  edges,
  onChanged,
}) => {
  const [sourceMemberId, setSourceMemberId] = useState('')
  const [targetMemberId, setTargetMemberId] = useState('')
  const [edgeType, setEdgeType] = useState<AgentTeamEdgeType>('delegates')
  const [isBlocking, setIsBlocking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSourceMemberId(members[0]?.id ?? '')
    setTargetMemberId(members[1]?.id ?? members[0]?.id ?? '')
    setEdgeType('delegates')
    setIsBlocking(false)
    setError(null)
  }, [open, members])

  const memberLabel = (m: AgentTeamMemberRecord) => `${m.role} (lane ${m.lane})`

  const handleAdd = async () => {
    if (!sourceMemberId || !targetMemberId) {
      setError('Select source and target members.')
      return
    }
    if (sourceMemberId === targetMemberId) {
      setError('Source and target must be different members.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await agentWorkspaceService.upsertTeamEdge({
        team_id: teamId,
        source_member_id: sourceMemberId,
        target_member_id: targetMemberId,
        edge_type: edgeType,
        is_blocking: isBlocking,
      })
      onChanged?.()
      setError(null)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to add edge')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (edgeId: string) => {
    setDeletingId(edgeId)
    try {
      await agentWorkspaceService.deleteTeamEdge(edgeId)
      onChanged?.()
    } catch {
      // silent — edge list will refresh on next open
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" width="w-[560px]" title="Delegation edges">
      <div className="space-y-6">
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Add edge
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source member">
                <select
                  value={sourceMemberId}
                  onChange={(e) => setSourceMemberId(e.target.value)}
                  className={inputClass}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Target member">
                <select
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className={inputClass}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Edge type">
                <select
                  value={edgeType}
                  onChange={(e) => setEdgeType(e.target.value as AgentTeamEdgeType)}
                  className={inputClass}
                >
                  {EDGE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Blocking">
                <div className="flex h-[42px] items-center">
                  <input
                    type="checkbox"
                    checked={isBlocking}
                    onChange={(e) => setIsBlocking(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-amber-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                    Block run until edge completes
                  </span>
                </div>
              </Field>
            </div>
            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAdd}
                disabled={submitting || members.length < 2}
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
              >
                {submitting ? 'Adding…' : 'Add edge'}
              </button>
            </div>
          </div>
        </section>

        {edges.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Existing edges
            </p>
            <div className="space-y-2">
              {edges.map((edge) => {
                const src = members.find((m) => m.id === edge.source_member_id)
                const tgt = members.find((m) => m.id === edge.target_member_id)
                return (
                  <div
                    key={edge.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {src ? memberLabel(src) : edge.source_member_id.slice(0, 8)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {tgt ? memberLabel(tgt) : edge.target_member_id.slice(0, 8)}
                      </span>
                      <span className="rounded-full border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                        {edge.edge_type}
                      </span>
                      {edge.is_blocking && (
                        <span className="rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-600 dark:border-red-500/30 dark:text-red-400">
                          blocking
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(edge.id)}
                      disabled={deletingId === edge.id}
                      aria-label="Delete edge"
                      className="ml-3 flex-shrink-0 rounded-xl p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    {children}
  </label>
)
