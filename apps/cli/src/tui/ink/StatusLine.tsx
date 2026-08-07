import { Box, Text } from 'ink'

import type { DashboardData } from './useDashboardData'

function shortCwd(cwd: string): string {
  const home = process.env['HOME'] || process.env['USERPROFILE'] || ''
  return home && cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd
}

interface StatusLineProps {
  data: DashboardData
  cwd: string
  runningJobs: number
  debugMode: boolean
}

/**
 * One compact line, always visible above the input, never competing with it:
 * profile, health, cwd, running jobs, pending approvals, connectivity.
 */
export function StatusLine({ data, cwd, runningJobs, debugMode }: StatusLineProps) {
  return (
    <Box>
      <Text color="gray">profile </Text>
      <Text bold>{data.profile}</Text>
      <Text color="gray"> · </Text>
      <Text color={data.healthy ? 'greenBright' : 'redBright'} bold>
        {data.healthy ? '● healthy' : '● down'}
      </Text>
      <Text color="gray"> · </Text>
      <Text color="cyanBright">{shortCwd(cwd)}</Text>
      {runningJobs > 0 ? (
        <>
          <Text color="gray"> · </Text>
          <Text color="yellowBright">
            {runningJobs} running
          </Text>
        </>
      ) : null}
      {data.pendingApprovals > 0 ? (
        <>
          <Text color="gray"> · </Text>
          <Text color="yellowBright">{data.pendingApprovals} pending approval{data.pendingApprovals === 1 ? '' : 's'}</Text>
        </>
      ) : null}
      {debugMode ? (
        <>
          <Text color="gray"> · </Text>
          <Text color="magentaBright">debug</Text>
        </>
      ) : null}
    </Box>
  )
}
