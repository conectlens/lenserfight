import type { JourneyState } from '../lib/onboarding/journey'

// ── Shared env/progress types ─────────────────────────────────────────────────

export interface RuntimeEnv {
  ollama: boolean
  docker: boolean
  supabase: boolean
  authenticated: boolean
  journeyState: JourneyState | null
  battleCount: number
  agentCount: number
  teamCount: number
  workflowCount: number
}

export interface LabyrinthProgress {
  visitedRooms: Set<string>
  discoveredHidden: Set<string>
  totalBattles: number
}

// ── Path / room types ─────────────────────────────────────────────────────────

export type PathAction =
  | { type: 'navigate'; roomId: string }
  | { type: 'execute'; argv: string[] }
  | { type: 'prompt'; prefill: string }

export interface LabyrinthPath {
  id: string
  key: string
  label: string
  sublabel?: string
  action: PathAction
  unlocked: boolean
  badge?: string
}

export interface LabyrinthRoom {
  id: string
  title: string
  subtitle(env: RuntimeEnv): string
  buildPaths(env: RuntimeEnv, progress: LabyrinthProgress): LabyrinthPath[]
  recommend(env: RuntimeEnv, progress: LabyrinthProgress): string | null
}

// ── Room definitions ──────────────────────────────────────────────────────────

