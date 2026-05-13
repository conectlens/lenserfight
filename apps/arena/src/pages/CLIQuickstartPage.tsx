import { Badge, Button, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Terminal,
  Zap,
  Key,
  Sword,
  Search,
} from 'lucide-react'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const STEPS = [
  {
    title: 'Installation',
    description: 'Install the LenserFight CLI globally on your machine using your preferred package manager.',
    icon: Terminal,
    command: 'npm install -g @lenserfight/cli',
  },
  {
    title: 'Authentication',
    description: 'Authenticate your terminal with your LenserFight account to access your lenses and data.',
    icon: Key,
    command: 'lenserfight login',
  },
  {
    title: 'Verify Setup',
    description: 'Check if the CLI is correctly installed and connected to the arena.',
    icon: Search,
    command: 'lenserfight whoami',
  },
  {
    title: 'Start a Battle',
    description: 'Trigger your first model battle directly from the command line.',
    icon: Sword,
    command: 'lenserfight battle create --lens identity',
  },
]

export const CLIQuickstartPage: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text min-h-screen pb-20">
      {/* Background decoration */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.1),_transparent_50%)]" />

      <section className="mx-auto max-w-4xl px-4 pt-16 pb-24 sm:px-6 lg:px-8 lg:pt-24">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {/* Header */}
          <div className="space-y-6">
            <Link 
              to="/product/cli" 
              className="inline-flex items-center gap-2 text-sm font-bold text-greyscale-500 transition-colors hover:text-primary-yellow-600 dark:hover:text-primary-yellow-400"
            >
              <ArrowLeft size={14} />
              Back to CLI Overview
            </Link>
            
            <div className="space-y-4">
              <motion.div variants={fadeUp}>
                <Badge color="yellow" variant="solid">Quickstart</Badge>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl">
                Get up and running in <span className="text-primary-yellow-500 italic">seconds.</span>
              </motion.h1 >
              <motion.p variants={fadeUp} className="max-w-2xl text-lg text-greyscale-600 dark:text-greyscale-300">
                Follow these four simple steps to integrate LenserFight into your local development workflow and CI/CD pipelines.
              </motion.p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {STEPS.map((step, index) => (
              <motion.div key={step.title} variants={fadeUp}>
                <Card className="relative overflow-hidden border-greyscale-200/50 dark:border-greyscale-800/50 hover:border-primary-yellow-500/30 transition-colors">
                  <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center">
                    {/* Number and Icon */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-yellow-500/10 text-primary-yellow-600 dark:text-primary-yellow-400">
                      <step.icon size={28} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                         <span className="font-mono text-xs font-black text-primary-yellow-500/60 uppercase tracking-widest">Step 0{index + 1}</span>
                         <h3 className="text-xl font-bold text-greyscale-900 dark:text-greyscale-0">{step.title}</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-greyscale-500 dark:text-greyscale-300">
                        {step.description}
                      </p>
                    </div>

                    {/* Command Box */}
                    <div className="relative w-full md:w-auto md:min-w-[320px]">
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-greyscale-950 px-4 py-3.5 font-mono text-sm text-greyscale-100">
                        <span className="truncate">$ {step.command}</span>
                        <button
                          onClick={() => copyToClipboard(step.command, index)}
                          className="shrink-0 text-greyscale-500 transition-colors hover:text-primary-yellow-500"
                          title="Copy command"
                        >
                          {copiedIndex === index ? (
                            <CheckCircle size={16} className="text-status-green" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Call to action */}
          <motion.div variants={fadeUp} className="rounded-3xl bg-primary-yellow-500 p-8 text-center sm:p-12">
             <div className="mx-auto max-w-xl space-y-6">
                <Zap size={48} className="mx-auto text-black/20" />
                <h2 className="text-3xl font-black text-black">Ready for more?</h2>
                <p className="text-lg font-medium text-black/70">
                  Dive into the full documentation to explore advanced commands, CI/CD integrations, and the LenserFight API.
                </p>
                <div className="flex justify-center gap-4">
                  <a
                    href={`${DOCS_BASE_URL}/reference/cli/overview?utm_source=lenserfight&utm_medium=arena_cli_quickstart&utm_campaign=cli_api_ref`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      className="border-black text-black hover:bg-black hover:text-white"
                      size="lg"
                    >
                      View API Reference
                    </Button>
                  </a>
                </div>
             </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}

export default CLIQuickstartPage
