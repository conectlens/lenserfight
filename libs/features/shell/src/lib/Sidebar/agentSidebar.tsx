import React from 'react'

import { AGENT_NAV_ZONES, NAV_ITEMS, ZONE_LABELS } from '@lenserfight/features/agents'

import type { SidebarNavSectionConfig } from './sidebarModes'

export function buildAgentSidebarSections(handle: string): SidebarNavSectionConfig[] {
  const base = `/lenser/${handle}/ag`

  return AGENT_NAV_ZONES.map((zone) => ({
    id: zone,
    label: ZONE_LABELS[zone],
    items: NAV_ITEMS
      .filter((item) => item.enabled !== false && item.zone === zone && item.visibleIn.includes('agent_owner'))
      .map((item) => {
        const Icon = item.icon
        return {
          id: item.id,
          label: item.label,
          path: `${base}/${item.id}`,
          icon: <Icon size={20} />,
        }
      }),
  })).filter((section) => section.items.length > 0)
}
