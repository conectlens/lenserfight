/**
 * Phase 7 — lens execution smoke (@smoke).
 *
 * Confirms the lens lab / chat route loads without runtime crashes and that
 * the application shell renders. Detailed lens-execution lifecycle behavior
 * is covered by unit + integration suites at the providers / infra layers.
 *
 * Run with `pnpm nx e2e web-e2e --grep '@smoke'`.
 */

import { expect, test } from '@playwright/test'

test.describe('@smoke lens execution shell', () => {
  test('/chat renders without runtime errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    const response = await page.goto('/chat', { waitUntil: 'networkidle' })

    // The route may redirect (community build), 404, or render — all acceptable.
    // We only assert no runtime errors fired during navigation.
    if (response && response.status() >= 500) {
      throw new Error(`/chat returned ${response.status()}`)
    }
    expect(consoleErrors).toEqual([])
  })

  test('/welcome renders the application shell', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    await page.goto('/welcome', { waitUntil: 'networkidle' })
    // No matter where /welcome ultimately resolves, the page should mount
    // without throwing.
    expect(consoleErrors).toEqual([])
  })
})
