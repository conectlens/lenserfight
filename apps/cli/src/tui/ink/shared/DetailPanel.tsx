import { Box, Text } from 'ink'

import { EmptyState } from './EmptyState'
import { RawJsonView } from './RawJsonView'
import { Tabs } from './Tabs'

import type { ReactNode } from 'react'

interface DetailPanelProps {
  title: string
  tabs: string[]
  activeTab: string
  children: ReactNode
  focused: boolean
  width: number
  rawValue?: unknown
  rawOpen?: boolean
}

export function DetailPanel({ title, tabs, activeTab, children, focused, width, rawValue, rawOpen }: DetailPanelProps) {
  return (
    <Box flexDirection="column" width={width} borderStyle="round" borderColor={focused ? 'cyanBright' : 'gray'} paddingX={1}>
      <Text color="whiteBright" bold>
        {title}
      </Text>
      {tabs.length > 1 ? <Tabs tabs={tabs} active={activeTab} /> : null}
      <Box marginTop={1} flexDirection="column">
        {children}
      </Box>
      {rawValue !== undefined ? <RawJsonView value={rawValue} open={!!rawOpen} /> : null}
      <Box marginTop={1}>
        <Text dimColor>Tab: switch section  {'·'}  v: raw json  {'·'}  Esc: close</Text>
      </Box>
    </Box>
  )
}

export function DetailEmpty() {
  return <EmptyState message="Select a row to see details." hint="Use ↑/↓ to move, Enter to open." />
}
