import { getEffectiveMode, resolveConfig, redactUrl } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'

import { detectNode, detectDocker, detectSupabaseCli, detectOllama, detectCloudApi, type ToolCheckResult } from '../../../lib/onboarding/detect'
import { useAsyncData } from '../hooks/useAsyncData'
import { LoadingIndicator } from '../shared/LoadingIndicator'
import { useAppState } from '../state/AppStateContext'

interface ConfigCheck {
  label: string
  result: ToolCheckResult
}

async function fetchConfigChecks(): Promise<{ mode: string; supabaseUrl: string; cloudApiUrl: string; checks: ConfigCheck[] }> {
  const { mode } = getEffectiveMode()
  const config = resolveConfig()
  const [ollama, cloudApi] = await Promise.all([detectOllama(), detectCloudApi()])
  const checks: ConfigCheck[] = [
    { label: 'Node.js', result: detectNode() },
    { label: 'Docker', result: detectDocker() },
    { label: 'Supabase CLI', result: detectSupabaseCli() },
    { label: 'Ollama', result: ollama },
    { label: 'Cloud API', result: cloudApi },
  ]
  return {
    mode,
    supabaseUrl: redactUrl(config.supabaseUrl ?? ''),
    cloudApiUrl: redactUrl(config.cloudApiUrl ?? ''),
    checks,
  }
}

interface ConfigurationScreenProps {
  focused: boolean
  width: number
  onDispatch: (argv: string[]) => void
}

export function ConfigurationScreen({ focused, width, onDispatch }: ConfigurationScreenProps) {
  const { requestConfirm } = useAppState()
  const { data, loading, error, reload } = useAsyncData(fetchConfigChecks, ['configuration'])

  useInput(
    (input) => {
      if (input === 'r') {
        reload()
        return
      }
      if (!data) return
      if (input === 'l' && data.mode !== 'local') {
        requestConfirm({
          title: 'Switch to local mode',
          description: 'Subsequent commands and this dashboard will target your local Supabase stack.',
          risk: 'LOW',
          confirmLabel: 'Switch',
          cancelLabel: 'Cancel',
          onConfirm: () => onDispatch(['use', 'local']),
        })
      }
      if (input === 'c' && data.mode !== 'cloud') {
        requestConfirm({
          title: 'Switch to cloud mode',
          description: 'Subsequent commands and this dashboard will target LenserFight Cloud.',
          risk: 'LOW',
          confirmLabel: 'Switch',
          cancelLabel: 'Cancel',
          onConfirm: () => onDispatch(['use', 'cloud']),
        })
      }
    },
    { isActive: focused },
  )

  if (loading) return <LoadingIndicator label="Checking environment…" />
  if (error || !data) return <Text color="redBright">{error ?? 'Failed to load configuration.'}</Text>

  return (
    <Box flexDirection="column" width={width}>
      <Text color="whiteBright" bold>
        Environment
      </Text>
      <Text>
        Mode: <Text color="cyanBright">{data.mode}</Text> {'  '}
        <Text dimColor>(l: switch to local · c: switch to cloud)</Text>
      </Text>
      <Text dimColor>Supabase: {data.supabaseUrl || '—'}</Text>
      <Text dimColor>Cloud API: {data.cloudApiUrl || '—'}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text color="whiteBright" bold>
          Dependency checks
        </Text>
        {data.checks.map((check) => (
          <Text key={check.label}>
            <Text color={check.result.ok ? 'greenBright' : 'yellowBright'}>{check.result.ok ? '✓' : '⚠'}</Text>
            {'  '}
            <Text>{check.label.padEnd(16)}</Text>
            <Text dimColor>{check.result.detail}</Text>
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>r: re-run checks. Full guided setup: "lf setup".</Text>
      </Box>
    </Box>
  )
}
