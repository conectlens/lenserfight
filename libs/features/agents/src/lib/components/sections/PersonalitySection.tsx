import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService, agentsService } from '@lenserfight/data/repositories'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { PersonalityProfileDrawer } from '../drawers/PersonalityProfileDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard } from './_shared'
import { SectionPage } from './SectionPage'

import type { AgentPersonalityProfileRecord } from '@lenserfight/types'

export const PersonalitySection: React.FC = () => {
  const { bootstrap, profile, isOwner, agentProfile } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const activeAiLenserId = bootstrap?.ai_lenser_id ?? agentProfile?.ai_lenser_id ?? ''
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<AgentPersonalityProfileRecord | null>(null)
  const [confirmState, setConfirmState] = useState<{
    title: string
    body: string
    onConfirm: () => void
  } | null>(null)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    setNoteText(agentProfile?.personality_note ?? '')
  }, [agentProfile?.personality_note])

  const saveNote = useMutation({
    mutationFn: () =>
      agentsService.updatePersonality(activeAiLenserId, noteText),
    onSuccess: () => {
      toast.success('Personality note saved')
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detailByProfile(profile.id),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
      })
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const profiles =
    (bootstrap?.profiles.personality as
      | AgentPersonalityProfileRecord[]
      | undefined) ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const remove = useMutation({
    mutationFn: (id: string) =>
      agentWorkspaceService.deletePersonalityProfile(id),
    onSuccess: () => { toast.success('Personality profile deleted'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })

  return (
    <SectionPage
      eyebrow="Personality"
      title="Personality &amp; communication style"
      description="Shape how the agent communicates, reasons, and escalates. The global note applies to every run. Personality profiles layer structured overrides on top for specific workflows or teams."
      toolbar={
        isOwner && bootstrap ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setDrawerOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
          >
            <Plus size={16} />
            New personality profile
          </button>
        ) : undefined
      }
    >
      {isOwner && (
        <ProfileCard
          title="Global personality note"
          subtitle="Free-form description of this agent's role, tone, and baseline behavior. Applied to every run unless overridden by a profile."
        >
          <div className="space-y-3">
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. You are a helpful assistant that prioritizes clear, concise answers. Always ask clarifying questions before taking irreversible actions."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 resize-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => saveNote.mutate()}
              disabled={saveNote.isPending || !activeAiLenserId}
              className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {saveNote.isPending ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </ProfileCard>
      )}

      <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Global note vs. personality profiles</h3>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          The <strong className="font-semibold text-gray-800 dark:text-gray-100">global note</strong> is a
          free-text baseline applied to every run. <strong className="font-semibold text-gray-800 dark:text-gray-100">Personality
          profiles</strong> add structured overrides — tone, expertise level, autonomy posture, escalation
          rules — that can be scoped to a specific workflow or team graph.
          Profiles cannot grant tools or memory access; they only shape communication and reasoning.
        </p>
      </div>

      {profiles.length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList size={20} />}
          title="No personality profiles yet"
          description="Profiles let owners tune tone, expertise, autonomy, and escalation rules per workflow or team."
        >
          {isOwner && bootstrap ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setDrawerOpen(true)
                }}
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
              >
                Create personality profile
              </button>
            </div>
          ) : undefined}
        </EmptyPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {p.tone} · {p.expertise_level} · {p.autonomy_level}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p)
                        setDrawerOpen(true)
                      }}
                      className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmState({
                          title: 'Delete personality profile?',
                          body: `Delete "${p.name}"? This cannot be undone.`,
                          onConfirm: () => remove.mutate(p.id),
                        })
                      }
                      className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-red-600 dark:border-gray-700 dark:text-gray-400"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {p.system_prompt_patch}
              </p>
            </div>
          ))}
        </div>
      )}

      {isOwner && bootstrap && (
        <PersonalityProfileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          aiLenserId={bootstrap.ai_lenser_id}
          initial={editing}
          onSaved={invalidate}
        />
      )}

      <AlertDialog
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title ?? ''}
        bodyText={confirmState?.body}
        variant="destructive"
        confirmAction={{
          label: 'Delete',
          onClick: () => { confirmState?.onConfirm(); setConfirmState(null) },
          loading: remove.isPending,
        }}
      />
    </SectionPage>
  )
}
