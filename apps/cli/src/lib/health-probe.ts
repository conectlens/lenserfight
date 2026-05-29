import {
  getEffectiveMode,
  resolveConfig,
  SUPABASE_EDGE_FUNCTIONS_SUFFIX,
  type EffectiveApiMode,
  type LenserfightConfig,
} from '../config/project-config'

/** URLs to probe for the TUI header / service panel. */
export function getHealthProbeUrls(
  mode: EffectiveApiMode,
  config: Pick<LenserfightConfig, 'supabaseUrl' | 'cloudApiUrl'>,
): string[] {
  const base = config.supabaseUrl?.trim().replace(/\/$/, '')
  if (!base) return []

  const supabaseAuthHealth = `${base}/auth/v1/health`

  if (mode === 'cloud') {
    return [supabaseAuthHealth]
  }

  const urls = [supabaseAuthHealth]
  const api = config.cloudApiUrl?.trim().replace(/\/$/, '')
  if (
    api &&
    !api.endsWith(SUPABASE_EDGE_FUNCTIONS_SUFFIX) &&
    !api.endsWith('/rest/v1')
  ) {
    urls.push(`${api}/health`)
  }
  return urls
}

export async function probeHealthUrls(
  urls: string[],
  options: { apikey?: string; timeoutMs?: number } = {},
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 2000
  const headers: Record<string, string> = {}
  if (options.apikey?.trim()) {
    headers['apikey'] = options.apikey.trim()
  }

  for (const url of urls) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch(url, { signal: ctrl.signal, headers })
      clearTimeout(timer)
      if (res.ok) return true
    } catch {
      /* try next */
    }
  }
  return false
}

/** Dashboard / TUI aggregate health for the active API mode. */
export async function probeBackendHealth(cwd?: string): Promise<boolean> {
  try {
    const config = resolveConfig(cwd)
    const { mode } = getEffectiveMode(cwd)
    const urls = getHealthProbeUrls(mode, config)
    if (urls.length === 0) return false
    return probeHealthUrls(urls, { apikey: config.supabaseAnonKey })
  } catch {
    return false
  }
}
