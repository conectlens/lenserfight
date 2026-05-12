import { defineCommand } from 'citty'
import consola from 'consola'

import { isAuthenticated } from '../utils/auth'
import { callRpc } from '../utils/api'
import setupCommand from './setup'

// Phase BA: friendly first-run flow.
//
// 1. Check auth, prompt `lf auth login` if missing.
// 2. Check profile completeness (handle, display name), prompt if missing.
// 3. Show the top 3 public battle templates.
// 4. Offer `lf battle new --from-template <slug>` as the first action.
//
// When `--full`, delegate to `lf setup` (the long-form journey checklist).

interface PublicTemplate {
  id: string
  title: string
  description?: string | null
  category?: string | null
}

interface ProfileSnapshot {
  handle?: string | null
  display_name?: string | null
}

function templateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function showTopTemplates(): Promise<void> {
  try {
    const templates = await callRpc<PublicTemplate[]>(
      'fn_list_public_battle_templates',
      { p_category: null, p_limit: 3 },
      { requireAuth: false }
    )
    if (!templates || templates.length === 0) {
      consola.info('No public templates published yet. Skipping template suggestions.')
      return
    }
    consola.box('Top public battle templates:')
    for (const t of templates) {
      const slug = templateSlug(t.title)
      consola.info(`  • ${t.title}${t.category ? ` (${t.category})` : ''}`)
      if (t.description) {
        consola.log(`      ${t.description.slice(0, 100)}`)
      }
      consola.log(`      run: lf battle new --from-template ${slug}`)
    }
  } catch (err) {
    consola.warn('Could not fetch public templates: %s', (err as Error).message)
  }
}

async function fetchProfile(): Promise<ProfileSnapshot | null> {
  try {
    const profile = await callRpc<ProfileSnapshot>('fn_get_my_lenser_profile', {}, { requireAuth: true })
    return profile ?? null
  } catch {
    return null
  }
}

export default defineCommand({
  meta: {
    name: 'onboard',
    description:
      'Friendly first-run flow: auth + profile check, then surface public battle templates so the first action is one command away. Pass --full to run the long `lf setup` journey.',
  },
  args: {
    full: {
      type: 'boolean',
      description: 'Run the full lf setup journey instead of the short first-run flow',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output JSON',
      default: false,
    },
  },
  async run(ctx) {
    if (ctx.args.full) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (setupCommand as any).run?.(ctx)
    }

    consola.start('LenserFight onboarding')

    // 1. Auth check.
    if (!isAuthenticated()) {
      consola.warn('You are not signed in.')
      consola.info('Run: lf auth login')
      process.exitCode = 1
      return
    }
    consola.success('Signed in.')

    // 2. Profile completeness.
    const profile = await fetchProfile()
    if (!profile || !profile.handle || !profile.display_name) {
      consola.warn('Profile incomplete — set your handle and display name.')
      consola.info('Run: lf profile update --handle <handle> --display-name "<your name>"')
    } else {
      consola.success('Profile ready: @%s (%s)', profile.handle, profile.display_name)
    }

    // 3. Public templates → first action.
    await showTopTemplates()

    consola.box(
      [
        'Ready for your first battle?',
        '  → lf battle new --from-template <slug>',
        '',
        'Need a full environment audit? Run: lf onboard --full',
      ].join('\n')
    )
  },
})
