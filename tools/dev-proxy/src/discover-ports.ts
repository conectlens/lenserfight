import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export interface AppRoute {
  name: string
  port: number
  target: string
}

// Apps without a web dev server — skip these
const EXCLUDE = new Set(['cli', 'mobile'])

// tools/dev-proxy/src/discover-ports.ts → 4 levels up = workspace root
const workspaceRoot = path.resolve(fileURLToPath(import.meta.url), '../../../..')
const appsDir = path.join(workspaceRoot, 'apps')

function tryViteConfig(appName: string): number | null {
  const candidates = [
    path.join(appsDir, appName, 'vite.config.mts'),
    path.join(appsDir, appName, 'vite.config.ts'),
    path.join(appsDir, appName, 'vite.config.mjs'),
    path.join(appsDir, appName, 'vite.config.js'),
  ]

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue
    const text = fs.readFileSync(candidate, 'utf-8')
    // Match: server: { ... port: 3000 ... }
    const match = text.match(/server\s*:\s*\{[^}]*port\s*:\s*(\d+)/s)
    if (match) return parseInt(match[1], 10)
  }

  return null
}

function tryProjectJson(appName: string): number | null {
  const projectJsonPath = path.join(appsDir, appName, 'project.json')
  if (!fs.existsSync(projectJsonPath)) return null

  try {
    const json = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'))
    const command: string | undefined = json?.targets?.serve?.options?.command
    if (!command) return null
    const match = command.match(/--port\s+(\d+)/)
    if (match) return parseInt(match[1], 10)
  } catch {
    // malformed project.json — skip
  }

  return null
}

export function discoverPorts(): AppRoute[] {
  if (!fs.existsSync(appsDir)) return []

  const entries = fs.readdirSync(appsDir, { withFileTypes: true })
  const routes: AppRoute[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    if (EXCLUDE.has(name)) continue

    const port = tryViteConfig(name) ?? tryProjectJson(name)
    if (!port) continue

    routes.push({ name, port, target: `http://localhost:${port}` })
  }

  // Sort by port for consistent display
  routes.sort((a, b) => a.port - b.port)

  return routes
}
