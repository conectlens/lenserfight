import {
  Brain,
  Cloud,
  Cpu,
  ExternalLink,
  GitBranch,
  Home,
  KeyRound,
  LayoutTemplate,
  Library,
  MessageCircle,
  Server,

  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'

import { ARENA_BASE_URL, DOCS_BASE_URL, FEATURES } from '@lenserfight/utils/env'

import type { SidebarNavSectionConfig } from './sidebarModes'

interface BuildHumanSidebarOptions {
  isNavLocked: boolean
}

export function buildHumanSidebarSections(
  options: BuildHumanSidebarOptions
): SidebarNavSectionConfig[] {
  const sections: SidebarNavSectionConfig[] = [
    {
      id: 'operate',
      label: 'Operate',
      items: [
        { id: 'overview', label: 'Discover', path: '/', exact: true, icon: <Home size={20} /> },
      ],
    },
    {
      id: 'chat',
      label: 'Chat',
      items: [
        { id: 'chat', label: 'Chat', path: '/chat', exact: true, icon: <MessageCircle size={20} />, wip: true },
      ],
    },
    {
      id: 'arena',
      label: 'Arena',
      items: [
        { id: 'ray-cloud', label: 'Topics', path: '/ray', icon: <Cloud size={20} /> },
        { id: 'lenses', label: 'Lenses (Prompts)', path: '/lenses', icon: <Brain size={20} /> },
        { id: 'workflows', label: 'Workflows', path: '/workflows', icon: <GitBranch size={20} />, locked: options.isNavLocked },
        ...(FEATURES.PUBLIC_BATTLES
          ? [
            { id: 'battles', label: 'Battles', path: '/battles', icon: <Swords size={20} /> },
            { id: 'battle-templates', label: 'Battle Templates', path: '/battles/templates', icon: <LayoutTemplate size={20} /> },
            { id: 'lensers', label: 'AI Lensers & Agents', path: '/lensers', icon: <Users size={20} /> },
            { id: 'lenserboard', label: 'LenserBoard', path: '/lenserboard', icon: <Trophy size={20} /> },
          ]
          : [])
      ],
    },
    {
      id: 'community',
      label: 'Community',
      items: [
        { id: 'ai-catalog', label: 'AI Catalog', path: '/ai/catalog', icon: <Sparkles size={20} /> },
        { id: 'ai-models', label: 'AI Models', path: '/ai/catalog/models', icon: <Cpu size={20} /> },
        { id: 'templates', label: 'Lens (Prompt) Formats', externalHref: `${DOCS_BASE_URL}/en/reference/automation/markdown-objects#canonical-formats`, icon: <LayoutTemplate size={20} /> },
        { id: 'docs-home', label: 'Docs', externalHref: DOCS_BASE_URL, icon: <Library size={20} /> },
        { id: 'arena-home', label: 'Public Arena Site', externalHref: ARENA_BASE_URL, icon: <ExternalLink size={20} /> },
      ],
    },
    {
      id: 'developer',
      label: 'Developer',
      items: [
        { id: 'api-keys', label: 'API Keys', path: '/settings/api-keys', icon: <KeyRound size={20} /> },
        { id: 'gateway-daemons', label: 'Gateway', path: '/settings/gateway', icon: <Server size={20} /> },
      ],
    },
  ]

  return sections.filter((section) => section.items.length > 0)
}
