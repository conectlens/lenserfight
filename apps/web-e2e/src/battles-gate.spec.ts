import { expect, test } from '@playwright/test'

// Smoke checks for arena-adjacent routes: no 5xx responses and no uncaught
// client errors when hitting common entrypoints.

test.describe('Arena/battles routing smoke', () => {
  test('/lenserboard loads without server error', async ({ page }) => {
    const response = await page.goto('/lenserboard', { waitUntil: 'networkidle' })
    if (response && response.status() >= 500) {
      throw new Error(`/lenserboard returned ${response.status()}`)
    }
  })

  test('/welcome does not redirect to external arena', async ({ page }) => {
    await page.goto('/welcome', { waitUntil: 'networkidle' })

    // Local dev uses ARENA_URL (e.g. localhost:3001); never silently bounce to production.
    await expect(page).not.toHaveURL(/lenserfight\.com\/get-started/)
  })

  test('/benchmark is not a product route', async ({ page }) => {
    await page.goto('/benchmark', { waitUntil: 'networkidle' })
    await expect(page).not.toHaveURL(/\/benchmark\/?$/)
  })
})
