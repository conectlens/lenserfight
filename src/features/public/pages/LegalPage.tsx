import { Shield, ArrowRight, Scale } from 'lucide-react'
import React from 'react'
import { useLocation, Link } from 'react-router-dom'

import { PublicPageTabs } from '../components/PublicPageTabs'

const PolicyText = ({ children }: { children?: React.ReactNode }) => (
  <div className="prose prose-lg text-gray-600 dark:text-gray-300 max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-strong:text-gray-900 dark:prose-strong:text-white">
    {children}
  </div>
)

export const LegalPage: React.FC = () => {
  const location = useLocation()
  const path = location.pathname
  const isPrivacy = path.includes('/privacy')
  const isTerms = path.includes('/terms')
  const isIndex = !isPrivacy && !isTerms

  const tabs = [
    { label: 'Overview', path: '/legal' },
    { label: 'Terms of Service', path: '/legal/terms' },
    { label: 'Privacy Policy', path: '/legal/privacy' },
  ]

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <PublicPageTabs tabs={tabs} />

      <div className="max-w-5xl mx-auto px-6 py-16">
        {isIndex && (
          <div>
            <div className="mb-16">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-6">
                Legal Center
              </h1>
              <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl">
                Transparency is core to the LenserFight ecosystem. Review our policies regarding
                content ownership, user conduct, and data protection.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Link
                to="/legal/terms"
                className="group p-10 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all bg-gray-50/50 dark:bg-gray-800/50"
              >
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center mb-6 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm group-hover:bg-primary group-hover:border-primary transition-colors">
                  <Scale size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  Terms of Service{' '}
                  <ArrowRight
                    size={18}
                    className="opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0"
                  />
                </h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  The rules governing your use of LenserFight, including intellectual property
                  rights, user conduct, and account termination.
                </p>
              </Link>
              <Link
                to="/legal/privacy"
                className="group p-10 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all bg-gray-50/50 dark:bg-gray-800/50"
              >
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center mb-6 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm group-hover:bg-primary group-hover:border-primary transition-colors">
                  <Shield size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  Privacy Policy{' '}
                  <ArrowRight
                    size={18}
                    className="opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0"
                  />
                </h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  How we collect, store, and protect your data. Information on cookies, third-party
                  sharing, and your rights as a Lenser.
                </p>
              </Link>
            </div>
          </div>
        )}

        {isTerms && (
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Terms of Service
            </h1>
            <PolicyText>
              <h3>1. Ecosystem Participation</h3>
              <p>
                By accessing LenserFight, you agree to participate in the ecosystem according to the
                protocols defined by ConnectLens. You acknowledge that "Lenser" and "Lens" are
                defined terms within this jurisdiction.
              </p>

              <h3>2. Intellectual Property & Content</h3>
              <p>
                You retain ownership of the specific prompts ("Idea-Seeds") you create. However, by
                posting to public threads or the Lens Cloud, you grant LenserFight a non-exclusive,
                worldwide, royalty-free license to display, analyze, and benchmark this content
                against AI models.
              </p>

              <h3>3. Lenser Conduct</h3>
              <p>
                Harassment, manipulation of ranking systems, and the generation of illegal content
                are strictly prohibited. The platform reserves the right to terminate the identity
                of any Lenser violating these standards.
              </p>

              <h3>4. Liability</h3>
              <p>
                LenserFight provides access to third-party AI models ("System Lenses"). We are not
                responsible for the outputs generated by external systems.
              </p>
            </PolicyText>
          </div>
        )}

        {isPrivacy && (
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Privacy Policy
            </h1>
            <PolicyText>
              <h3>1. Data Collection</h3>
              <p>
                We collect information necessary to establish your Lenser Identity, including
                authentication details, profile metadata, and interaction history within the arena.
              </p>

              <h3>2. Usage Data & Benchmarking</h3>
              <p>
                Interaction data (prompts, edits, and results) is analyzed to improve the "Lenser"
                algorithm and provide better ecosystem recommendations. This data may be aggregated
                to publish industry reports on model performance.
              </p>

              <h3>3. Third-Party Models</h3>
              <p>
                When you execute a prompt against an AI model via our interface, your input is
                transmitted to the respective model provider (e.g., OpenAI, Google, Anthropic).
                Their privacy policies apply to the processing of that specific request.
              </p>

              <h3>4. Security</h3>
              <p>
                We employ industry-standard encryption to protect your account credentials and
                private prompt library.
              </p>
            </PolicyText>
          </div>
        )}
      </div>
    </div>
  )
}
