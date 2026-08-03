import { spawnSync } from 'node:child_process'
import { defineCommand } from 'citty'
import consola from 'consola'
import { checkForUpdate, detectChannel, invalidateUpdateCache } from '@lenserfight/utils/update-check'
import { findInstallPermissionBlock, formatPermissionGuidance } from '../lib/install-permissions'
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

    if (args.instructions || !pm) {
      printInstallInstructions(installMethod, targetSpec, channel)
      return
    }

    // Bail before spawning npm when the install directory is not writable —
    // otherwise the user gets a wall of EACCES output followed by advice to run
    // the exact command that just failed.
    const permissionBlock = findInstallPermissionBlock(process.argv[1])
    if (permissionBlock) {
      consola.error('Cannot update in place — the install directory is not writable by your account.')
      process.stdout.write(formatPermissionGuidance(permissionBlock, targetSpec))
      process.exitCode = 1
      return
    }

    consola.start(`Installing ${targetSpec}…`)
    const failure = runPackageManagerInstall(pm, targetSpec)
    if (failure) {
      // The pre-flight cannot see every layout, so re-check before falling back
      // to "run it yourself" — that advice is useless if permissions are why it
      // failed in the first place.
      const blockedAfterAttempt = findInstallPermissionBlock(process.argv[1])
      if (blockedAfterAttempt) {
        consola.error(`Update failed — ${failure}. The install directory is not writable by your account.`)
        process.stdout.write(formatPermissionGuidance(blockedAfterAttempt, targetSpec))
        process.exitCode = 1
        return
      }
      consola.error(`Update failed — ${failure}. Try the command below manually:\n`)
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
  // Windows reports backslash-separated paths — normalise first or every probe
  // below misses and pnpm/yarn installs get told to run `npm install -g`.
  const toPosix = (p: string) => p.replace(/\\/g, '/')
  const execPath = toPosix(process.execPath)
  const argv0 = toPosix(process.argv[1] ?? '')

  if (argv0.includes('/.pnpm/') || argv0.includes('/pnpm/global/')) return 'pnpm-global'
  if (argv0.includes('/yarn/bin/') || argv0.includes('/.yarn/')) return 'yarn-global'
  if (argv0.includes('/npm/') || execPath.includes('/npm/')) return 'npm-global'
  // Homebrew-managed npm: /opt/homebrew/lib/node_modules/...
  if (argv0.includes('/node_modules/') && execPath.includes('node')) return 'npm-global'

  const ua = process.env['npm_config_user_agent'] ?? ''
  if (ua.startsWith('pnpm/')) return 'pnpm-global'
  if (ua.startsWith('yarn/')) return 'yarn-global'
  if (ua.startsWith('npm/')) return 'npm-global'

  return 'npm-global'
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

/** Runs the install; returns `null` on success or a human-readable reason on failure. */
function runPackageManagerInstall(
  pm: { cmd: string; args: string[] },
  targetSpec: string,
): string | null {
  // npm/pnpm/yarn resolve to .cmd shims on Windows — spawnSync without
  // shell:true issues a raw CreateProcess call that can't find them and
  // fails with ENOENT.
  const result = spawnSync(pm.cmd, [...pm.args, targetSpec], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  // Without this the caller reported a bare "Update failed" for both a missing
  // package manager and a real install error, leaving nothing to diagnose.
  if (result.error) return `could not run '${pm.cmd}': ${result.error.message}`
  if (result.signal) return `'${pm.cmd}' was terminated by ${result.signal}`
  if (result.status !== 0) return `'${pm.cmd}' exited with code ${result.status ?? 'unknown'}`
  return null
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
