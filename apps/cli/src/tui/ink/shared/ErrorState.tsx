import { sym } from '@lenserfight/cli-client'
import { Box, Text } from 'ink'

interface ErrorStateProps {
  message: string
}

/** Recoverable error surface. The retry hint is `r`; screens wire the actual reload via useAsyncData. */
export function ErrorState({ message }: ErrorStateProps) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color="redBright">
        {sym.fail} {message}
      </Text>
      <Text dimColor>Press r to retry.</Text>
    </Box>
  )
}
