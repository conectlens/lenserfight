/**
 * Runtime detection for the export feature.
 *
 * Stable across SSR — when there is no window, we always return 'cloud'
 * so server-rendered output is deterministic. The actual mode is
 * resolved on the client and exposed via useRuntimeMode().
 *
 * GRASP: Pure Fabrication. No domain meaning, exists purely to gate
 * which transport (cloud / local-download / local-workspace) is
 * available.
 */

export type RuntimeMode = 'cloud' | 'localhost-browser' | 'localhost-desktop'

interface DesktopBridge {
  writeAtomic(relPath: string, bytes: Uint8Array): Promise<void>
  probe(): Promise<{ ok: boolean; root: string }>
}

interface WindowWithDesktop extends Window {
  lenserfightDesktop?: DesktopBridge
  __TAURI__?: unknown
  electron?: unknown
}

export function detectRuntime(deploymentFlag?: string): RuntimeMode {
  if (typeof window === 'undefined') return 'cloud'
  const w = window as WindowWithDesktop
  const isDesktop = Boolean(w.lenserfightDesktop || w.__TAURI__ || w.electron)
  if (isDesktop) return 'localhost-desktop'
  const isLocal =
    deploymentFlag === 'localhost' ||
    (typeof location !== 'undefined' &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
  if (isLocal) return 'localhost-browser'
  return 'cloud'
}

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') return null
  return (window as WindowWithDesktop).lenserfightDesktop ?? null
}