export const ROOMS: Record<string, LabyrinthRoom> = {

  bootstrap: {
    id: 'bootstrap',
    title: 'OPERATIONAL RUNTIME',
    subtitle(env) {
      return [
        `Arena: ${env.authenticated ? 'ACTIVE' : 'OFFLINE'}`,
        `AI: ${env.ollama ? 'Ollama ✓' : 'No local AI'}`,
        env.docker ? 'Docker ✓' : 'Docker ✗',
      ].join('  ·  ')
    },
    buildPaths(env, progress) {
      const paths: LabyrinthPath[] = [
        {
          id: 'env_scan',
          key: '1',
          label: 'Initialize Lens Core',
          sublabel: env.journeyState?.lens_created ? 'initialized' : 'required first',
          action: { type: 'navigate', roomId: 'env_scan' },
          unlocked: true,
        },
        {
          id: 'scan_agents',
          key: '2',
          label: 'Scan Local AI Agents',
          sublabel: env.ollama ? 'Ollama detected' : 'checking environment',
          action: { type: 'execute', argv: ['doctor'] },
          unlocked: true,
        },
        {
          id: 'battle_arena',
          key: '3',
          label: 'Enter Battle Arena',
          sublabel: env.journeyState?.agent_created ? 'agent ready' : 'requires agent',
          action: { type: 'navigate', roomId: 'battle_arena' },
          unlocked: !!env.journeyState?.agent_created || !!env.journeyState?.battle_created,
        },
        {
          id: 'runtime_graph',
          key: '4',
          label: 'Explore Runtime Graph',
          sublabel: 'system diagnostics',
          action: { type: 'navigate', roomId: 'runtime_graph' },
          unlocked: true,
        },
        {
          id: 'team_gateway',
          key: '5',
          label: 'Open Team Gateway',
          sublabel: env.teamCount > 0 ? `${env.teamCount} teams` : 'no teams yet',
          action: { type: 'navigate', roomId: 'team_gateway' },
          unlocked: !!env.journeyState?.agent_created,
        },
      ]
      // Hidden path — unlocked when Ollama detected AND at least one battle run
      if (env.ollama && progress.totalBattles >= 1) {
        paths.push({
          id: 'local_arena',
          key: '6',
          label: 'Local Model Tournament',
          sublabel: 'offline battle engine',
          action: { type: 'navigate', roomId: 'local_arena' },
          unlocked: true,
          badge: progress.discoveredHidden.has('local_arena') ? undefined : 'DISCOVERED',
        })
      }
      return paths
    },
    recommend(env, _p) {
      if (!env.authenticated) return 'env_scan'
      if (!env.journeyState?.lens_created) return 'env_scan'
      if (!env.journeyState?.agent_created) return 'env_scan'
      if (!env.journeyState?.battle_created) return 'battle_arena'
      if (env.teamCount === 0) return 'team_gateway'
      return 'runtime_graph'
    },
  },

  env_scan: {
    id: 'env_scan',
    title: 'ENVIRONMENT SCANNER',
    subtitle(env) {
      return [
        env.authenticated         ? '✓ Auth'     : '✗ Auth',
        env.journeyState?.lens_created     ? '✓ Lens'     : '✗ Lens',
        env.journeyState?.workflow_created ? '✓ Workflow' : '✗ Workflow',
        env.journeyState?.agent_created    ? '✓ Agent'    : '✗ Agent',
      ].join('  ')
    },
    buildPaths(env, _p) {
      const paths: LabyrinthPath[] = []
      let idx = 1

      if (!env.authenticated) {
        paths.push({
          id: 'auth_login',
          key: String(idx++),
          label: 'Login to LenserFight',
          sublabel: 'required before anything else',
          action: { type: 'execute', argv: ['auth', 'login'] },
          unlocked: true,
        })
      }

      paths.push({
        id: 'lens_create',
        key: String(idx++),
        label: env.journeyState?.lens_created ? 'View Lenses' : 'Create Lens',
        sublabel: env.journeyState?.lens_created ? 'already created' : 'group your agents',
        action: env.journeyState?.lens_created
          ? { type: 'execute', argv: ['lenses'] }
          : { type: 'prompt', prefill: 'lens create --title ' },
        unlocked: env.authenticated,
      })

      paths.push({
        id: 'workflow_create',
        key: String(idx++),
        label: env.journeyState?.workflow_created ? 'View Workflows' : 'Create Workflow',
        sublabel: env.journeyState?.workflow_created ? 'already exists' : 'define battle rules',
        action: env.journeyState?.workflow_created
          ? { type: 'execute', argv: ['workflow', 'list'] }
          : { type: 'prompt', prefill: 'workflow create --template single-agent ' },
        unlocked: !!env.journeyState?.lens_created,
      })

      paths.push({
        id: 'agent_create',
        key: String(idx++),
        label: env.journeyState?.agent_created ? 'View Agents' : 'Connect AI Agent',
        sublabel: env.journeyState?.agent_created
          ? `${env.agentCount} connected`
          : 'register your first AI',
        action: env.journeyState?.agent_created
          ? { type: 'execute', argv: ['lenser', 'list'] }
          : { type: 'prompt', prefill: 'lenser connect ' },
        unlocked: !!env.journeyState?.lens_created,
      })

      paths.push({
        id: 'enter_arena',
        key: String(idx),
        label: 'Enter Battle Arena',
        sublabel: env.journeyState?.agent_created ? 'ready for combat' : 'needs agent first',
        action: { type: 'navigate', roomId: 'battle_arena' },
        unlocked: !!env.journeyState?.agent_created,
      })

      return paths
    },
    recommend(env, _p) {
      if (!env.authenticated) return 'auth_login'
      if (!env.journeyState?.lens_created) return 'lens_create'
      if (!env.journeyState?.workflow_created) return 'workflow_create'
      if (!env.journeyState?.agent_created) return 'agent_create'
      return 'enter_arena'
    },
  },

  battle_arena: {
    id: 'battle_arena',
    title: 'BATTLE ARENA',
    subtitle(env) {
      return `Mode: ${env.ollama ? 'Local + Cloud' : 'Cloud Only'}  ·  Battles: ${env.battleCount}`
    },
    buildPaths(env, _p) {
      const paths: LabyrinthPath[] = [
        {
          id: 'battle_list',
          key: 'l',
          label: 'List Active Battles',
          action: { type: 'execute', argv: ['battle', 'list'] },
          unlocked: true,
        },
        {
          id: 'battle_create',
          key: 'c',
          label: 'Create Battle',
          sublabel: '--lenser-a <ID> --lenser-b <ID>',
          action: { type: 'prompt', prefill: 'battle create --lenser-a  --lenser-b ' },
          unlocked: !!env.journeyState?.agent_created,
        },
        {
          id: 'battle_view',
          key: 'v',
          label: 'View Battle',
          sublabel: '<SLUG-or-ID>',
          action: { type: 'prompt', prefill: 'battle view ' },
          unlocked: true,
        },
        {
          id: 'battle_stream',
          key: 's',
          label: 'Stream Live Battle',
          sublabel: '<SLUG-or-ID>',
          action: { type: 'prompt', prefill: 'battle stream-feed ' },
          unlocked: true,
        },
        {
          id: 'leaderboard',
          key: 'r',
          label: 'Global Leaderboard',
          action: { type: 'execute', argv: ['leaderboard'] },
          unlocked: true,
        },
      ]
      if (env.ollama) {
        paths.push({
          id: 'local_battle',
          key: 'L',
          label: 'Run Local Battle',
          sublabel: 'offline — uses Ollama',
          action: { type: 'prompt', prefill: 'battle local run --id ' },
          unlocked: true,
          badge: 'LOCAL',
        })
      }
      return paths
    },
    recommend(env, _p) {
      if (!env.journeyState?.battle_created) return 'battle_create'
      if (env.ollama) return 'local_battle'
      return 'battle_list'
    },
  },

  runtime_graph: {
    id: 'runtime_graph',
    title: 'RUNTIME GRAPH',
    subtitle(_env) {
      return 'System diagnostics and operational visibility'
    },
    buildPaths(_env, _p) {
      return [
        {
          id: 'status',
          key: 's',
          label: 'System Status',
          sublabel: 'all subsystems',
          action: { type: 'execute', argv: ['status'] },
          unlocked: true,
        },
        {
          id: 'doctor',
          key: 'd',
          label: 'Doctor Diagnostics',
          sublabel: 'environment health check',
          action: { type: 'execute', argv: ['doctor'] },
          unlocked: true,
        },
        {
          id: 'gateway',
          key: 'g',
          label: 'Gateway Status',
          sublabel: 'local proxy health',
          action: { type: 'execute', argv: ['gateway', 'status'] },
          unlocked: true,
        },
        {
          id: 'analytics',
          key: 'a',
          label: 'Analytics Summary',
          action: { type: 'execute', argv: ['analytics', 'summary'] },
          unlocked: true,
        },
        {
          id: 'leaderboard',
          key: 'r',
          label: 'Global Leaderboard',
          action: { type: 'execute', argv: ['leaderboard'] },
          unlocked: true,
        },
        {
          id: 'whats_new',
          key: 'n',
          label: "What's New",
          sublabel: 'latest runtime changes',
          action: { type: 'execute', argv: ['whats-new'] },
          unlocked: true,
        },
      ]
    },
    recommend(_env, _p) {
      return 'status'
    },
  },

  team_gateway: {
    id: 'team_gateway',
    title: 'TEAM GATEWAY',
    subtitle(env) {
      return `Teams: ${env.teamCount}  ·  Agents: ${env.agentCount}`
    },
    buildPaths(env, _p) {
      return [
        {
          id: 'team_list',
          key: 'l',
          label: 'List Teams',
          action: { type: 'execute', argv: ['team', 'list'] },
          unlocked: true,
        },
        {
          id: 'team_create',
          key: 'c',
          label: 'Create Team',
          sublabel: '<name>',
          action: { type: 'prompt', prefill: 'team create ' },
          unlocked: !!env.journeyState?.agent_created,
        },
        {
          id: 'team_member',
          key: 'a',
          label: 'Add Team Member',
          sublabel: '<team-id> <user-id>',
          action: { type: 'prompt', prefill: 'team add-member ' },
          unlocked: env.teamCount > 0,
        },
        {
          id: 'feed',
          key: 'f',
          label: 'Activity Feed',
          action: { type: 'execute', argv: ['feed'] },
          unlocked: true,
        },
        {
          id: 'lenser_discover',
          key: 'd',
          label: 'Discover Lensers',
          action: { type: 'execute', argv: ['lenser', 'suggested'] },
          unlocked: true,
        },
        {
          id: 'lenser_list',
          key: 'L',
          label: 'List My Agents',
          action: { type: 'execute', argv: ['lenser', 'list'] },
          unlocked: true,
        },
      ]
    },
    recommend(env, _p) {
      if (env.teamCount === 0 && env.journeyState?.agent_created) return 'team_create'
      return 'feed'
    },
  },

  local_arena: {
    id: 'local_arena',
    title: 'LOCAL MODEL TOURNAMENT',
    subtitle(_env) {
      return 'Offline battle engine  ·  No cloud required'
    },
    buildPaths(env, _p) {
      return [
        {
          id: 'local_battle_start',
          key: 'b',
          label: 'Start Local Battle',
          sublabel: 'battle local run --id <ID>',
          action: { type: 'prompt', prefill: 'battle local run --id ' },
          unlocked: true,
        },
        {
          id: 'model_list',
          key: 'm',
          label: 'List Local Models',
          sublabel: 'available in Ollama',
          action: { type: 'execute', argv: ['models', 'list', '--local'] },
          unlocked: env.ollama,
        },
        {
          id: 'model_pull',
          key: 'p',
          label: 'Download Model',
          sublabel: '<model-name>',
          action: { type: 'prompt', prefill: 'models pull ' },
          unlocked: env.ollama,
        },
        {
          id: 'local_battle_init',
          key: 'i',
          label: 'New Local Battle',
          sublabel: '--name <name>',
          action: { type: 'prompt', prefill: 'battle local init --name ' },
          unlocked: true,
        },
        {
          id: 'local_battle_list',
          key: 'l',
          label: 'List Local Battles',
          action: { type: 'execute', argv: ['battle', 'local', 'list'] },
          unlocked: true,
        },
      ]
    },
    recommend(_env, _p) {
      return 'local_battle_start'
    },
  },

}
