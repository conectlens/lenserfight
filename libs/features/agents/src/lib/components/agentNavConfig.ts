import type React from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Bot,
  Brain,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Cpu,
  FileStack,
  GitBranch,
  KeyRound,
  Layers,
  ListChecks,
  Network,
  PanelTopOpen,
  Settings as SettingsIcon,
  Sparkles,
  Swords,
  Wrench,
} from 'lucide-react'

import type { AgentViewMode } from '../context/AgentWorkspaceContext'

export type AgentSection =
  | 'overview'
  | 'scratchpad'
  | 'reports'
  | 'team'
  | 'runs'
  | 'logs'
  | 'workflows'
  | 'schedules'
  | 'evaluations'
  | 'memory'
  | 'instructions'
  | 'personality'
  | 'tools'
  | 'models'
  | 'providers'
  | 'byok'
  | 'approvals'
  | 'cost'
  | 'analytics'
  | 'settings'
  | 'battles'
  | 'chat'
  | 'getting-started'

export type AgentNavZone = 'operate' | 'build' | 'automate' | 'configure' | 'chat' | 'resources'

export interface AgentNavItem {
  id: AgentSection
  label: string
  zone: AgentNavZone
  icon: React.ComponentType<{ size?: number }>
  visibleIn: AgentViewMode[]
  /** When false the item is hidden regardless of viewMode. */
  enabled?: boolean
  /** Overrides the auto-generated workspace path. Use for community-level links. */
  path?: string
}

const ALL_OWNER_MODES: AgentViewMode[] = ['agent_owner', 'human_owner']
const ALL_MODES: AgentViewMode[] = [
  'agent_owner',
  'human_owner',
  'agent_public',
  'human_public',
]
const PUBLIC_VISIBLE: AgentViewMode[] = [...ALL_MODES]
const OWNER_ONLY: AgentViewMode[] = ALL_OWNER_MODES
const AGENT_OWNER_ONLY: AgentViewMode[] = ['agent_owner']

export const NAV_ITEMS: AgentNavItem[] = [
  // OPERATE
  { id: 'overview', label: 'Overview', zone: 'operate', icon: Layers, visibleIn: PUBLIC_VISIBLE },
  { id: 'scratchpad', label: 'Drafts', zone: 'operate', icon: FileStack, visibleIn: AGENT_OWNER_ONLY },
  { id: 'runs', label: 'Runs', zone: 'operate', icon: Activity, visibleIn: PUBLIC_VISIBLE },
  { id: 'logs', label: 'Logs', zone: 'operate', icon: ClipboardList, visibleIn: OWNER_ONLY },
  { id: 'reports', label: 'Reports', zone: 'operate', icon: PanelTopOpen, visibleIn: OWNER_ONLY },
  // BUILD
  { id: 'team', label: 'Agent Teams', zone: 'build', icon: Network, visibleIn: OWNER_ONLY },
  { id: 'workflows', label: 'Workflows', zone: 'build', icon: GitBranch, visibleIn: PUBLIC_VISIBLE },
  // AUTOMATE
  { id: 'schedules', label: 'Schedules', zone: 'automate', icon: CalendarClock, visibleIn: OWNER_ONLY },
  { id: 'evaluations', label: 'Evaluations', zone: 'automate', icon: ListChecks, visibleIn: OWNER_ONLY },
  // CONFIGURE
  { id: 'memory', label: 'Memory', zone: 'configure', icon: Sparkles, visibleIn: OWNER_ONLY },
  { id: 'instructions', label: 'Instructions', zone: 'configure', icon: Bot, visibleIn: OWNER_ONLY },
  { id: 'personality', label: 'Personality', zone: 'configure', icon: Brain, visibleIn: OWNER_ONLY },
  { id: 'tools', label: 'Tools', zone: 'configure', icon: Wrench, visibleIn: OWNER_ONLY },
  { id: 'models', label: 'Models', zone: 'configure', icon: Cpu, visibleIn: OWNER_ONLY },
  { id: 'providers', label: 'Providers', zone: 'configure', icon: AlertTriangle, visibleIn: OWNER_ONLY },
  { id: 'byok', label: 'API Keys', zone: 'configure', icon: KeyRound, visibleIn: AGENT_OWNER_ONLY },
  { id: 'approvals', label: 'Permissions', zone: 'configure', icon: ClipboardCheck, visibleIn: OWNER_ONLY },
  { id: 'cost', label: 'Cost', zone: 'configure', icon: Coins, visibleIn: OWNER_ONLY },
  {
    id: 'analytics' as const,
    label: 'Analytics',
    zone: 'operate' as AgentNavZone,
    icon: BarChart2,
    visibleIn: ALL_OWNER_MODES,
  },
  { id: 'settings', label: 'Settings', zone: 'configure', icon: SettingsIcon, visibleIn: AGENT_OWNER_ONLY },
  {
    id: 'battles',
    label: 'Battles',
    zone: 'operate',
    icon: Swords,
    visibleIn: OWNER_ONLY,
  },
]

export const LEGACY_AGENT_SECTION_ALIASES: Record<string, AgentSection> = {}

export const AGENT_NAV_ZONES: AgentNavZone[] = ['operate', 'build', 'automate', 'configure']

export const ZONE_LABELS: Record<AgentNavZone, string> = {
  operate: 'Operate',
  build: 'Build',
  automate: 'Automate',
  configure: 'Configure',
  chat: 'Chat',
  resources: 'Resources',
}

export function isVisibleSection(section: AgentSection, viewMode: AgentViewMode): boolean {
  const item = NAV_ITEMS.find((i) => i.id === section)
  return !!item && item.enabled !== false && item.visibleIn.includes(viewMode)
}

export function defaultSection(_viewMode: AgentViewMode): AgentSection {
  return 'overview'
}
