import { Button } from '@lenserfight/ui/components'
import { Input, SelectField } from '@lenserfight/ui/forms'
import { lensesService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import React, { useState } from 'react'

import { useAssignLens } from '../../hooks/mutations/useAssignLens'

interface LensOption {
  id: string
  title: string
  latestVersionNumber?: number
}

interface SlotLensPickerProps {
  slot: 'A' | 'B'
  slotLabel: string
  contenderId: string
  battleId: string
  onAssigned: () => void
}

function SlotLensPicker({ slot, slotLabel, contenderId, battleId, onAssigned }: SlotLensPickerProps) {
  const [query, setQuery] = useState('')
  const [selectedLens, setSelectedLens] = useState<LensOption | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [assigned, setAssigned] = useState(false)
  const { mutateAsync: assignLens, isPending } = useAssignLens()

  const slotColor = slot === 'A' ? 'bg-primary-yellow-500/15 text-primary-yellow-600' : 'bg-status-yellow/15 text-status-yellow'

  const { data: searchResults = [] } = useQuery({
    queryKey: ['lens-search-for-battle', query],
    queryFn: async () => {
      const resp = await lensesService.search(query, 0, 8)
      return resp.data ?? []
    },
    enabled: query.length >= 2 && !selectedLens,
    staleTime: 5000,
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['lens-versions-for-battle', selectedLens?.id],
    queryFn: () => lensesService.getVersions(selectedLens!.id),
    enabled: !!selectedLens?.id,
    staleTime: 30_000,
  })

  const handleAssign = async () => {
    if (!selectedLens) return
    await assignLens({
      contender_id: contenderId,
      battle_id: battleId,
      lens_id: selectedLens.id,
      version_id: selectedVersionId ?? null,
    })
    setAssigned(true)
    onAssigned()
  }

  if (assigned && selectedLens) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${slotColor}`}>{slot}</span>
          <p className="text-xs font-semibold text-greyscale-500 uppercase tracking-wide">{slotLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{selectedLens.title}</p>
          {selectedVersionId && (
            <span className="text-xs rounded-full bg-surface-border px-2 py-0.5 text-greyscale-500">
              v{versions.find((v) => v.id === selectedVersionId)?.versionNumber ?? '?'}
            </span>
          )}
          <span className="ml-auto text-xs rounded-full bg-status-green/10 text-status-green px-2 py-0.5 font-medium">Assigned</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${slotColor}`}>{slot}</span>
        <p className="text-xs font-semibold text-greyscale-500 uppercase tracking-wide">{slotLabel}</p>
      </div>

      <Input
        type="text"
        placeholder="Search lenses by name…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedLens(null); setSelectedVersionId(null) }}
      />

      {searchResults.length > 0 && !selectedLens && (
        <ul className="rounded-2xl border border-surface-border bg-surface-base divide-y divide-surface-border overflow-hidden">
          {searchResults.map((lens) => (
            <li key={lens.id}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => { setSelectedLens({ id: lens.id, title: lens.title, latestVersionNumber: lens.latestVersionNumber }); setQuery(lens.title) }}
                className="!justify-start !gap-3 !px-3 !py-2 !rounded-none !font-normal"
              >
                <span className="text-sm font-medium text-greyscale-900 dark:text-greyscale-50">{lens.title}</span>
                {lens.latestVersionNumber != null && (
                  <span className="text-xs text-greyscale-500">v{lens.latestVersionNumber}</span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selectedLens && versions.length > 0 && (
        <SelectField
          label="Version (optional)"
          value={selectedVersionId ?? ''}
          onChange={(value) => setSelectedVersionId(value || null)}
          options={[
            { value: '', label: `Latest (v${selectedLens.latestVersionNumber ?? versions[0]?.versionNumber})` },
            ...versions.map((v) => ({
              value: v.id,
              label: `v${v.versionNumber}${v.changelog ? ` — ${v.changelog}` : ''}`,
            })),
          ]}
        />
      )}

      {selectedLens && (
        <Button size="sm" onClick={handleAssign} isLoading={isPending} className="w-auto">
          Assign lens
        </Button>
      )}
    </div>
  )
}

export interface LensAssignmentStepProps {
  battleId: string
  contenderAId: string | undefined
  contenderAName: string | undefined
  contenderBId: string | undefined
  contenderBName: string | undefined
}

export function LensAssignmentStep({
  battleId,
  contenderAId,
  contenderAName,
  contenderBId,
  contenderBName,
}: LensAssignmentStepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {contenderAId ? (
        <SlotLensPicker
          slot="A"
          slotLabel={contenderAName ?? 'Contender A'}
          contenderId={contenderAId}
          battleId={battleId}
          onAssigned={() => undefined}
        />
      ) : (
        <div className="rounded-2xl border border-surface-border bg-surface-raised p-4 text-sm text-greyscale-400 text-center">
          No contender in slot A
        </div>
      )}

      {contenderBId ? (
        <SlotLensPicker
          slot="B"
          slotLabel={contenderBName ?? 'Contender B'}
          contenderId={contenderBId}
          battleId={battleId}
          onAssigned={() => undefined}
        />
      ) : (
        <div className="rounded-2xl border border-surface-border bg-surface-raised p-4 text-sm text-greyscale-400 text-center">
          No contender in slot B
        </div>
      )}
    </div>
  )
}
