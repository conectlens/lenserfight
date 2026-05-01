import { Tab, TabList, Tabs } from '@lenserfight/ui/layout'
import { SelectField } from '@lenserfight/ui/forms'
import { Brain } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { MemoryEntriesTab } from './MemoryEntriesTab'
import { MemoryProfilesTab } from './MemoryProfilesTab'
import { SectionPage } from './SectionPage'

type MemoryTab = 'profiles' | 'entries'

export const MemorySection: React.FC = () => {
  const { isOwner, agentProfile, ownerFleetAgents, viewMode } = useAgentWorkspace()
  const [tab, setTab] = useState<MemoryTab>('profiles')
  const [selectedFleetAgentId, setSelectedFleetAgentId] = useState<string>('')

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
      : agentProfile?.ai_lenser_id ?? null

  return (
    <SectionPage
      eyebrow="Memory"
      title="Profiles & entries"
      description="Profiles control retention, scope, and visibility. Entries are the actual memory rows agents read on the next run and write after a successful run."
    >
      {viewMode === 'human_owner' && ownerFleetAgents.length > 0 && (
        <div className="rounded-[24px] border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
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
      ) : null}
    </SectionPage>
  )
}
