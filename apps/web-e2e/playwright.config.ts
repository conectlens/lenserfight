import { defineConfig, devices } from '@playwright/test'
import { workspaceRoot } from '@nx/devkit'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
      command: 'pnpm nx run web:serve',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
      timeout: 120_000,
      env: {
        FEATURE_PUBLIC_BATTLES: 'false',
        FEATURE_WAITING_LIST: 'false',
        FEATURE_BENCHMARK_UI: 'false',
      },
    },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
