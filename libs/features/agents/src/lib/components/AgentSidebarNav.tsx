import {
  Activity,
  AlertTriangle,
  Bot,
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
import React from 'react'
import { Link, useLocation } from 'react-router-dom'

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
  | 'personality'
  | 'tools'
  | 'models'
  | 'providers'
  | 'approvals'
  | 'cost'
  | 'settings'

type Zone = 'operate' | 'automate' | 'configure'

interface NavItem {
  id: AgentSection
  label: string
  zone: Zone
  icon: React.ComponentType<{ size?: number }>
  /** Modes for which this item is visible. Default: all owner modes. */
  visibleIn: AgentViewMode[]
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

const NAV_ITEMS: NavItem[] = [
  // OPERATE
  { id: 'overview', label: 'Overview', zone: 'operate', icon: Layers, visibleIn: PUBLIC_VISIBLE },
  { id: 'scratchpad', label: 'Scratchpad', zone: 'operate', icon: FileStack, visibleIn: AGENT_OWNER_ONLY },
  { id: 'team', label: 'Agent Team', zone: 'operate', icon: Network, visibleIn: OWNER_ONLY },
  { id: 'runs', label: 'Runs', zone: 'operate', icon: Activity, visibleIn: PUBLIC_VISIBLE },
  { id: 'logs', label: 'Logs', zone: 'operate', icon: ClipboardList, visibleIn: OWNER_ONLY },
  // AUTOMATE
  { id: 'workflows', label: 'Workflows', zone: 'automate', icon: GitBranch, visibleIn: PUBLIC_VISIBLE },
  { id: 'schedules', label: 'Schedules', zone: 'automate', icon: CalendarClock, visibleIn: OWNER_ONLY },
  { id: 'evaluations', label: 'Evaluations', zone: 'automate', icon: ListChecks, visibleIn: OWNER_ONLY },
  // CONFIGURE
  { id: 'memory', label: 'Memory', zone: 'configure', icon: Sparkles, visibleIn: OWNER_ONLY },
  { id: 'personality', label: 'Personality', zone: 'configure', icon: Bot, visibleIn: OWNER_ONLY },
  { id: 'tools', label: 'Tools', zone: 'configure', icon: Wrench, visibleIn: OWNER_ONLY },
  { id: 'models', label: 'Models', zone: 'configure', icon: Cpu, visibleIn: OWNER_ONLY },
  { id: 'providers', label: 'Providers', zone: 'configure', icon: AlertTriangle, visibleIn: OWNER_ONLY },
  { id: 'approvals', label: 'Approvals', zone: 'configure', icon: ClipboardCheck, visibleIn: OWNER_ONLY },
  { id: 'cost', label: 'Cost', zone: 'configure', icon: Coins, visibleIn: OWNER_ONLY },
  { id: 'settings', label: 'Settings', zone: 'configure', icon: SettingsIcon, visibleIn: AGENT_OWNER_ONLY },
]

const ZONE_LABELS: Record<Zone, string> = {
  operate: 'Operate',
  automate: 'Automate',
  configure: 'Configure',
}

interface AgentSidebarNavProps {
  handle: string
  viewMode: AgentViewMode
  activeSection: AgentSection
}

export const AgentSidebarNav: React.FC<AgentSidebarNavProps> = ({
  handle,
  viewMode,
  activeSection,
}) => {
  const location = useLocation()
  const visible = NAV_ITEMS.filter((item) => item.visibleIn.includes(viewMode))
  const zones: Zone[] = ['operate', 'automate', 'configure']

  return (
    <nav
      aria-label="Agent operations navigation"
      className="flex h-full flex-col gap-6 rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          Agent Operations
        </p>
        <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
          @{handle}
        </p>
      </div>
      {zones.map((zone) => {
        const items = visible.filter((item) => item.zone === zone)
        if (items.length === 0) return null
        return (
          <div key={zone}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              {ZONE_LABELS[zone]}
            </p>
            <ul className="mt-2 space-y-1">
              {items.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                const search = location.search ?? ''
                return (
                  <li key={item.id}>
                    <Link
                      to={`/lenser/${handle}/ag/${item.id}${search}`}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

export function isVisibleSection(
  section: AgentSection,
  viewMode: AgentViewMode
): boolean {
  const item = NAV_ITEMS.find((i) => i.id === section)
  return !!item && item.visibleIn.includes(viewMode)
}

export function defaultSection(_viewMode: AgentViewMode): AgentSection {
  return 'overview'
}
