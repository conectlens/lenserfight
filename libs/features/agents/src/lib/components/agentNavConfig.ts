import type React from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Cpu,
  FileStack,
  GitBranch,
  Layers,
  ListChecks,
  Network,
  Settings as SettingsIcon,
  Sparkles,
  Wrench,
} from 'lucide-react'

import { FEATURES } from '@lenserfight/utils/env'

import type { AgentViewMode } from '../context/AgentWorkspaceContext'

export type AgentSection =
  | 'overview'
  | 'scratchpad'
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
  | 'approvals'
  | 'cost'
  | 'settings'

export type AgentNavZone = 'operate' | 'automate' | 'configure'

export interface AgentNavItem {
  id: AgentSection
  label: string
  zone: AgentNavZone
  icon: React.ComponentType<{ size?: number }>
  visibleIn: AgentViewMode[]
  /** When false the item is hidden regardless of viewMode. */
  enabled?: boolean
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
  { id: 'scratchpad', label: 'Scratchpad', zone: 'operate', icon: FileStack, visibleIn: AGENT_OWNER_ONLY },
  { id: 'team', label: 'Builder', zone: 'operate', icon: Network, visibleIn: OWNER_ONLY },
  { id: 'runs', label: 'Runs', zone: 'operate', icon: Activity, visibleIn: PUBLIC_VISIBLE },
  { id: 'logs', label: 'Logs', zone: 'operate', icon: ClipboardList, visibleIn: OWNER_ONLY },
  // AUTOMATE
  { id: 'workflows', label: 'Workflows', zone: 'automate', icon: GitBranch, visibleIn: PUBLIC_VISIBLE },
  { id: 'schedules', label: 'Schedules', zone: 'automate', icon: CalendarClock, visibleIn: OWNER_ONLY, enabled: FEATURES.CRON_SCHEDULING },
  { id: 'evaluations', label: 'Evaluations', zone: 'automate', icon: ListChecks, visibleIn: OWNER_ONLY },
  // CONFIGURE
  { id: 'memory', label: 'Memory', zone: 'configure', icon: Sparkles, visibleIn: OWNER_ONLY },
  { id: 'instructions', label: 'Instructions', zone: 'configure', icon: Bot, visibleIn: OWNER_ONLY },
  { id: 'personality', label: 'Personality', zone: 'configure', icon: Brain, visibleIn: OWNER_ONLY },
  { id: 'tools', label: 'Tools', zone: 'configure', icon: Wrench, visibleIn: OWNER_ONLY },
  { id: 'models', label: 'Models', zone: 'configure', icon: Cpu, visibleIn: OWNER_ONLY },
  { id: 'providers', label: 'Providers', zone: 'configure', icon: AlertTriangle, visibleIn: OWNER_ONLY },
  { id: 'approvals', label: 'Approvals', zone: 'configure', icon: ClipboardCheck, visibleIn: OWNER_ONLY },
  { id: 'cost', label: 'Cost', zone: 'configure', icon: Coins, visibleIn: OWNER_ONLY },
  { id: 'settings', label: 'Settings', zone: 'configure', icon: SettingsIcon, visibleIn: AGENT_OWNER_ONLY },
]

export const LEGACY_AGENT_SECTION_ALIASES: Record<string, AgentSection> = {}

export const AGENT_NAV_ZONES: AgentNavZone[] = ['operate', 'automate', 'configure']

export const ZONE_LABELS: Record<AgentNavZone, string> = {
  operate: 'Operate',
  automate: 'Automate',
  configure: 'Configure',
}

export function isVisibleSection(section: AgentSection, viewMode: AgentViewMode): boolean {
  const item = NAV_ITEMS.find((i) => i.id === section)
  return !!item && item.enabled !== false && item.visibleIn.includes(viewMode)
}

export function defaultSection(_viewMode: AgentViewMode): AgentSection {
  return 'overview'
}
