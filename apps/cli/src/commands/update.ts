import { spawnSync } from 'node:child_process'
import { defineCommand } from 'citty'
import consola from 'consola'
import { checkForUpdate, detectChannel, invalidateUpdateCache } from '@lenserfight/utils/update-check'
import { readCliVersion } from '../lib/version'

/**
 * `lf update` — check for CLI updates and install when a newer release is available.
 */
export default defineCommand({
  meta: {
    name: 'update',
    description: 'Check for CLI updates and install the latest release when stale.',
  },
  args: {
    check: {
      type: 'boolean',
      description: 'Only check; do not install',
      default: false,
    },
    instructions: {
      type: 'boolean',
      description: 'Print install commands instead of running them',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const current = readCliVersion()
    const channel = detectChannel(current)

    consola.start('Checking for updates…')

    const result = await checkForUpdate(current, { force: true })

    if (!result) {
      consola.info('Unable to reach the registry. Try again when online.')
      if (args.json) process.stdout.write(JSON.stringify({ current, latest: null, hasUpdate: false }) + '\n')
      return
    }

    if (args.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n')
      return
    }

    if (!result.hasUpdate) {
      consola.success(`You are on the latest version: v${current}`)
      return
    }

    consola.info(`Current:  v${result.current}`)
    consola.info(`Latest:   v${result.latest}`)
    consola.box(`Update available: v${result.current} → v${result.latest}`)

    if (args.check) return

    const installMethod = detectInstallMethod()
    const targetSpec = resolveInstallSpec(channel, result.latest)
    const pm = packageManagerCommand(installMethod)

    // No detectable package manager (or the user asked for manual steps): print
    // the install commands and exit successfully — this is a guidance path, not
    // a failure.
    if (args.instructions || !pm) {
      printInstallInstructions(installMethod, targetSpec, channel)
      return
    }

    consola.start(`Installing ${targetSpec}…`)
    const ok = runPackageManagerInstall(pm, targetSpec)
    if (!ok) {
      consola.error('Update failed. Try the command below manually:\n')
      printInstallInstructions(installMethod, targetSpec, channel)
      process.exitCode = 1
      return
    }

    invalidateUpdateCache()
    consola.success(`Updated to ${targetSpec}`)
    consola.info('Run `lf doctor` to verify your environment.')
  },
})

// ── Install method detection ──────────────────────────────────────────────────

type InstallMethod = 'npm-global' | 'pnpm-global' | 'yarn-global' | 'unknown'

function detectInstallMethod(): InstallMethod {
  const execPath = process.execPath
  const argv0 = process.argv[1] ?? ''

  if (argv0.includes('/.pnpm/') || argv0.includes('/pnpm/global/')) return 'pnpm-global'
  if (argv0.includes('/yarn/bin/') || argv0.includes('/.yarn/')) return 'yarn-global'
  if (argv0.includes('/npm/') || execPath.includes('/npm/')) return 'npm-global'

  const ua = process.env['npm_config_user_agent'] ?? ''
  if (ua.startsWith('pnpm/')) return 'pnpm-global'
  if (ua.startsWith('yarn/')) return 'yarn-global'
  if (ua.startsWith('npm/')) return 'npm-global'

  return 'unknown'
}

// Permissive semver (incl. pre-release / build metadata), e.g. 1.2.3, 1.2.3-beta.1, 1.2.3+build.5
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

function resolveInstallSpec(channel: ReturnType<typeof detectChannel>, latest: string): string {
  if (channel === 'stable') return '@lenserfight/cli@latest'
  // `latest` is fetched from the npm registry over the network. Validate it as a
  // semver before interpolating it into a spec we then execute, and fall back to
  // the channel dist-tag if the registry returned anything unexpected.
  if (SEMVER_RE.test(latest)) return `@lenserfight/cli@${latest}`
  return `@lenserfight/cli@${channel}`
}

function packageManagerCommand(method: InstallMethod): { cmd: string; args: string[] } | null {
  switch (method) {
    case 'npm-global':
      return { cmd: 'npm', args: ['install', '-g'] }
    case 'pnpm-global':
      return { cmd: 'pnpm', args: ['add', '-g'] }
    case 'yarn-global':
      return { cmd: 'yarn', args: ['global', 'add'] }
    default:
      return null
  }
}

function runPackageManagerInstall(
  pm: { cmd: string; args: string[] },
  targetSpec: string,
): boolean {
  const result = spawnSync(pm.cmd, [...pm.args, targetSpec], { stdio: 'inherit' })
  return result.status === 0
}

function printInstallInstructions(
  installMethod: InstallMethod,
  targetSpec: string,
  channel: ReturnType<typeof detectChannel>,
): void {
  consola.info('Run one of the following to update:\n')

  switch (installMethod) {
    case 'npm-global':
      process.stdout.write(`  npm install -g ${targetSpec}\n\n`)
      break
    case 'pnpm-global':
      process.stdout.write(`  pnpm add -g ${targetSpec}\n\n`)
      break
    case 'yarn-global':
      process.stdout.write(`  yarn global add ${targetSpec}\n\n`)
      break
    default:
      process.stdout.write(`  npm install -g ${targetSpec}\n`)
      process.stdout.write(`  pnpm add -g ${targetSpec}\n`)
      process.stdout.write(`  yarn global add ${targetSpec}\n\n`)
  }

  if (channel !== 'stable') {
    consola.warn(
      `You are on the '${channel}' channel. The command above targets ${targetSpec}.`,
    )
  }
}
