import { sym } from '@lenserfight/cli-client'
import { getEffectiveMode } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'

import { JOURNEY_STEPS, fetchJourneyState } from '../../../lib/onboarding/journey'
import { markOnboardingComplete } from '../../../lib/onboarding/state'
import { useAsyncData } from '../hooks/useAsyncData'
import { LoadingIndicator } from '../shared/LoadingIndicator'

interface OnboardingScreenProps {
  onDone: () => void
  interactive?: boolean
}

/** First-run welcome screen. Shown once (gated in AppShell on the onboarding snapshot), reachable again from Home. */
export function OnboardingScreen({ onDone, interactive = true }: OnboardingScreenProps) {
  const { data: journey, loading } = useAsyncData(fetchJourneyState, ['onboarding'])

  const dismiss = () => {
    const { mode } = getEffectiveMode()
    markOnboardingComplete(mode)
    onDone()
  }

  // Gated on `interactive`: ink's useInput calls setRawMode internally, which
  // throws when stdin doesn't support raw mode (the non-TTY static-render
  // path — dashboard.ts's renderInkStatic() paints one frame and never waits
  // for a keypress, so there's nothing to dismiss on anyway).
  useInput(
    () => {
      dismiss()
    },
    { isActive: interactive },
  )

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magentaBright" paddingX={2} paddingY={1}>
      <Text color="magentaBright" bold>
        {sym.fight} Welcome to LenserFight
      </Text>
      <Box marginTop={1}>
        <Text>This dashboard walks through the same steps as the CLI — nothing here is exclusive to it.</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="whiteBright" bold>
          Suggested first steps
        </Text>
        {loading ? (
          <LoadingIndicator label="Checking progress…" />
        ) : (
          JOURNEY_STEPS.filter((s) => s.required).map((step) => {
            const done = journey?.[step.id] ?? false
            return (
              <Text key={step.id}>
                <Text color={done ? 'greenBright' : 'gray'}>{done ? sym.pass : sym.dot}</Text>
                {'  '}
                <Text color={done ? undefined : 'whiteBright'}>{step.label}</Text>
                <Text dimColor> — {step.command}</Text>
              </Text>
            )
          })
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press any key to continue to the dashboard. Reopen this anytime from Home.</Text>
      </Box>
    </Box>
  )
}
