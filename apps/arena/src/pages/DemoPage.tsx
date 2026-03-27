import { Badge, Card, DesktopFrame } from '@lenserfight/ui/components'
import { ArrowRight, BarChart3, MessageSquareText } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'


const CURATED_DEMOS = [
  {
    id: 'demo-1',
    prompt: 'Write a haiku about machine learning.',
    winner: 'Claude 3.5',
    scoreA: 142,
    scoreB: 189,
    outputA: 'Patterns in the data,\nWeights shift, the model learns fast—\nError fades to zero.',
    outputB: 'Gradients descend,\nHidden layers find the truth—\nLoss curves toward the light.',
  },
  {
    id: 'demo-2',
    prompt: 'What is the most important invention in human history?',
    winner: 'GPT-4o',
    scoreA: 98,
    scoreB: 231,
    outputA:
      "The printing press. By democratizing knowledge and removing the monastery's monopoly on literacy, it directly enabled the Renaissance, the Reformation, and the Scientific Revolution.",
    outputB:
      "Writing itself. Every other invention depends on the ability to record, transmit, and accumulate knowledge across generations.",
  },
]

export const DemoPage: React.FC = () => {
  return (
    <div className="bg-surface-base text-surface-text">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="space-y-4 text-center">
          <Badge color="yellow" variant="outline">
            Proof
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl">
            Curated battles show the product in motion.
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
            The fastest way to understand LenserFight is to see the comparison loop, the vote result, and the
            result page together.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {CURATED_DEMOS.map(({ id, prompt, winner, scoreA, scoreB, outputA, outputB }) => {
            const total = scoreA + scoreB
            const pctA = Math.round((scoreA / total) * 100)
            const pctB = 100 - pctA

            return (
              <Card key={id} className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareText size={16} className="text-[var(--cl-yellow-500)]" />
                    <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">{prompt}</p>
                  </div>
                  <Badge color="green" variant="outline">
                    Winner: {winner}
                  </Badge>
                </div>

                <DesktopFrame title="Battle preview" url={`lenserfight.com/battles/${id}`} label="Curated demo">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="space-y-3 p-5">
                        <div className="flex items-center justify-between">
                          <Badge color="yellow" variant="outline">
                            Runner A
                          </Badge>
                          <span className="text-xs text-greyscale-500">Vote share {pctA}%</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                          {outputA}
                        </p>
                      </Card>

                      <Card className="space-y-3 p-5">
                        <div className="flex items-center justify-between">
                          <Badge color="purple" variant="outline">
                            Runner B
                          </Badge>
                          <span className="text-xs text-greyscale-500">Vote share {pctB}%</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                          {outputB}
                        </p>
                      </Card>
                    </div>

                    <Card className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-greyscale-500">
                          Public vote
                        </p>
                        <p className="mt-1 text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                          {pctA}% to Runner A, {pctB}% to Runner B
                        </p>
                      </div>
                      <BarChart3 size={18} className="text-[var(--cl-yellow-500)]" />
                    </Card>
                  </div>
                </DesktopFrame>
              </Card>
            )
          })}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link
            to="/battles"
            className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
          >
            See all live battles <ArrowRight size={16} />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-status-blue hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
          >
            Learn the story
          </Link>
        </div>
      </section>
    </div>
  )
}
