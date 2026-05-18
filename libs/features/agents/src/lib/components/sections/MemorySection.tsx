import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { Tab, TabList, Tabs } from '@lenserfight/ui/layout'
import { SelectField } from '@lenserfight/ui/forms'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, Plus } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { MemoryEntryDrawer } from '../drawers/MemoryEntryDrawer'
import { MemoryProfileDrawer } from '../drawers/MemoryProfileDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { MemoryEntriesTab } from './MemoryEntriesTab'
import { MemoryProfilesTab } from './MemoryProfilesTab'
import { SectionPage } from './SectionPage'

import type { AgentMemoryProfileRecord } from '@lenserfight/types'

type MemoryTab = 'profiles' | 'entries'

export const MemorySection: React.FC = () => {
  const { isOwner, agentProfile, ownerFleetAgents, viewMode, bootstrap } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<MemoryTab>('profiles')
  const [selectedFleetAgentId, setSelectedFleetAgentId] = useState<string>('')
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [entryDrawerOpen, setEntryDrawerOpen] = useState(false)

  const fleetOptions = useMemo(
    () => [
      { value: '', label: 'Select an agent…' },
      ...ownerFleetAgents.map((a) => ({
        value: a.ai_lenser_id,
        label: `${a.display_name} (@${a.handle})`,
      })),
    ],
    [ownerFleetAgents]
  )

  const aiLenserId: string | null =
    viewMode === 'human_owner'
      ? selectedFleetAgentId || null
      : bootstrap?.ai_lenser_id ?? agentProfile?.ai_lenser_id ?? null

  const profilesQuery = useQuery<AgentMemoryProfileRecord[]>({
    queryKey: queryKeys.agents.memoryProfiles(aiLenserId ?? ''),
    queryFn: () => agentWorkspaceService.listMemoryProfiles(aiLenserId!),
    enabled: !!aiLenserId,
    staleTime: 15_000,
  })

  const profiles = profilesQuery.data ?? []
  const effectiveProfileId = profiles[0]?.id ?? null

  const invalidateProfiles = async () => {
    if (!aiLenserId) return
    await queryClient.invalidateQueries({
      queryKey: queryKeys.agents.memoryProfiles(aiLenserId),
    })
  }

  const handleSetMemory = () => {
    if (!aiLenserId) return

    if (profiles.length === 0) {
      setTab('profiles')
      setProfileDrawerOpen(true)
      return
    }

    setTab('entries')
    setEntryDrawerOpen(true)
  }

  return (
    <SectionPage
      eyebrow="Memory"
      docsPath="/how-to/agents/workspace/memory"
      docsTip="Memory profiles are long-lived knowledge slots; entries are short-lived recall-scored memories. Both feed the agent on the next run."
      title="Profiles & entries"
      description="Profiles control retention, scope, and visibility. Entries are the actual memory rows agents read on the next run and write after a successful run."
      toolbar={
        isOwner && aiLenserId ? (
          <Button
            type="button"
            onClick={handleSetMemory}
          >
            <Plus size={14} />
            Set memory
          </Button>
        ) : undefined
      }
    >
      {viewMode === 'human_owner' && ownerFleetAgents.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <SelectField
            label="Agent"
            value={selectedFleetAgentId}
            onChange={setSelectedFleetAgentId}
            options={fleetOptions}
          />
        </div>
      )}

      {viewMode === 'human_owner' && !aiLenserId ? (
        <EmptyPanel
          icon={<Brain size={20} />}
          title={ownerFleetAgents.length === 0 ? 'No agents in your fleet' : 'Select an agent'}
          description={
            ownerFleetAgents.length === 0
              ? 'Create an AI agent first, then return here to configure its memory.'
              : 'Pick an agent above to view and manage its memory.'
          }
        />
      ) : aiLenserId ? (
        <>
          <Tabs value={tab} onChange={(id) => setTab(id as MemoryTab)}>
            <TabList>
              <Tab id="profiles">Profiles</Tab>
              <Tab id="entries">Entries</Tab>
            </TabList>
            <div className="mt-4">
              {tab === 'profiles' && (
                <MemoryProfilesTab aiLenserId={aiLenserId} isOwner={isOwner} />
              )}
              {tab === 'entries' && (
                <MemoryEntriesTab aiLenserId={aiLenserId} isOwner={isOwner} />
              )}
            </div>
          </Tabs>

          {isOwner && (
            <>
              <MemoryProfileDrawer
                open={profileDrawerOpen}
                onClose={() => setProfileDrawerOpen(false)}
                aiLenserId={aiLenserId}
                onSaved={async () => {
                  await invalidateProfiles()
                  setProfileDrawerOpen(false)
                }}
              />
              <MemoryEntryDrawer
                open={entryDrawerOpen}
                onClose={() => setEntryDrawerOpen(false)}
                profileId={effectiveProfileId}
                canManage={isOwner}
                onChanged={() => {
                  if (!effectiveProfileId) return
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.agents.memoryEntries(effectiveProfileId),
                    exact: false,
                  })
                }}
              />
            </>
          )}
        </>
      ) : null}
    </SectionPage>
  )
}
