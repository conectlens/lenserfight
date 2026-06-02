import { defineCommand } from 'citty'
import consola from 'consola'
import { spawnSync } from 'node:child_process'
import { c, sym } from '../utils/ansi'

const DOCS_BASE_URL = 'https://docs.lenserfight.com/en'

// Topic shortcuts → doc paths
const TOPIC_MAP: Record<string, string> = {
  // CLI
  cli: '/reference/cli/index',
  doctor: '/reference/cli/doctor',
  init: '/reference/cli/index#lf-init',
  status: '/reference/cli/status',
  examples: '/reference/cli/examples',
  env: '/reference/cli/env',
  workflow: '/reference/cli/workflow',
  battle: '/reference/cli/battle',
  gateway: '/reference/cli/gateway',
  lenser: '/reference/cli/lenser',
  lens: '/reference/cli/lens',
  spec: '/reference/cli/spec',
  completion: '/reference/cli/completion',
  update: '/reference/cli/update',

  // Getting started
  'getting-started': '/tutorials/getting-started/quickstart',
  install: '/tutorials/getting-started/installation',
  auth: '/tutorials/local/authentication',
  quickstart: '/tutorials/getting-started/quickstart',

  // Guides
  local: '/reference/database/local-setup',
  ollama: '/tutorials/integrations/ollama',
  byok: '/how-to/battles/byok-execution',
  troubleshoot: '/tutorials/troubleshooting/build-failures',
}

function openUrl(url: string): void {
  const [cmd, ...args] =
    process.platform === 'darwin'  ? ['open', url] :
    process.platform === 'win32'   ? ['cmd', '/c', 'start', '', url] :
                                     ['xdg-open', url]
  const { error } = spawnSync(cmd, args, { stdio: 'ignore' })
  if (error) consola.info('Open manually: %s', url)
}

const open = defineCommand({
  meta: {
    name: 'open',
    description: 'Open LenserFight documentation in the browser.',
  },
  args: {
    topic: {
      type: 'positional',
      description: `Topic shortcut: ${Object.keys(TOPIC_MAP).slice(0, 6).join(', ')}… or a doc path`,
      required: false,
    },
  },
  async run({ args }) {
    const raw = args.topic as string | undefined
    const path = raw
      ? (TOPIC_MAP[raw.toLowerCase()] ?? (raw.startsWith('/') ? raw : `/${raw}`))
      : '/reference/cli/index'

    const url = `${DOCS_BASE_URL}${path}`

    consola.info('Opening docs: %s', url)
    openUrl(url)
  },
})

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List available documentation topic shortcuts.',
  },
  async run() {
    console.log(`\n${c.bold(`${sym.info} LenserFight Docs Topics`)}\n`)
    const entries = Object.entries(TOPIC_MAP)
    const maxKey = Math.max(...entries.map(([k]) => k.length))
    for (const [key, path] of entries) {
      console.log(`  ${c.accent(key.padEnd(maxKey + 2))} ${c.muted(`${DOCS_BASE_URL}${path}`)}`)
    }
    console.log('')
    console.log(`${c.muted('Usage: lf docs open <topic>   — e.g. lf docs open workflow')}\n`)
  },
})

export default defineCommand({
  meta: {
    name: 'docs',
    description: 'Open or list LenserFight documentation.',
  },
  subCommands: {
    open,
    list,
  },
})
