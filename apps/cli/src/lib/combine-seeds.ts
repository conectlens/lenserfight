import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Regenerates supabase/seed.sql when combine-seeds.sh exists (monorepo root = cwd). */
export function runCombineSeedsIfPresent(cwd: string): void {
  const supabaseDir = resolve(cwd, 'supabase')
  const script = resolve(supabaseDir, 'combine-seeds.sh')
  if (!existsSync(script)) {
    return
  }
  execSync('bash combine-seeds.sh', { cwd: supabaseDir, stdio: 'inherit' })
}
