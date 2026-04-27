/**
 * Deployment surface (Community vs Cloud): which first-party UI routes and nav
 * items match the schemas available in this build. Information expert for
 * edition-gating (GRASP); keep routing/sidebar logic declarative.
 */

export type ProductEdition = 'community' | 'cloud'

export type AppSurface = {
  readonly edition: ProductEdition
  /** Benchmark suites UI (requires benchmark.* in Supabase — cloud / platform only). */
  readonly showBenchmarkSuite: boolean
  /** Billing / store UI (requires billing.* / wallet — cloud / platform only). */
  readonly showBillingAndStore: boolean
}

function readEdition(): ProductEdition {
  const raw = import.meta.env.VITE_PRODUCT_EDITION
  if (raw === 'cloud' || raw === 'community') {
    return raw
  }
  return 'community'
}

function envForceTrue(key: string): boolean {
  return import.meta.env[key] === 'true'
}

/**
 * Resolves product edition from `VITE_PRODUCT_EDITION` (default `community`).
 */
export function resolveProductEdition(): ProductEdition {
  return readEdition()
}

/**
 * Resolves which cloud-shaped product areas are exposed in the SPA.
 * Cloud edition enables benchmark + billing surfaces unless explicitly forced off.
 * Community hides them unless `VITE_FEATURE_BENCHMARK_UI` / `VITE_FEATURE_BILLING_UI` is true.
 */
export function resolveAppSurface(): AppSurface {
  const edition = readEdition()
  const isCloud = edition === 'cloud'
  // import.meta.env.PROD is false during `vite dev` — billing never leaks to local devs
  const isProd = import.meta.env.PROD

  const showBenchmarkSuite = envForceTrue('VITE_FEATURE_BENCHMARK_UI') || isCloud
  const showBillingAndStore = isProd && (envForceTrue('VITE_FEATURE_BILLING_UI') || isCloud)

  return {
    edition,
    showBenchmarkSuite,
    showBillingAndStore,
  }
}

/** Module-level singleton for Vite (import.meta.env is static per build). */
export const SURFACE: AppSurface = resolveAppSurface()
