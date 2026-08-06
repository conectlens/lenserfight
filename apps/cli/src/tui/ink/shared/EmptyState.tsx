import { sym } from '@lenserfight/cli-client'
import { Box, Text } from 'ink'

interface EmptyStateProps {
  message: string
  hint?: string
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color="gray">
        {sym.dot} {message}
      </Text>
      {hint ? <Text dimColor>{hint}</Text> : null}
    </Box>
  )
}
