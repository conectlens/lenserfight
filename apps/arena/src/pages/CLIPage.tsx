import { Badge, Button, Card } from '@lenserfight/ui/components'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ExternalLink,
  Layers,
  Sword,
  Terminal,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import React from 'react'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const fadeLeft = {
  hidden: { opacity: 0, x: -28 },
  visible: { opacity: 1, x: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const FEATURES = [
  {
    icon: Sword,
    title: 'Run battles from your terminal',
    description:
      'Trigger, watch, and resolve battles without leaving your workflow. Pipe output directly into scripts.',
  },
  {
    icon: Layers,
    title: 'Manage lenses & executions',
    description:
      'Create versioned lenses, submit executions, and query results — all via a composable CLI API.',
  },
  {
    icon: Zap,
    title: 'CI/CD friendly',
    description:
      'Integrate LenserFight into your evaluation pipelines. Ideal for automated model regression tracking.',
  },
]

const QUICK_COMMANDS = [
  { cmd: 'lenserfight battle create --lens <id>', desc: 'Start a new battle against a lens' },
  { cmd: 'lenserfight execution run --model gpt-4o', desc: 'Submit a model execution' },
  { cmd: 'lenserfight battle status <slug>', desc: 'Poll a battle result' },
  { cmd: 'lenserfight lens list --trending', desc: 'Browse trending lenses' },
]

export const CLIPage: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.16),_transparent_50%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.12),_transparent_48%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-24">
        <motion.div
          className="grid gap-12 lg:grid-cols-2 lg:items-start"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div className="space-y-6">
            <motion.div variants={fadeUp}>
              <Badge color="yellow" variant="outline">CLI</Badge>
            </motion.div>
            <motion.div variants={fadeUp} className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                <Terminal size={32} />
              </div>
              <h1 className="text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl">
                LenserFight{' '}
                <span className="text-greyscale-400 dark:text-greyscale-300">CLI</span>
              </h1>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="max-w-xl text-xl leading-9 text-greyscale-600 dark:text-greyscale-300"
            >
              Control battles, manage lenses, and plug the arena into your pipelines — from the
              terminal.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <a
                href={`${DOCS_BASE_URL}/tutorials/getting-started/overview?utm_source=lenserfight&utm_medium=arena_cli_page&utm_campaign=cli_docs`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary" size="lg">
                  <BookOpen size={16} />
                  Read the docs
                  <ExternalLink size={14} />
                </Button>
              </a>
              <Link to="/product/cli/quickstart">
                <Button variant="secondary" size="lg">
                  Quickstart <ArrowRight size={16} />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Terminal preview */}
          <motion.div variants={fadeUp}>
            <Card className="overflow-hidden border-0 bg-greyscale-950 dark:bg-greyscale-900 p-0">
              <div className="flex items-center gap-1.5 border-b border-greyscale-800 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-status-red/70" />
                <span className="h-3 w-3 rounded-full bg-primary-yellow-500/70" />
                <span className="h-3 w-3 rounded-full bg-status-green/70" />
                <span className="ml-3 text-xs text-greyscale-500 font-mono">lenserfight</span>
              </div>
              <div className="space-y-3 p-6 font-mono text-sm">
                {QUICK_COMMANDS.map(({ cmd, desc }) => (
                  <div key={cmd} className="space-y-0.5">
                    <div className="flex items-start gap-2">
                      <span className="text-primary-yellow-500 shrink-0">$</span>
                      <span className="text-greyscale-100">{cmd}</span>
                    </div>
                    <p className="pl-4 text-xs text-greyscale-500"># {desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">What you can do</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            The arena, scriptable.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-300">
            Every action available in the web app is exposed through the CLI — so you can automate,
            integrate, and iterate faster.
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 md:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <motion.div key={title} variants={fadeUp}>
              <Card className="h-full space-y-4 border-t-4 border-t-primary-yellow-500/40 p-6 transition-colors hover:border-t-primary-yellow-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">{title}</h3>
                <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-200">{description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* INSTALL */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <motion.div
          className="grid gap-5 md:grid-cols-2"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <motion.div variants={fadeUp}>
            <Card className="h-full space-y-4 p-8">
              <Badge color="yellow" variant="outline">Install</Badge>
              <h2 className="text-2xl font-black text-greyscale-900 dark:text-greyscale-0">
                One command to get started.
              </h2>
              <code className="block rounded-xl bg-surface-raised px-4 py-3 font-mono text-sm text-primary-yellow-700 dark:text-primary-yellow-400">
                npm install -g @lenserfight/cli
              </code>
              <ul className="space-y-2">
                {['Node.js 18+', 'Works on macOS, Linux, Windows', 'Full TypeScript support'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-greyscale-600 dark:text-greyscale-300">
                    <CheckCircle size={13} className="shrink-0 text-primary-yellow-600 dark:text-primary-yellow-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="relative h-full space-y-4 overflow-hidden bg-greyscale-900 p-8">
              <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,1),_transparent_60%)]" />
              <div className="relative space-y-4">
                <Badge color="yellow" variant="solid">Full reference</Badge>
                <h2 className="text-2xl font-black text-greyscale-0">
                  Every flag, every command.
                </h2>
                <p className="text-sm leading-7 text-greyscale-400">
                  The complete CLI reference lives in the docs — authentication, pagination,
                  output formats, and integration examples.
                </p>
                <a
                  href={`${DOCS_BASE_URL}/tutorials/getting-started/overview?utm_source=lenserfight&utm_medium=arena_cli_page&utm_campaign=cli_full_docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="primary" size="lg">
                    Open docs <ExternalLink size={14} />
                  </Button>
                </a>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
