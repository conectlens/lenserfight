import { sym } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'

import { getAgentWorkspaceContext } from '../../../lib/agent-workspace-context'
import { getHumanActivityFeed, countPendingApprovals, listFailingSchedules, listActiveTeamRuns } from '../../../lib/data-services'
import { fetchJourneyState, countCompleted, nextRequiredStep, JOURNEY_STEPS, type JourneyState } from '../../../lib/onboarding/journey'
import { useAsyncData } from '../hooks/useAsyncData'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { LoadingIndicator } from '../shared/LoadingIndicator'
import { StatusBadge } from '../shared/StatusBadge'

interface HomeData {
  recent: Awaited<ReturnType<typeof getHumanActivityFeed>>
  pendingApprovals: number
  failingSchedules: Awaited<ReturnType<typeof listFailingSchedules>>
  activeRuns: Awaited<ReturnType<typeof listActiveTeamRuns>>
  journey: JourneyState | null
}

async function fetchHomeData(): Promise<HomeData> {
  const ctx = getAgentWorkspaceContext()
  const [recent, pendingApprovals, failingSchedules, activeRuns, journey] = await Promise.all([
    getHumanActivityFeed(8).catch(() => []),
    countPendingApprovals().catch(() => 0),
    listFailingSchedules().catch(() => []),
    ctx ? listActiveTeamRuns(ctx.aiLenserId).catch(() => []) : Promise.resolve([]),
    fetchJourneyState(),
  ])
  return { recent, pendingApprovals, failingSchedules, activeRuns, journey }
}

interface HomeScreenProps {
  focused: boolean
  width: number
  onNavigate: (id: 'approvals' | 'schedules' | 'execute') => void
}

export function HomeScreen({ focused, width, onNavigate }: HomeScreenProps) {
  const { data, loading, error, reload } = useAsyncData(fetchHomeData, ['home'])

  useInput(
    (input) => {
      if (input === 'r') reload()
      else if (input === 'a') onNavigate('approvals')
      else if (input === 's') onNavigate('schedules')
      else if (input === 'e') onNavigate('execute')
    },
    { isActive: focused },
  )

  if (loading) return <LoadingIndicator label="Loading dashboard…" />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const { recent, pendingApprovals, failingSchedules, activeRuns, journey } = data
  const journeyProgress = journey ? countCompleted(journey) : null
  const nextStep = journey ? nextRequiredStep(journey) : JOURNEY_STEPS[0]

  return (
    <Box flexDirection="column" width={width}>
      {nextStep ? (
        <Box flexDirection="column" borderStyle="round" borderColor="magentaBright" paddingX={1} marginBottom={1}>
          <Text color="magentaBright" bold>
            Getting started {journeyProgress ? `(${journeyProgress.done}/${journeyProgress.total})` : ''}
          </Text>
          <Text>
            Next: <Text color="whiteBright">{nextStep.label}</Text>
          </Text>
          <Text dimColor>{nextStep.command}</Text>
        </Box>
      ) : null}

      <Box flexDirection="row" marginBottom={1}>
        <SummaryCard
          label="Pending approvals"
          value={String(pendingApprovals)}
          tone={pendingApprovals > 0 ? 'warn' : 'success'}
        />
        <SummaryCard
          label="Active executions"
          value={String(activeRuns.length)}
          tone={activeRuns.length > 0 ? 'info' : 'muted'}
        />
        <SummaryCard
          label="Schedule warnings"
          value={String(failingSchedules.length)}
          tone={failingSchedules.length > 0 ? 'error' : 'success'}
        />
      </Box>

      {failingSchedules.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="redBright" bold>
            {sym.warn} System warnings
          </Text>
          {failingSchedules.slice(0, 3).map((s) => (
            <Text key={s.id}>
              <Text color="gray">{sym.dot} </Text>
              schedule <Text color="cyanBright">{s.workflow_title ?? s.id.slice(0, 8)}</Text> last dispatch{' '}
              <StatusBadge label="failed" tone="error" />
            </Text>
          ))}
        </Box>
      ) : null}

      <Box flexDirection="column">
        <Text color="whiteBright" bold>
          Recent activity
        </Text>
        {recent.length === 0 ? (
          <EmptyState message="No activity yet." hint="Press r to refresh once agents start running." />
        ) : (
          recent.slice(0, 8).map((item, i) => (
            <Text key={i}>
              <Text color="gray">{new Date(item.occurred_at).toLocaleTimeString()}</Text>
              {'  '}
              <Text color="cyanBright">{(item.action_type ?? item.kind ?? '—').padEnd(20)}</Text>
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>r: refresh {'·'} a: approvals {'·'} s: schedules {'·'} e: execute {'·'} ?: help</Text>
      </Box>
    </Box>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'success' | 'warn' | 'error' | 'info' | 'muted' }) {
  const color = { success: 'greenBright', warn: 'yellowBright', error: 'redBright', info: 'cyanBright', muted: 'gray' }[tone]
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={2} marginRight={1}>
      <Text color={color} bold>
        {value}
      </Text>
      <Text dimColor>{label}</Text>
    </Box>
  )
}
