import {
  Activity,
  BookOpen,
  Brain,
  Bot,
  Boxes,
  ClipboardList,
  Cloud,
  Cpu,
  Database,
  FileStack,
  GitBranch,
  Home,
  KeyRound,
  LayoutTemplate,
  PlugZap,
  ScrollText,
  ShoppingBag,
  Sparkles,
  TerminalSquare,
  Users,
  Users2,
  Wrench,
} from 'lucide-react'

import { DOCS_BASE_URL, SURFACE } from '@lenserfight/utils/env'

import type { SidebarNavSectionConfig } from './sidebarModes'

interface BuildHumanSidebarOptions {
  isNavLocked: boolean
  activeWorkspaceHandle?: string
}

export function buildHumanSidebarSections(
  options: BuildHumanSidebarOptions
): SidebarNavSectionConfig[] {
  const hasActiveWorkspace = !!options.activeWorkspaceHandle
  const agentBase = options.activeWorkspaceHandle
    ? `/lenser/${options.activeWorkspaceHandle}/ag`
    : ''

  const sections: SidebarNavSectionConfig[] = [
    {
      id: 'operate',
      label: 'Operate',
      items: [
        { id: 'overview', label: 'Overview', path: '/', exact: true, icon: <Home size={20} /> },
        ...(hasActiveWorkspace
          ? [
              { id: 'agent-workspace', label: 'Agent Workspace', path: `${agentBase}/overview`, icon: <Bot size={20} /> },
              { id: 'runs', label: 'Runs', path: `${agentBase}/runs`, icon: <Activity size={20} /> },
              { id: 'logs', label: 'Logs', path: `${agentBase}/logs`, icon: <ClipboardList size={20} /> },
            ]
          : []),
      ],
    },
    {
      id: 'build',
      label: 'Build',
      items: [
        {
          id: 'workflows',
          label: 'Workflows',
          path: '/workflows',
          icon: <GitBranch size={20} />,
          locked: options.isNavLocked,
        },
        { id: 'builder', label: 'New Workflow', path: '/workflows/manage', icon: <Boxes size={20} />, locked: options.isNavLocked },
        { id: 'agents', label: 'Agents', path: '/lensers?type=ai', icon: <Users size={20} /> },
        ...(hasActiveWorkspace
          ? [{ id: 'agent-teams', label: 'Agent Teams', path: `${agentBase}/team`, icon: <Users2 size={20} /> }]
          : []),
        { id: 'lenses', label: 'Lenses', path: '/lenses', icon: <Brain size={20} /> },
      ],
    },
    {
      id: 'automate',
      label: 'Automate',
      items: [
        ...(hasActiveWorkspace
          ? [{ id: 'evaluations', label: 'Evaluations', path: `${agentBase}/evaluations`, icon: <Sparkles size={20} /> }]
          : []),
      ],
    },
    {
      id: 'configure',
      label: 'Configure',
      items: [
        ...(hasActiveWorkspace
          ? [
              { id: 'tools', label: 'Tools', path: `${agentBase}/tools`, icon: <Wrench size={20} /> },
              { id: 'memory', label: 'Memory', path: `${agentBase}/memory`, icon: <Database size={20} /> },
              { id: 'instructions', label: 'Instructions', path: `${agentBase}/instructions`, icon: <FileStack size={20} /> },
            ]
          : []),
        { id: 'models', label: 'Models', path: '/ai/catalog/models', icon: <Cpu size={20} /> },
        { id: 'providers', label: 'Providers', path: '/ai/catalog', icon: <PlugZap size={20} /> },
      ],
    },
    {
      id: 'community',
      label: 'Community',
      items: [
        { id: 'templates', label: 'Templates', externalHref: `${DOCS_BASE_URL}/reference/automation/markdown-objects#canonical-formats`, icon: <LayoutTemplate size={20} /> },
        { id: 'docs', label: 'Docs', externalHref: `${DOCS_BASE_URL}/explanation/automation/index`, icon: <BookOpen size={20} /> },
        { id: 'ray-cloud', label: 'Ray Cloud', path: '/ray', icon: <Cloud size={20} /> },
      ],
    },
    {
      id: 'developer',
      label: 'Developer',
      items: [
        { id: 'api-keys', label: 'API Keys', path: '/settings/api-keys', icon: <KeyRound size={20} /> },
        { id: 'cli', label: 'CLI', externalHref: `${DOCS_BASE_URL}/reference/cli/index`, icon: <TerminalSquare size={20} /> },
        { id: 'local-runtime', label: 'Local Runtime', externalHref: `${DOCS_BASE_URL}/reference/cli/dev`, icon: <ScrollText size={20} /> },
        ...(SURFACE.showBillingAndStore
          ? [{ id: 'billing', label: 'Plans', path: '/billing', icon: <ShoppingBag size={20} /> }]
          : []),
        { id: 'skills', label: 'Skills', externalHref: `${DOCS_BASE_URL}/reference/automation/markdown-objects#skillmd`, icon: <FileStack size={20} /> },
      ],
    },
  ]

  return sections.filter((section) => section.items.length > 0)
}
