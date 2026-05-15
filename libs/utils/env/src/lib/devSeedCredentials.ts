/**
 * Local development seed credentials.
 *
 * This module exists ONLY to be loaded behind an `import.meta.env.DEV` guard
 * via a dynamic `import()`. Vite's static-replacement of `import.meta.env.DEV`
 * with `false` in production builds drops the dynamic import branch entirely,
 * so the credential strings never reach the production bundle.
 *
 * Do not import this file from any module that is reachable from the
 * production entrypoint. The runtime helper `loadDevSeedCredentials()` in
 * `runtimeConfig.ts` is the only sanctioned access path.
 */
export const LOCAL_SEED_CREDENTIALS = {
  email: 'hey@lenserfight.local',
  password: 'change-me-in-local-dev',
  displayName: 'LenserFight',
} as const

export type LocalSeedCredentials = typeof LOCAL_SEED_CREDENTIALS
