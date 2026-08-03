import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { currentScriptUrl } from './current-script-url'

/** Read the CLI package version from package.json, falling back to '0.0.0-dev'. */
export function readCliVersion(): string {
  const thisDir = dirname(fileURLToPath(currentScriptUrl))
  const candidates = [
    join(thisDir, 'package.json'),
    resolve(thisDir, '../package.json'),
    resolve(process.cwd(), 'apps/cli/package.json'),
  ]

  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      const pkg = JSON.parse(readFileSync(p, 'utf-8')) as { version?: string }
      if (pkg.version) return pkg.version
    } catch {
      // fall through
    }
  }

  return '0.0.0-dev'
}
