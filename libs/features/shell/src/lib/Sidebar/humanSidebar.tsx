import {
  Brain,
  Cloud,
  GitBranch,
  Home,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'

import { ARENA_BASE_URL, FEATURES, SURFACE } from '@lenserfight/utils/env'

import type { SidebarNavSectionConfig } from './sidebarModes'

interface BuildHumanSidebarOptions {
  isNavLocked: boolean
}

export function buildHumanSidebarSections(
  options: BuildHumanSidebarOptions
): SidebarNavSectionConfig[] {
  return [
    {
      id: 'core',
      items: [
        { id: 'home', label: 'Home', path: '/', exact: true, icon: <Home size={20} /> },
        ...(SURFACE.edition === 'cloud'
          ? [{ id: 'lenserboard', label: 'LenserBoard', path: '/lenserboard', icon: <Trophy size={20} /> }]
          : []),
        ...(FEATURES.PUBLIC_BATTLES
          ? [{ id: 'arena', label: 'Arena', externalHref: `${ARENA_BASE_URL}/battles`, icon: <Sparkles size={20} /> }]
          : []),
        { id: 'lenses', label: 'Lenses', path: '/lenses', icon: <Brain size={20} /> },
        {
          id: 'workflows',
          label: 'Workflows',
          path: '/workflows',
          icon: <GitBranch size={20} />,
          locked: options.isNavLocked,
        },
        { id: 'ray-cloud', label: 'Ray Cloud', path: '/ray', icon: <Cloud size={20} /> },
        { id: 'lensers', label: 'Lensers', path: '/lensers', icon: <Users size={20} /> },
        { id: 'ai-catalog', label: 'AI Catalog', path: '/ai/catalog', icon: <Sparkles size={20} /> },
        ...(SURFACE.showBillingAndStore
          ? [{ id: 'billing', label: 'Plans', path: '/billing', icon: <ShoppingBag size={20} /> }]
          : []),
      ],
    },
  ]
}
