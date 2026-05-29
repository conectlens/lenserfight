import { defineCommand } from 'citty'
import consola from 'consola'
import { A, c, sym } from '../utils/ansi'
import { printJson } from '../utils/output'

interface Example {
  category: string
  title: string
  commands: string[]
  description: string
}

const EXAMPLES: Example[] = [
  // ── Getting Started ─────────────────────────────────────────────────────────
  {
    category: 'getting-started',
    title: 'Initialize a local project',
    commands: ['lf init --mode local', 'lf db dev', 'lf doctor'],
    description: 'Set up .lenserfight.json, start Supabase, and verify the environment.',
  },
  {
    category: 'getting-started',
    title: 'Authenticate and check status',
    commands: ['lf auth login', 'lf auth whoami', 'lf status'],
    description: 'Sign in via browser, confirm identity, and view system health.',
  },

  // ── Lenses ──────────────────────────────────────────────────────────────────
  {
    category: 'lenses',
    title: 'Create and publish a lens',
    commands: [
      'lf lens create --name "Code Review" --description "Evaluate code quality"',
      'lf lens version create --lens <id>',
      'lf lens version publish --lens <id> --version <vid>',
    ],
    description: 'Define a lens, draft a version, and publish it for use in battles.',
  },

  // ── Battles ─────────────────────────────────────────────────────────────────
  {
    category: 'battles',
    title: 'Create and run a local battle',
    commands: [
      'lf battle local init --title "GPT vs Claude"',
      'lf battle local add-contender --slot A --provider openai --model gpt-4o',
      'lf battle local add-contender --slot B --provider anthropic --model claude-sonnet-4-6',
      'lf battle local run',
    ],
    description: 'Run a battle entirely offline using BYOK keys. No auth required.',
  },
  {
    category: 'battles',
    title: 'Join and vote on a cloud battle',
    commands: [
      'lf battle list --status open',
      'lf battle join <battle-id> --lenser <lenser-id>',
      'lf battle vote <battle-id> --winner A',
    ],
    description: 'Discover open battles, enter your lenser, and cast a vote.',
  },

  // ── Workflows ───────────────────────────────────────────────────────────────
  {
    category: 'workflows',
    title: 'Simulate a workflow locally',
    commands: [
      'lf workflow run ./WORKFLOW.md --inputs \'{"topic": "AI Safety"}\'',
    ],
    description: 'Parse a WORKFLOW.md and simulate the execution graph without calling APIs.',
  },

  // ── Teams ───────────────────────────────────────────────────────────────────
  {
    category: 'teams',
    title: 'Create a team and dispatch',
    commands: [
      'lf team create --name "Research Squad"',
      'lf team add-member --team <id> --lenser <lenser-id>',
      'lf team dispatch --team <id> --prompt "Analyze recent papers"',
    ],
    description: 'Assemble an agent team and trigger a collaborative run.',
  },

  // ── Diagnostics ─────────────────────────────────────────────────────────────
  {
    category: 'diagnostics',
    title: 'Full environment check',
    commands: [
      'lf doctor',
      'lf doctor --check ollama',
      'lf doctor --check byok',
      'lf gateway doctor',
    ],
    description: 'Verify Node, Docker, Supabase, Ollama, BYOK keys, and gateway health.',
  },

  // ── Automation ──────────────────────────────────────────────────────────────
  {
    category: 'automation',
    title: 'Schedule a recurring battle',
    commands: [
      'lf schedule create --workflow <id> --cron "0 9 * * MON"',
      'lf schedule list',
      'lf schedule health',
    ],
    description: 'Run battles on a weekly schedule with health monitoring.',
  },
]

const CATEGORIES = [...new Set(EXAMPLES.map((e) => e.category))]

export default defineCommand({
  meta: {
    name: 'examples',
    description: 'Show common CLI usage examples grouped by category.',
  },
  args: {
    category: {
      type: 'string',
      description: `Filter by category: ${CATEGORIES.join(', ')}`,
    },
    json: {
      type: 'boolean',
      description: 'Output examples as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const filtered = args.category
      ? EXAMPLES.filter((e) => e.category === args.category)
      : EXAMPLES

    if (filtered.length === 0) {
      consola.warn('No examples found for category: %s', args.category)
      consola.info('Available categories: %s', CATEGORIES.join(', '))
      return
    }

    if (args.json) {
      printJson(filtered)
      return
    }

    console.log(`\n${c.bold(`${sym.fight} LenserFight CLI Examples`)}\n`)

    let lastCategory = ''
    for (const example of filtered) {
      if (example.category !== lastCategory) {
        lastCategory = example.category
        console.log(`${A.brightCyan}${A.bold}── ${lastCategory} ──${A.reset}\n`)
      }

      console.log(`  ${c.bold(example.title)}`)
      console.log(`  ${c.muted(example.description)}`)
      for (const cmd of example.commands) {
        console.log(`    ${A.green}$ ${cmd}${A.reset}`)
      }
      console.log('')
    }

    console.log(`${c.muted(`Run \`lf examples --category <name>\` to filter. Categories: ${CATEGORIES.join(', ')}`)}\n`)
  },
})
