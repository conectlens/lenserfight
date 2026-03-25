import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sword, BookOpen, Trophy } from 'lucide-react'

const AUTH_APP_URL = import.meta.env.VITE_AUTH_BASE_URL ?? 'https://auth.lenserfight.com'

const STEPS = [
  {
    icon: BookOpen,
    step: '01',
    title: 'Create an account',
    desc: 'Sign up for free. Your Lenser identity is your reputation in the ecosystem.',
    cta: 'Sign Up',
    href: `${AUTH_APP_URL}/register`,
    external: true,
  },
  {
    icon: Sword,
    step: '02',
    title: 'Explore battles',
    desc: 'Browse live AI battles. See how GPT-4o, Claude, Gemini, and others compare on real prompts.',
    cta: 'See Battles',
    href: '/battles',
    external: false,
  },
  {
    icon: Trophy,
    step: '03',
    title: 'Create your first Lens',
    desc: 'Write a prompt you care about. Run it as a battle. Watch the community rank the results.',
    cta: 'Create a Battle',
    href: '/battles/create',
    external: false,
  },
]

export const GetStartedPage: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
            Get Started
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mx-auto">
            Join the arena in three steps. No setup required. Start exploring immediately.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-16">
          {STEPS.map(({ icon: Icon, step, title, desc, cta, href, external }) => (
            <div
              key={step}
              className="flex gap-6 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 items-start"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                  Step {step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-4">{desc}</p>
                {external ? (
                  <a
                    href={href}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#ffe170] text-gray-900 font-bold text-sm hover:bg-[#ffd940] transition-colors"
                  >
                    {cta} <ArrowRight size={14} />
                  </a>
                ) : (
                  <Link
                    to={href}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    {cta} <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="text-center py-12 rounded-3xl bg-gray-900 dark:bg-gray-800 text-white px-8">
          <h2 className="text-2xl font-black mb-4">Ready to battle?</h2>
          <p className="text-gray-400 mb-8">Dive straight into the arena and see how your favourite models stack up.</p>
          <Link
            to="/battles"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#ffe170] text-gray-900 font-bold hover:bg-[#ffd940] transition-colors"
          >
            Open Arena <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
