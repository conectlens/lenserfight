import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'
import { ArenaView, FightView, AgentPanel, AnimatedOutput, VSIndicator } from '@lenserfight/ui/widgets'
import { StarBackground } from '@lenserfight/ui/widgets'

const MOCK_FIGHT = {
  prompt: 'Explain the concept of recursion in programming, as if explaining to a 10-year-old.',
  agentA: {
    name: 'GPT-4o',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gpt4o',
    elo: 1420,
    output:
      'Imagine a set of Russian nesting dolls. When you open one, there\'s a smaller version inside — and that smaller one contains an even smaller one. Recursion is like that: a function that calls a smaller version of itself until it reaches the tiniest doll that can\'t open anymore.',
  },
  agentB: {
    name: 'Claude 3.5',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=claude35',
    elo: 1398,
    output:
      'Think of it like a set of mirrors facing each other. When you stand between them, you see yourself reflected infinitely — each reflection containing another reflection. Recursion works the same way: a function looks at a smaller version of its own problem, over and over, until the problem is small enough to answer directly.',
  },
}

export const LandHomePage: React.FC = () => {
  const [step, setStep] = useState<'idle' | 'a' | 'b' | 'done'>('idle')

  useEffect(() => {
    const t0 = setTimeout(() => setStep('a'), 800)
    const t1 = setTimeout(() => setStep('b'), 3200)
    const t2 = setTimeout(() => setStep('done'), 6000)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-gray-950 text-white">
        <StarBackground />

        <div className="relative z-10 max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ffe170]/10 border border-[#ffe170]/20 rounded-full text-xs font-bold uppercase tracking-widest text-[#ffe170] mb-8">
            <Zap size={10} />
            Live Arena — lenserfight.com
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            The AI{' '}
            <span className="text-[#ffe170]">Battle</span>{' '}
            Arena
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed mb-10 max-w-2xl mx-auto">
            Compare AI models head-to-head. Watch them generate. Vote for the best.
            Ranked by the community.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/battles"
              className="px-8 py-3.5 rounded-full bg-[#ffe170] text-gray-900 font-bold text-base hover:bg-[#ffd940] transition-colors shadow-lg shadow-[#ffe170]/20 inline-flex items-center gap-2"
            >
              Enter the Arena <ArrowRight size={16} />
            </Link>
            <Link
              to="/what-is-lenserfight"
              className="px-8 py-3.5 rounded-full border border-gray-700 text-gray-300 font-semibold text-base hover:border-gray-500 hover:text-white transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Live Arena Preview */}
        <div className="relative z-10 w-full max-w-5xl mx-auto">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-400 font-mono">LIVE DEMO — Battle in progress</span>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur overflow-hidden shadow-2xl">
            {/* Prompt bar */}
            <div className="border-b border-gray-800 px-4 py-3 text-sm text-gray-400 font-mono bg-gray-900/40">
              <span className="text-[#ffe170]">prompt:</span>{' '}
              <span className="text-gray-300">{MOCK_FIGHT.prompt}</span>
            </div>

            <ArenaView>
              <AgentPanel
                name={MOCK_FIGHT.agentA.name}
                avatar={MOCK_FIGHT.agentA.avatar}
                elo={MOCK_FIGHT.agentA.elo}
                status={step === 'a' ? 'generating' : step === 'idle' ? 'idle' : 'done'}
              />
              <FightView>
                {(step === 'a' || step === 'b' || step === 'done') && (
                  <AnimatedOutput
                    content={MOCK_FIGHT.agentA.output}
                    isGenerating={step === 'a'}
                  />
                )}
              </FightView>

              <VSIndicator />

              <FightView>
                {(step === 'b' || step === 'done') && (
                  <AnimatedOutput
                    content={MOCK_FIGHT.agentB.output}
                    isGenerating={step === 'b'}
                  />
                )}
              </FightView>
              <AgentPanel
                name={MOCK_FIGHT.agentB.name}
                avatar={MOCK_FIGHT.agentB.avatar}
                elo={MOCK_FIGHT.agentB.elo}
                status={step === 'b' ? 'generating' : step === 'done' ? 'done' : 'idle'}
              />
            </ArenaView>

            {step === 'done' && (
              <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between bg-gray-900/60">
                <span className="text-sm text-gray-400">Who gave the better explanation?</span>
                <div className="flex gap-3">
                  <button className="px-4 py-1.5 text-sm font-semibold rounded-full border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
                    GPT-4o
                  </button>
                  <button className="px-4 py-1.5 text-sm font-semibold rounded-full bg-[#ffe170]/10 border border-[#ffe170]/30 text-[#ffe170] hover:bg-[#ffe170]/20 transition-colors">
                    Claude 3.5
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-600 mt-3">
            Simulated preview — real battles use live model outputs
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="py-24 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
            Built for serious AI evaluation
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Beyond benchmarks. Real prompts. Real outputs. Community ranking.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '⚔️',
              title: 'Head-to-Head Battles',
              desc: 'Submit the same prompt to multiple models and compare outputs side by side.',
            },
            {
              icon: '🏆',
              title: 'Community Ranking',
              desc: 'Votes from real users create an ELO-based ranking you can actually trust.',
            },
            {
              icon: '🔬',
              title: 'Lens Library',
              desc: 'Build and share reusable prompts (Lenses) that others can battle with.',
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"
            >
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/battles"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-base hover:opacity-90 transition-opacity"
          >
            Start Battling <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
