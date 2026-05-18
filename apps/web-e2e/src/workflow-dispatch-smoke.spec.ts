/**
 * Phase 7 — workflow dispatch smoke (@smoke).
 *
 * Boots the dev server and asserts the workflow / lenserboard routes mount
 * without runtime errors. Deep workflow-execution lifecycle behavior is
 * covered by infra-execution Vitest suites; this is the bundle-load canary.
 *
 * Run with `pnpm nx e2e web-e2e --grep '@smoke'`.
 */

import { expect, test } from '@playwright/test'

test.describe('@smoke workflow dispatch shell', () => {
  test('/lenserboard mounts without runtime errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    const response = await page.goto('/lenserboard', { waitUntil: 'networkidle' })

    // Community build may 404 or redirect; both are acceptable.
    if (response && response.status() >= 500) {
      throw new Error(`/lenserboard returned ${response.status()}`)
    }
    expect(consoleErrors).toEqual([])
  })

  test('/connectors mounts without runtime errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    const response = await page.goto('/connectors', { waitUntil: 'networkidle' })
    if (response && response.status() >= 500) {
      throw new Error(`/connectors returned ${response.status()}`)
    }
    expect(consoleErrors).toEqual([])
  })
})
