/**
 * Deployment surface (Community vs Cloud): which first-party UI routes and nav
 * items match the schemas available in this build. Information expert for
 * edition-gating (GRASP); keep routing/sidebar logic declarative.
 */

export type ProductEdition = 'community' | 'cloud' | 'local'

export type AppSurface = {
  readonly edition: ProductEdition
  /** Benchmark suites UI (requires benchmark.* in Supabase — cloud / platform only). */
  readonly showBenchmarkSuite: boolean
}

function readEdition(): ProductEdition {
  const raw = import.meta.env.PRODUCT_EDITION
  if (raw === 'cloud' || raw === 'community' || raw === 'local') {
    return raw
  }
  return 'community'
}

function envForceTrue(key: string): boolean {
  return import.meta.env[key] === 'true'
}

/**
 * Resolves product edition from `PRODUCT_EDITION` (default `community`).
 */
export function resolveProductEdition(): ProductEdition {
  return readEdition()
}

/**
 * Resolves which cloud-shaped product areas are exposed in the SPA.
 * Cloud edition enables benchmark + billing surfaces unless explicitly forced off.
 * Community hides them unless `FEATURE_BENCHMARK_UI` / `FEATURE_BILLING_UI` is true.
 */
export function resolveAppSurface(): AppSurface {
  const edition = readEdition()
  const isCloud = edition === 'cloud'

  const showBenchmarkSuite = envForceTrue('FEATURE_BENCHMARK_UI') || isCloud

  return {
    edition,
    showBenchmarkSuite,
  }
}

/** Module-level singleton for Vite (import.meta.env is static per build). */
export const SURFACE: AppSurface = resolveAppSurface()
