import type { AgentWorkspaceContext } from '../../lib/agent-workspace-context'
import { A } from '../../utils/ansi'
import { printTable } from '../../utils/output'

export type AgentWorkspaceOp = {
  category: string
  command: string
  description: string
}

/** Workspace operations shown after `lf agents use`. */
export const AGENT_WORKSPACE_OPERATIONS: AgentWorkspaceOp[] = [
  { category: 'Workspace', command: 'agents context', description: 'Show selected agent context' },
  { category: 'Workspace', command: 'agents ops', description: 'Re-print this operations menu' },
  { category: 'Workspace', command: 'agents get', description: 'Profile + workspace settings' },
  { category: 'Execute', command: 'agents dispatch --assignment <uuid> --workflow-id <uuid>', description: 'Queue a team run from an assignment' },
  { category: 'Execute', command: 'agents runs', description: 'Recent team runs for this agent' },
  { category: 'Execute', command: 'execute history', description: 'Your cross-agent execution activity' },
  { category: 'Schedule', command: 'agents schedule', description: 'List workflow schedules' },
  { category: 'Schedule', command: 'schedule create', description: 'Create a new workflow schedule (wizard)' },
  { category: 'Schedule', command: 'schedule pause <id>', description: 'Pause a schedule' },
  { category: 'Memory', command: 'agents memory', description: 'List memory profiles' },
  { category: 'Memory', command: 'agents memory search --query "<text>"', description: 'Semantic memory search' },
  { category: 'Memory', command: 'agents memory list', description: 'List memory entries' },
  { category: 'Team', command: 'agents team list', description: 'Teams owned by this agent' },
  { category: 'Team', command: 'agents inspect', description: 'Workspace bootstrap (teams, runs, members)' },
  { category: 'Team', command: 'agents team members --team <uuid>', description: 'List team members' },
  { category: 'Team', command: 'agents team conversation <run-uuid>', description: 'Team run conversation thread' },
  { category: 'Approvals', command: 'agents approvals', description: 'Pending approval queue' },
  { category: 'Control', command: 'agents stop', description: 'Pause agent (block new runs)' },
  { category: 'Control', command: 'agents resume', description: 'Resume paused agent' },
  { category: 'Control', command: 'kill-switch status @<handle>', description: 'Kill switch + pause state' },
  { category: 'Control', command: 'kill-switch on @<handle> --confirm', description: 'Block all new runs' },
  { category: 'Emergency', command: 'agents kill --confirm', description: 'Cancel active runs + kill switch + pause' },
  { category: 'Observability', command: 'agents logs', description: 'Recent action logs' },
  { category: 'Observability', command: 'lenser ai status', description: 'Active run count + budget settings' },
  { category: 'Keys', command: 'configure byok list', description: 'Cloud BYOK key hints' },
  { category: 'Keys', command: 'battle byok-key list --agent <uuid>', description: 'Battle BYOK keys for agent' },
]

function substituteHandle(command: string, ctx: AgentWorkspaceContext): string {
  return command
    .replace(/@<handle>/g, `@${ctx.handle}`)
    .replace(/<uuid>/g, ctx.aiLenserId)
}

/** Compact lines for the Agents dashboard tab. */
export function getAgentWorkspaceOpsLines(maxRows = 10): string[] {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const op of AGENT_WORKSPACE_OPERATIONS) {
    if (seen.has(op.category)) continue
    seen.add(op.category)
    lines.push(`${A.dim}${op.category}:${A.reset} lf ${op.command.split(' ')[0]} …`)
    if (lines.length >= maxRows) break
  }
  return lines
}

export function printAgentWorkspaceOperations(ctx: AgentWorkspaceContext): void {
  const rows = AGENT_WORKSPACE_OPERATIONS.map((op) => [
    op.category,
    `lf ${substituteHandle(op.command, ctx)}`,
    op.description,
  ])

  console.log('')
  console.log(
    `${A.brightGreen}${A.bold}Workspace operations${A.reset}  ${A.dim}(@${ctx.handle})${A.reset}`,
  )
  console.log(`${A.gray}${'─'.repeat(72)}${A.reset}`)
  printTable(['Area', 'Command', 'Description'], rows)
  console.log(
    `${A.dim}Tip: subcommands without an id default to @${ctx.handle}. Press ${A.brightYellow}g${A.reset}${A.dim} in the dashboard for key bindings.${A.reset}`,
  )
  console.log('')
}
