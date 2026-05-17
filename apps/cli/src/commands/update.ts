import { defineCommand } from 'citty'
import consola from 'consola'
import { checkForUpdate, detectChannel } from '@lenserfight/utils/update-check'
import { readCliVersion } from '../lib/version'

/**
 * `lf update` — check for and guide the user through updating the CLI.
 *
 * The command never executes shell commands on the user's behalf (supply-chain
 * safety). It detects the likely install method and prints the correct update
 * command for the user to run themselves.
 */
export default defineCommand({
  meta: {
    name: 'update',
    description: 'Check for CLI updates and print upgrade instructions.',
  },
  args: {
    check: {
      type: 'boolean',
      description: 'Only check and print the result; do not print install commands',
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

    consola.info('Run one of the following to update:\n')

    switch (installMethod) {
      case 'npm-global':
        process.stdout.write(`  npm install -g @lenserfight/cli@latest\n\n`)
        break
      case 'pnpm-global':
        process.stdout.write(`  pnpm add -g @lenserfight/cli@latest\n\n`)
        break
      case 'yarn-global':
        process.stdout.write(`  yarn global add @lenserfight/cli@latest\n\n`)
        break
      default:
        // Can't reliably detect — show all options
        process.stdout.write(`  npm install -g @lenserfight/cli@latest\n`)
        process.stdout.write(`  pnpm add -g @lenserfight/cli@latest\n`)
        process.stdout.write(`  yarn global add @lenserfight/cli@latest\n\n`)
    }

    if (channel !== 'stable') {
      consola.warn(
        `You are on the '${channel}' channel. The command above installs the latest stable release.`,
      )
      process.stdout.write(
        `  To stay on the '${channel}' channel:\n` +
        `  npm install -g @lenserfight/cli@${channel}\n\n`,
      )
    }

    consola.info('After updating, run `lf doctor` to verify your environment.')
  },
})

// ── Install method detection ──────────────────────────────────────────────────

type InstallMethod = 'npm-global' | 'pnpm-global' | 'yarn-global' | 'unknown'

function detectInstallMethod(): InstallMethod {
  // Check which package manager's bin directory the binary lives in
  const execPath = process.execPath // node binary path
  const argv0 = process.argv[1] ?? '' // path to the lf script

  if (argv0.includes('/.pnpm/') || argv0.includes('/pnpm/global/')) return 'pnpm-global'
  if (argv0.includes('/yarn/bin/') || argv0.includes('/.yarn/')) return 'yarn-global'
  if (argv0.includes('/npm/') || execPath.includes('/npm/')) return 'npm-global'

  // Check environment — npm sets npm_config_user_agent
  const ua = process.env['npm_config_user_agent'] ?? ''
  if (ua.startsWith('pnpm/')) return 'pnpm-global'
  if (ua.startsWith('yarn/')) return 'yarn-global'
  if (ua.startsWith('npm/')) return 'npm-global'

  return 'unknown'
}
