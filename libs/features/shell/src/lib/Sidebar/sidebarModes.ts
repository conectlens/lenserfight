import type React from 'react'

export type SidebarMode = 'human' | 'agent'

export interface SidebarNavItemConfig {
  id: string
  label: string
  icon: React.ReactNode
  path?: string
  activePath?: string
  exact?: boolean
  externalHref?: string
  locked?: boolean
  isComingSoon?: boolean
  wip?: boolean
}

export interface SidebarNavSectionConfig {
  id: string
  label?: string
  items: SidebarNavItemConfig[]
}
