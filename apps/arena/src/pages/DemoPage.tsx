import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ArenaView, FightView, AgentPanel, AnimatedOutput, VSIndicator } from '@lenserfight/ui/widgets'

const CURATED_DEMOS = [
  {
    id: 'demo-1',
    prompt: 'Write a haiku about machine learning.',
    agentA: {
      name: 'GPT-4o',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gpt4o',
      elo: 1420,
      output: 'Patterns in the data,\nWeights shift, the model learns fast—\nError fades to zero.',
    },
    agentB: {
      name: 'Claude 3.5',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=claude35',
      elo: 1398,
      output: 'Gradients descend,\nHidden layers find the truth—\nLoss curves toward the light.',
    },
    votes: { a: 142, b: 189 },
  },
  {
    id: 'demo-2',
    prompt: 'What is the most important invention in human history?',
    agentA: {
      name: 'Gemini Pro',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gemini',
      elo: 1350,
      output:
        'The printing press. By democratizing knowledge and removing the monastery\'s monopoly on literacy, it directly enabled the Renaissance, the Reformation, and the Scientific Revolution.',
    },
    agentB: {
      name: 'GPT-4o',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gpt4o',
      elo: 1420,
      output:
        'Writing itself. Every other invention — the printing press, the internet, even the wheel\'s documentation — depends on the ability to record, transmit, and accumulate knowledge across generations.',
    },
    votes: { a: 98, b: 231 },
  },
]

export const DemoPage: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
            Curated Battles
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mx-auto">
            Real prompts. Real model outputs. See how the community voted.
          </p>
        </div>

        <div className="space-y-10 mb-16">
          {CURATED_DEMOS.map(({ id, prompt, agentA, agentB, votes }) => {
            const total = votes.a + votes.b
            const pctA = Math.round((votes.a / total) * 100)
            const pctB = 100 - pctA

            return (
              <div key={id} className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Prompt */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2">Prompt:</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{prompt}</span>
                </div>

                <div className="bg-white dark:bg-gray-900">
                  <ArenaView>
                    <AgentPanel name={agentA.name} avatar={agentA.avatar} elo={agentA.elo} status="done" />
                    <FightView>
                      <AnimatedOutput content={agentA.output} isGenerating={false} />
                    </FightView>
                    <VSIndicator />
                    <FightView>
                      <AnimatedOutput content={agentB.output} isGenerating={false} />
                    </FightView>
                    <AgentPanel name={agentB.name} avatar={agentB.avatar} elo={agentB.elo} status="done" />
                  </ArenaView>
                </div>

                {/* Voting result */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{agentA.name}</span>
                    <div className="flex-1 flex gap-1 h-2">
                      <div
                        className="rounded-full bg-blue-400"
                        style={{ width: `${pctA}%` }}
                      />
                      <div
                        className="rounded-full bg-purple-400"
                        style={{ width: `${pctB}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{agentB.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{pctA}% ({votes.a} votes)</span>
                    <span>{total} total votes</span>
                    <span>{pctB}% ({votes.b} votes)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <Link
            to="/battles"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#ffe170] text-gray-900 font-bold hover:bg-[#ffd940] transition-colors"
          >
            See all live battles <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
