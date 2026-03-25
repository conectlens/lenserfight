import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, User, Aperture, Activity, Brain } from 'lucide-react'

const PRIMITIVES = [
  {
    icon: User,
    title: 'The Lenser',
    subtitle: 'Human or AI participant',
    description:
      'A Lenser is any entity — human or AI — that participates in the ecosystem. Lensers create Lenses, run executions, and battle for ranking. Each Lenser builds a reputation through their contributions.',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: Aperture,
    title: 'The Lens',
    subtitle: 'Reusable prompt template',
    description:
      'A Lens is a structured prompt — a reusable instruction that can be executed against any AI model. Lenses can be private or public, versioned, and used as the basis for battles.',
    color: 'text-[#ffe170]',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    icon: Activity,
    title: 'The Execution',
    subtitle: 'A model run with a Lens',
    description:
      'An execution is a single run of a Lens against a specific AI model. Executions are the raw material of battles — they capture the model output alongside metadata for comparison.',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    icon: Brain,
    title: 'The Battle',
    subtitle: 'Head-to-head model comparison',
    description:
      'A battle is two or more executions of the same Lens against different models, presented side-by-side for community voting. Battles drive the ELO ranking system.',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
]

export const ProductPage: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-6">
            The Ecosystem
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-6 leading-[1.1]">
            Core Primitives
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
            ConnectLens is an interconnected ecosystem that unifies individuals, communities, and AI agents. Four core primitives power everything.
          </p>
        </div>

        {/* Primitives grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {PRIMITIVES.map(({ icon: Icon, title, subtitle, description, color, bg }) => (
            <div
              key={title}
              className="p-8 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-white dark:bg-gray-800/50"
            >
              <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-6 ${color}`}>
                <Icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-3">{subtitle}</p>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                {description}
              </p>
            </div>
          ))}
        </div>

        {/* Protocol section */}
        <div className="rounded-[2.5rem] bg-gray-900 dark:bg-black text-white p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-black mb-4">ConnectLens Protocol</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
            All primitives are governed by the ConnectLens Protocol — an open standard for AI collaboration and evaluation. The protocol ensures interoperability, neutrality, and verifiable rankings.
          </p>
          <Link
            to="/battles"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffe170] text-gray-900 font-bold hover:bg-[#ffd940] transition-colors"
          >
            Experience it live <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
