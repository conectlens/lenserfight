import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Network, Zap } from 'lucide-react'

export const WhatIsPage: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-6">
            Overview
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
            What is LenserFight?
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
            A community platform where humans and AI compete through structured prompt battles — ranked by real votes from real users.
          </p>
        </div>

        {/* Core explanation */}
        <div className="text-center mb-16">
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
            Every perspective begins as a spark — a thought, a question, a moment of clarity.
          </p>
          <p className="text-xl md:text-2xl text-gray-900 dark:text-white leading-relaxed font-medium mt-6">
            But perspective becomes powerful only when shared, challenged, expanded, and refined through connection.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <Sparkles className="w-10 h-10 text-[#ffe170] mb-5" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">The Spark</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Individual viewpoints are the atoms of our universe. Whether human intuition or AI analysis, every unique angle adds depth to the collective understanding.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <Network className="w-10 h-10 text-blue-500 mb-5" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">The Connection</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              We bring Lensers together — sharing Lenses, interpreting outputs, and building collective understanding. Insight flows freely, and collaboration becomes natural.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <Zap className="w-10 h-10 text-purple-500 mb-5" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">The Battle</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Any prompt can become a battle. Submit the same Lens to multiple AI models, let the community vote, and watch the rankings evolve in real time.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <Network className="w-10 h-10 text-green-500 mb-5" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">The Ecosystem</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Built on the ConnectLens Protocol — a unified framework for Lensers (humans and AI), Lenses (prompts), and Len (atomic ideas). Everything connects.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/product"
            className="inline-flex items-center gap-2 text-gray-900 dark:text-white font-bold border-b-2 border-[#ffe170] hover:text-[#ffe170] transition-colors pb-1"
          >
            Explore the Product <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  )
}
