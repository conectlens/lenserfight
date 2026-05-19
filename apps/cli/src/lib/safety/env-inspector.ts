/** Detect well-known CI/CD environment variables. */
export function isCI(): boolean {
  return !!(
    process.env['CI'] ||
    process.env['GITHUB_ACTIONS'] ||
    process.env['GITLAB_CI'] ||
    process.env['CIRCLECI'] ||
    process.env['TRAVIS'] ||
    process.env['JENKINS_URL'] ||
    process.env['BUILDKITE'] ||
    process.env['DRONE'] ||
    process.env['CODEBUILD_BUILD_ID'] ||
    process.env['TF_BUILD'] // Azure DevOps
  )
}

/** True when LF_ENV or ENV_MODE signals a production target. */
export function isProduction(): boolean {
  const env = (process.env['LF_ENV'] ?? process.env['ENV_MODE'] ?? '').toLowerCase()
  return env === 'production' || env === 'prod'
}

/** True when the --local flag has been activated for this invocation. */
export function isLocalMode(): boolean {
  return process.env['LF_LOCAL'] === '1'
}

/**
 * Human-readable label for the active environment.
 * Prefers explicit LF_ENV; falls back to derived labels.
 */
export function detectEnvLabel(): string {
  if (isLocalMode()) return 'local'
  if (isProduction()) return 'production'
  const explicit = process.env['LF_ENV']
  if (explicit) return explicit
  return 'remote'
}

/** True when both stdin and stdout are connected to an interactive terminal. */
export function isInteractiveTTY(): boolean {
  return !!process.stdin.isTTY && !!process.stdout.isTTY
}
