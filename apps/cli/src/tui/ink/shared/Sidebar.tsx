import { Box, Text } from 'ink'

import type { DomainId } from '../state/types'

export interface SidebarItem {
  id: DomainId
  key: string
  label: string
  icon: string
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'home', key: 'h', label: 'Home', icon: '⌂' },
  { id: 'agents', key: 'g', label: 'Agents', icon: '◈' },
  { id: 'workflows', key: 'w', label: 'Workflows', icon: '⇄' },
  { id: 'execute', key: 'e', label: 'Execute', icon: '▶' },
  { id: 'battles', key: 'b', label: 'Battles', icon: '⚔' },
  { id: 'schedules', key: 's', label: 'Schedules', icon: '◷' },
  { id: 'memory', key: 'm', label: 'Memory', icon: '▤' },
  { id: 'lensers', key: 'l', label: 'Lensers', icon: '◎' },
  { id: 'approvals', key: 'a', label: 'Approvals', icon: '✓' },
  { id: 'configuration', key: 'k', label: 'Configuration', icon: '⚙' },
  { id: 'logs', key: 'f', label: 'Logs', icon: '☰' },
]

interface SidebarProps {
  activeId: DomainId
  focused: boolean
  collapsed: boolean
  /** Index within SIDEBAR_ITEMS the cursor rests on while the sidebar has focus (distinct from activeId). */
  highlight?: number
  badges?: Partial<Record<DomainId, number>>
}

export function Sidebar({ activeId, focused, collapsed, highlight = -1, badges }: SidebarProps) {
  return (
    <Box flexDirection="column" width={collapsed ? 4 : 20} borderStyle="round" borderColor={focused ? 'cyanBright' : 'gray'} paddingX={1}>
      {SIDEBAR_ITEMS.map((item, i) => {
        const active = item.id === activeId
        const cursored = focused && i === highlight
        const badge = badges?.[item.id]
        return (
          <Text key={item.id} backgroundColor={cursored ? 'blue' : active ? 'blackBright' : undefined}>
            <Text color={active ? 'whiteBright' : 'gray'} bold={active}>
              {item.icon}
            </Text>
            {collapsed ? null : (
              <Text color={active || cursored ? 'whiteBright' : undefined} bold={active}>
                {' '}
                {item.label}
              </Text>
            )}
            {!collapsed && badge ? <Text color="yellowBright"> ({badge})</Text> : null}
          </Text>
        )
      })}
    </Box>
  )
}
