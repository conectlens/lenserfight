import {
  Activity,
  Bot,
  BrainCircuit,
  CalendarClock,
  Database,
  FileStack,
  GitBranch,
  LayoutDashboard,
  ScrollText,
  Settings,
  Sparkles,
  Wrench,
} from 'lucide-react'

import { FEATURES } from '@lenserfight/utils/env'

import type { SidebarNavSectionConfig } from './sidebarModes'

export function buildAgentSidebarSections(handle: string): SidebarNavSectionConfig[] {
  const base = `/lenser/${handle}/ag`

  return [
    {
      id: 'operate',
      label: 'Operate',
      items: [
        { id: 'overview', label: 'Overview', path: `${base}/overview`, icon: <LayoutDashboard size={20} /> },
        { id: 'scratchpad', label: 'Scratchpad', path: `${base}/scratchpad`, icon: <FileStack size={20} /> },
        { id: 'team', label: 'Agent Team', path: `${base}/team`, icon: <Bot size={20} /> },
        { id: 'runs', label: 'Runs', path: `${base}/runs`, icon: <Activity size={20} /> },
        { id: 'logs', label: 'Logs', path: `${base}/logs`, icon: <ScrollText size={20} /> },
      ],
    },
    {
      id: 'automate',
      label: 'Automate',
      items: [
        { id: 'workflows', label: 'Workflows', path: `${base}/workflows`, icon: <GitBranch size={20} /> },
        ...(FEATURES.CRON_SCHEDULING
          ? [{ id: 'schedules', label: 'Schedules', path: `${base}/schedules`, icon: <CalendarClock size={20} /> }]
          : []),
        { id: 'evaluations', label: 'Evaluations', path: `${base}/evaluations`, icon: <Sparkles size={20} /> },
      ],
    },
    {
      id: 'configure',
      label: 'Configure',
      items: [
        { id: 'memory', label: 'Memory', path: `${base}/memory`, icon: <Database size={20} /> },
        { id: 'personality', label: 'Personality', path: `${base}/personality`, icon: <BrainCircuit size={20} /> },
        { id: 'tools', label: 'Tools', path: `${base}/tools`, icon: <Wrench size={20} /> },
        { id: 'models', label: 'Models', path: `${base}/models`, icon: <Sparkles size={20} /> },
        { id: 'providers', label: 'Providers', path: `${base}/providers`, icon: <BrainCircuit size={20} /> },
        { id: 'settings', label: 'Settings', path: `${base}/settings`, icon: <Settings size={20} /> },
      ],
    },
  ]
}
