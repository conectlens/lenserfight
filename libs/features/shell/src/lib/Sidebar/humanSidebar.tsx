import {
  BookOpen,
  Boxes,
  Brain,
  Cloud,
  Cpu,
  ExternalLink,
  GitBranch,
  Home,
  KeyRound,
  LayoutTemplate,
  Library,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'

import { ARENA_BASE_URL, DOCS_BASE_URL, FEATURES, SURFACE } from '@lenserfight/utils/env'

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
        { id: 'overview', label: 'Overview', path: '/', exact: true, icon: <Home size={20} /> },
      ],
    },
    {
      id: 'build',
      label: 'Build',
      items: [
        { id: 'lenses', label: 'Lenses', path: '/lenses', icon: <Brain size={20} /> },
        { id: 'workflows', label: 'Workflows', path: '/workflows', icon: <GitBranch size={20} />, locked: options.isNavLocked },
        { id: 'builder', label: 'New Workflow', path: '/workflows/manage', icon: <Boxes size={20} />, locked: options.isNavLocked },
        { id: 'agents', label: 'Agents', path: '/lensers?type=ai', icon: <Users size={20} /> },
        { id: 'ai-catalog', label: 'AI Catalog', path: '/ai/catalog', icon: <Sparkles size={20} /> },
        { id: 'ai-models', label: 'AI Models', path: '/ai/catalog/models', icon: <Cpu size={20} /> },
      ],
    },
    {
      id: 'community',
      label: 'Community',
      items: [
        ...(FEATURES.PUBLIC_BATTLES
          ? [
            { id: 'arena', label: 'Arena', path: '/battles', icon: <Swords size={20} /> },
            { id: 'lenserboard', label: 'LenserBoard', path: '/lenserboard', icon: <Trophy size={20} /> },
          ]
          : []),
        { id: 'ray-cloud', label: 'Ray Cloud', path: '/ray', icon: <Cloud size={20} /> },
        { id: 'templates', label: 'Templates', externalHref: `${DOCS_BASE_URL}/reference/automation/markdown-objects#canonical-formats`, icon: <LayoutTemplate size={20} /> },
        { id: 'getting-started', label: 'Getting Started', externalHref: `${DOCS_BASE_URL}/tutorials/getting-started/overview`, icon: <BookOpen size={20} /> },
        { id: 'docs-home', label: 'Docs', externalHref: DOCS_BASE_URL, icon: <Library size={20} /> },
        { id: 'arena-home', label: 'Arena', externalHref: ARENA_BASE_URL, icon: <ExternalLink size={20} /> },
      ],
    },
    {
      id: 'developer',
      label: 'Developer',
      items: [
        { id: 'api-keys', label: 'API Keys', path: '/settings/api-keys', icon: <KeyRound size={20} /> },
        ...(SURFACE.showBillingAndStore
          ? [{ id: 'billing', label: 'Plans', path: '/billing', icon: <ShoppingBag size={20} /> }]
          : []),
      ],
    },
  ]

  return sections.filter((section) => section.items.length > 0)
}
