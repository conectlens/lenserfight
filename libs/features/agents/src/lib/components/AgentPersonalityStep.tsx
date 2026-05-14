import { lensesService } from '@lenserfight/data/repositories'
import { TextArea, Field, SearchSelectField } from '@lenserfight/ui/forms'
import { Button } from '@lenserfight/ui/components'
import type { LensViewModel } from '@lenserfight/types'
import { BookOpen, Plus } from 'lucide-react'
import React, { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export interface AgentPersonalityStepProps {
  /** Runtime ID of the AI lenser (agents.ai_lensers.id) */
  aiLenserId: string
  /** Handle of the agent profile — used to fetch agent-owned lenses */
  agentHandle: string
  /** Saved value — pre-fills the textarea on open */
  currentPersonalityNote: string | null
  /** Currently bound default lens ID */
  currentDefaultLensId: string | null
  /** Called when the user changes the note locally (parent holds pending state) */
  onPersonalityNoteChange: (note: string) => void
  /** Called when the user picks a lens locally (parent holds pending lens ID) */
  onLensSelect: (lensId: string | null) => void
  /** Opens the CreateLensModal for the agent workspace */
  onCreateLens: () => void
}

/**
 * Step content for the Agent Personality tab in AgentManageWizard.
 *
 * Renders a personality note textarea and a lens picker.
 * Does NOT persist — the parent wizard calls useAgentPersonality on Next/Done.
 */
export const AgentPersonalityStep: React.FC<AgentPersonalityStepProps> = ({
  agentHandle,
  currentPersonalityNote,
  currentDefaultLensId,
  onPersonalityNoteChange,
  onLensSelect,
  onCreateLens,
}) => {
  const queryClient = useQueryClient()
  const [note, setNote] = useState(currentPersonalityNote ?? '')
  const [selectedLensId, setSelectedLensId] = useState<string>(currentDefaultLensId ?? '')
  const [lenses, setLenses] = useState<LensViewModel[]>([])
  const [isLoadingLenses, setIsLoadingLenses] = useState(false)

  // Keep local state in sync with parent
  useEffect(() => { setNote(currentPersonalityNote ?? '') }, [currentPersonalityNote])
  useEffect(() => { setSelectedLensId(currentDefaultLensId ?? '') }, [currentDefaultLensId])

  const handleNoteChange = (value: string) => {
    setNote(value)
    onPersonalityNoteChange(value)
  }

  const handleLensChange = (lensId: string) => {
    setSelectedLensId(lensId)
    onLensSelect(lensId || null)
  }

  const handleDropdownOpen = useCallback(async () => {
    if (lenses.length > 0 || isLoadingLenses) return
    const cacheKey = ['instruction-lens-options', agentHandle]
    const cached = queryClient.getQueryData<LensViewModel[]>(cacheKey)
    if (cached) { setLenses(cached); return }

    setIsLoadingLenses(true)
    try {
      const [ownerResult, popularResult] = await Promise.all([
        lensesService.getLenserLenses(agentHandle, 0, 50),
        lensesService.sort('popular', 0, 50),
      ])
      const ownerLenses: LensViewModel[] = ownerResult ?? []
      const popularLenses: LensViewModel[] = popularResult.data ?? []

      const ownerIds = new Set(ownerLenses.map((l) => l.id))
      const merged = [
        ...ownerLenses,
        ...popularLenses.filter((l) => !ownerIds.has(l.id)),
      ]
      queryClient.setQueryData(cacheKey, merged)
      setLenses(merged)
    } finally {
      setIsLoadingLenses(false)
    }
  }, [agentHandle, lenses.length, isLoadingLenses, queryClient])

  const selectedLens = lenses.find((l) => l.id === selectedLensId)

  return (
    <div className="space-y-5">
      <Field
        id="agent-personality-note"
        label="Personality & role"
        hint="Describe this agent's role, tone, and behavioral rules. Injected alongside the instruction lens as system context."
      >
        <TextArea
          id="agent-personality-note"
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="You are a sharp debate strategist. Reply with concise, well-reasoned arguments. Avoid filler phrases. Maintain a confident but respectful tone."
          rows={4}
          maxLength={1000}
        />
        <p className="mt-1 text-right text-[10px] text-greyscale-400">{note.length}/1000</p>
      </Field>

      <Field
        id="agent-instruction-lens"
        label="Instruction lens"
        hint="Select a lens to use as this agent's default system prompt. Your lenses appear first, followed by popular public lenses."
      >
        <SearchSelectField
          id="agent-instruction-lens"
          label="Instruction lens"
          value={selectedLensId}
          onChange={handleLensChange}
          options={lenses.map((l) => ({ value: l.id, label: l.title }))}
          placeholder="Select a lens (optional)"
          searchPlaceholder="Search lenses…"
          isLoading={isLoadingLenses}
          onOpen={handleDropdownOpen}
        />

        {selectedLens && (
          <div className="mt-2 rounded-xl border border-surface-border bg-surface-raised p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <BookOpen size={12} className="text-greyscale-400 flex-shrink-0" />
              <p className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300 truncate">
                {selectedLens.title}
              </p>
            </div>
            {selectedLens.description && (
              <p className="text-[11px] text-greyscale-500 leading-relaxed line-clamp-2">
                {selectedLens.description}
              </p>
            )}
          </div>
        )}

        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateLens}
            className="gap-1.5 w-auto text-primary-yellow-600 hover:bg-primary-yellow-500/10"
          >
            <Plus size={13} />
            Create new lens
          </Button>
        </div>
      </Field>
    </div>
  )
}
