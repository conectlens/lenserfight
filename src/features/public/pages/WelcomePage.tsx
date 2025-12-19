import { ArrowRight, BookOpen } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { WaitingListSection } from '../../waitingList/components/WaitingListSection'
import { PublicSection } from '../components/PublicSection'

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-80px)] bg-white dark:bg-gray-900 flex flex-col transition-colors duration-200">
      <PublicSection centered className="flex-1 flex flex-col justify-center">
        <div className="mb-8 animate-in fade-in zoom-in duration-700">
          <span className="bg-primary/20 text-yellow-900 dark:text-yellow-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-primary/20">
            Identity Established
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-8 tracking-tight leading-[1.1]">
          Welcome, Lenser.
        </h1>
        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
          You have entered the premier ecosystem for AI prompt engineering. Your perspective is now
          a tool. How would you like to begin?
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full mb-20">
          <div
            onClick={() => navigate('/')}
            className="group p-8 rounded-3xl border-2 border-gray-900 dark:border-gray-700 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 transition-all cursor-pointer text-left relative overflow-hidden shadow-xl"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity text-primary transform translate-x-4 -translate-y-4">
              <ArrowRight size={48} />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-2">Enter the Arena</h3>
              <p className="text-gray-400 mb-8 text-lg">
                Skip the tour. I'm ready to create prompts and compete immediately.
              </p>
              <span className="inline-block text-white font-bold border-b border-primary pb-0.5">
                Go to Dashboard
              </span>
            </div>
          </div>

          <div
            onClick={() => navigate('/about')}
            className="group p-8 rounded-3xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer text-left relative"
          >
            <div className="absolute top-8 right-8 text-gray-300 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              <BookOpen size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Take the Tour</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
              Learn how Threads, the Lens Cloud, and Lenser Profiles work.
            </p>
            <span className="inline-block text-gray-900 dark:text-white font-bold border-b border-gray-300 dark:border-gray-600 pb-0.5 group-hover:border-gray-900 dark:group-hover:border-white transition-colors">
              Start Guide
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full">
          <WaitingListSection />
        </div>
      </PublicSection>
    </div>
  )
}
