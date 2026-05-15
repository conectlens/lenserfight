import { BluetoothConnected, BookOpen, ConciergeBell, CornerDownLeftIcon, MessageCircle } from 'lucide-react'
import React from 'react'

import { AGENT_NAV_ZONES, NAV_ITEMS, ZONE_LABELS } from '@lenserfight/features/agents'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'

import type { SidebarNavSectionConfig } from './sidebarModes'

export function buildAgentSidebarSections(handle: string): SidebarNavSectionConfig[] {
  const base = `/lenser/${handle}/ag`

  const sections: SidebarNavSectionConfig[] = AGENT_NAV_ZONES.map((zone) => ({
    id: zone,
    label: ZONE_LABELS[zone],
    items: NAV_ITEMS
      .filter((item) => item.enabled !== false && item.zone === zone && item.visibleIn.includes('agent_owner'))
      .map((item) => {
        const Icon = item.icon
        return {
          id: item.id,
          label: item.label,
          path: item.path ?? `${base}/${item.id}`,
          icon: <Icon size={20} />,
        }
      }),
  })).filter((section) => section.items.length > 0)

  sections.push({
    id: 'chat',
    label: 'Chat',
    items: [
      {
        id: 'chat',
        label: 'Chat',
        path: '/chat',
        icon: <MessageCircle size={20} />,
        wip: true,
      },
    ],
  })


  sections.push({
    id: 'connectors',
    label: 'Connectors',
    items: [
      {
        id: 'connectors',
        label: 'Connectors',
        path: '/connectors',
        icon: <CornerDownLeftIcon size={20} />,
        wip: true,
      },
    ],
  })

  sections.push({
    id: 'resources',
    label: 'Resources',
    items: [
      {
        id: 'getting-started',
        label: 'Getting Started',
        externalHref: `${DOCS_BASE_URL}/tutorials/agent-walkthroughs/create-your-first-agent`,
        icon: <BookOpen size={20} />,
      },
    ],
  })

  return sections
}
