import { expect, test } from '@playwright/test'

// Phase 9 acceptance criterion #3:
// With FEATURE_PUBLIC_BATTLES=false, arena/battle entrypoints must redirect to a
// safe page (/, /workflows) or 404 — never render the live arena UI.
//
// The webServer config in playwright.config.ts sets these env vars before
// launching the dev server.

test.describe('Arena/battles gate (battles off)', () => {
  test('/lenserboard redirects to home', async ({ page }) => {
    const response = await page.goto('/lenserboard', { waitUntil: 'networkidle' })

    // Either the route returned 404, or the React router redirected client-side.
    if (response && response.status() === 404) return

    // Otherwise: confirm we did NOT land on a rendered lenserboard page.
    await expect(page).not.toHaveURL(/\/lenserboard\/?$/)
  })

  test('/welcome does not redirect to external arena', async ({ page }) => {
    await page.goto('/welcome', { waitUntil: 'networkidle' })

    // Community build sends /welcome → /workflows. Should never end up at an
    // external lenserfight.com/get-started arena URL.
    await expect(page).not.toHaveURL(/lenserfight\.com\/get-started/)
  })

  test('/benchmark is not a product route', async ({ page }) => {
    await page.goto('/benchmark', { waitUntil: 'networkidle' })
    await expect(page).not.toHaveURL(/\/benchmark\/?$/)
  })
})
