import { execSync } from 'node:child_process'
import { resolveConfig } from '../../config/project-config'

export interface ToolCheckResult {
  ok: boolean
  detail: string
}

export function checkCommand(cmd: string): string | null {
  try {
    return execSync(`which ${cmd}`, { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

export function checkVersion(cmd: string): string | null {
  try {
    return execSync(`${cmd} --version`, { encoding: 'utf-8' }).trim().split('\n')[0]
  } catch {
    return null
  }
}

export function detectNode(): ToolCheckResult {
  const nodeVersion = process.version
  const nodeMajor = parseInt(nodeVersion.replace('v', '').split('.')[0], 10)
  return nodeMajor >= 20
    ? { ok: true, detail: nodeVersion }
    : { ok: false, detail: `${nodeVersion} (requires >= 20)` }
}

export function detectDocker(): ToolCheckResult {
  const dockerPath = checkCommand('docker')
  if (!dockerPath) return { ok: false, detail: 'Docker not found' }
  try {
    execSync('docker info', { stdio: 'ignore' })
    return { ok: true, detail: 'running' }
  } catch {
    return { ok: false, detail: 'installed but not running' }
  }
}

export function detectSupabaseCli(): ToolCheckResult {
  const path = checkCommand('supabase')
  if (!path) return { ok: false, detail: 'Supabase CLI not found' }
  return { ok: true, detail: checkVersion('supabase') ?? 'installed' }
}

export async function detectOllama(baseUrl?: string): Promise<ToolCheckResult> {
  const url = `${baseUrl ?? resolveConfig().ollamaBaseUrl ?? 'http://localhost:11434'}/api/tags`
  try {
    const res = await fetch(url)
    return res.ok
      ? { ok: true, detail: url }
      : { ok: false, detail: `${url} responded ${res.status}` }
  } catch {
    return { ok: false, detail: `Cannot reach ${url}` }
  }
}

export async function detectCloudApi(baseUrl?: string): Promise<ToolCheckResult> {
  const url = baseUrl ?? resolveConfig().cloudApiUrl
  try {
    const res = await fetch(url, { method: 'GET' })
    return { ok: true, detail: `${url} responded ${res.status}` }
  } catch {
    return { ok: false, detail: `Cannot reach ${url}` }
  }
}
