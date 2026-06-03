import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Regenerates supabase/seed.sql when combine-seeds.sh exists (monorepo root = cwd). */
export function runCombineSeedsIfPresent(cwd: string): void {
  const supabaseDir = resolve(cwd, 'supabase')
  const script = resolve(supabaseDir, 'combine-seeds.sh')
  if (!existsSync(script)) return

  if (process.platform === 'win32') {
    // bash is not available by default on Windows — probe before attempting
    try {
      execSync('bash --version', { stdio: 'ignore' })
    } catch {
      process.stderr.write(
        'combine-seeds.sh found but bash is not in PATH on Windows.\n' +
          'Install Git for Windows (https://git-scm.com) or enable WSL, then run:\n' +
          '  bash supabase/combine-seeds.sh\n'
      )
      return
    }
  }

  execSync('bash combine-seeds.sh', { cwd: supabaseDir, stdio: 'inherit' })
}
