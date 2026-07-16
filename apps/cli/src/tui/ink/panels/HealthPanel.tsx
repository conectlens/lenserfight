import { Box, Text } from 'ink'
import { sym } from '../../../utils/ansi'

interface HealthPanelProps {
  profile: string
  healthy: boolean
  banner: string | null
}

/** Header row: brand, active profile, health pill, optional agent banner + clock. */
export function HealthPanel({ profile, healthy, banner }: HealthPanelProps) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magentaBright" bold>
          {sym.fight}  LenserFight
        </Text>
        <Text color="gray">   {'│'}   </Text>
        <Text color="gray">profile  </Text>
        <Text color="cyanBright">{profile}</Text>
        <Text color="gray">   {'│'}   </Text>
        {healthy ? (
          <Text backgroundColor="green" color="white" bold>
            {' '}
            {sym.pass} HEALTHY{' '}
          </Text>
        ) : (
          <Text backgroundColor="red" color="white" bold>
            {' '}
            {sym.fail}  DOWN   {' '}
          </Text>
        )}
      </Box>
      {banner ? <Text>{banner}</Text> : null}
      <Text color="gray">{'─'.repeat(60)}</Text>
      <Text color="gray">
        {new Date().toLocaleString()}  {sym.dot}  refresh 2s
      </Text>
    </Box>
  )
}
