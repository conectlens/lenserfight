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
  {
    category: 'cloud',
    title: 'Cloud default — authenticate and list battles',
    commands: ['lf init', 'lf auth login', 'lf status', 'lf battle list --status open'],
    description: 'Default API mode is Cloud. No Docker required.',
  },
  {
    category: 'cloud',
    title: 'Create and publish a lens on Cloud',
    commands: [
      'lf lens create --title "Code Review" --body "$(cat prompt.md)"',
      'lf lens version publish --lens <id> --version <vid>',
    ],
    description: 'Manage lenses against the hosted Supabase API.',
  },
  {
    category: 'supabase-local',
    title: 'Supabase local stack',
    commands: ['lf use local', 'lf db dev', 'lf doctor --mode local', 'lf auth login --email you@dev.local'],
    description: 'Opt in to 127.0.0.1 Supabase. Docker required only for db/dev.',
  },
  {
    category: 'file-workspace',
    title: 'File workspace — validate and simulate',
    commands: [
      'lf validate .lenserfight/lenses/my-lens/SKILL.md',
      'lf workflow run ./SKILL.md --inputs \'{"topic": "AI Safety"}\'',
    ],
    description: 'Markdown objects on disk. No init, Docker, or cloud keys required.',
  },
  {
    category: 'file-workspace',
    title: 'File workspace battle (offline)',
    commands: [
      'lf battle file init --name "GPT vs Claude" --task "Write a haiku"',
      'lf battle file add-contender A --provider openai --model gpt-4o-mini',
      'lf battle file add-contender B --provider anthropic --model claude-haiku-4-5',
      'lf battle file run',
    ],
    description: 'BYOK file battles. Not the same as global --local (Supabase).',
  },
  {
    category: 'file-supabase-bridge',
    title: 'Sync file workspace → Supabase local',
    commands: [
      'lf import .lenserfight/',
      'lf use local',
      'lf sync plan',
      'lf sync push --all',
    ],
    description: 'Bridge markdown registry to local PostgREST when the stack is running.',
  },
  {
    category: 'diagnostics',
    title: 'Environment check',
    commands: ['lf doctor', 'lf doctor --mode local', 'lf env'],
    description: 'Cloud doctor skips Docker; Supabase checks only with --mode local.',
  },
]

const CATEGORIES = [...new Set(EXAMPLES.map((e) => e.category))]

export default defineCommand({
  meta: {
    name: 'examples',
    description: 'Show common CLI usage examples grouped by runtime backend.',
  },
  args: {
    category: {
      type: 'string',
      description: `Filter: ${CATEGORIES.join(', ')}`,
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

    console.log(
      `${c.muted(`Categories: ${CATEGORIES.join(', ')}. Global --local = Supabase local only.`)}\n`
    )
  },
})
