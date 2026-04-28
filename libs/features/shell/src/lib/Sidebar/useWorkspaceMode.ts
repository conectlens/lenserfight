import type { SidebarMode } from './sidebarModes'

interface WorkspaceProfile {
  type?: string | null
}

export function useWorkspaceMode(activeProfile: WorkspaceProfile | null | undefined): SidebarMode {
  return activeProfile?.type === 'ai' ? 'agent' : 'human'
}
