/**
 * Phase 7 — battle execution smoke (@smoke).
 *
 * Validates two invariants:
 *   1. The battles browse route loads (or correctly gates) without runtime
 *      errors.
 *   2. Direct deep links into a battle slug never explode — even when the
 *      slug is missing, the page must render a graceful state.
 *
 * Run with `pnpm nx e2e web-e2e --grep '@smoke'`.
 */

import { expect, test } from '@playwright/test'

test.describe('@smoke battle execution shell', () => {
  test('/battles/browse loads without runtime errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    const response = await page.goto('/battles/browse', { waitUntil: 'networkidle' })

    // 404 / redirect / render are all valid; what we forbid is a JS error.
    if (response && response.status() >= 500) {
      throw new Error(`/battles/browse returned ${response.status()}`)
    }
    expect(consoleErrors).toEqual([])
  })

  test('non-existent battle slug renders a graceful state', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    const response = await page.goto('/battles/this-slug-does-not-exist', {
      waitUntil: 'networkidle',
    })
    if (response && response.status() >= 500) {
      throw new Error(`bad slug returned ${response.status()}`)
    }
    expect(consoleErrors).toEqual([])
  })
})
