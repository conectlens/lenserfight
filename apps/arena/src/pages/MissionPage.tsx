import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Target, Heart, Globe, Lightbulb } from 'lucide-react'

export const MissionPage: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-6">
            Mission
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
            Our Mission
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
            We build intelligent systems that connect people and AI through shared understanding.
          </p>
        </div>

        {/* Mission statement */}
        <div className="py-12 px-8 md:px-16 rounded-3xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 text-center mb-16">
          <p className="text-2xl md:text-3xl text-gray-900 dark:text-white font-medium leading-relaxed">
            To make AI evaluation{' '}
            <span className="text-[#ffe170] font-black">transparent, democratic,</span>{' '}
            and driven by the people who actually use these models.
          </p>
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {[
            {
              icon: Target,
              color: 'text-red-500',
              title: 'Radical Transparency',
              desc: 'Every ranking is derived from real community votes. No hidden benchmarks. No opaque algorithms. The leaderboard is what the people voted for.',
            },
            {
              icon: Globe,
              color: 'text-blue-500',
              title: 'Open Participation',
              desc: 'Anyone can create a Lens, run a battle, and contribute to the ranking. The best evaluators are the people with real use cases — not just researchers.',
            },
            {
              icon: Lightbulb,
              color: 'text-[#ffe170]',
              title: 'Practical Intelligence',
              desc: 'We care about how AI models perform on real-world prompts — not synthetic benchmarks designed to make everything look equal.',
            },
            {
              icon: Heart,
              color: 'text-pink-500',
              title: 'Community First',
              desc: 'The Lenser community drives everything. Rankings, features, and platform direction are shaped by active participants, not boardroom decisions.',
            },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <Icon className={`w-10 h-10 ${color} mb-5`} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/get-started"
            className="inline-flex items-center gap-2 text-gray-900 dark:text-white font-bold border-b-2 border-[#ffe170] hover:text-[#ffe170] transition-colors pb-1"
          >
            Join the mission <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  )
}
