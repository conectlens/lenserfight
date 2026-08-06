import { Box, Text } from 'ink'

interface TabsProps {
  tabs: string[]
  active: string
}

export function Tabs({ tabs, active }: TabsProps) {
  return (
    <Box>
      {tabs.map((tab, i) => {
        const selected = tab === active
        return (
          <Text key={tab}>
            {i > 0 ? <Text color="gray">{'  '}</Text> : null}
            {selected ? (
              <Text backgroundColor="blue" color="whiteBright" bold>
                {' '}
                {tab}{' '}
              </Text>
            ) : (
              <Text dimColor> {tab} </Text>
            )}
          </Text>
        )
      })}
    </Box>
  )
}
