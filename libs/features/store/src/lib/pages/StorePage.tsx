import { Check, Zap, Shield, Sparkles } from 'lucide-react'
import React from 'react'

import { SEOHead } from '@lenserfight/ui/components'

interface Plan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
  badge?: string
  buyUrl?: string
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started with prompt sharing.',
    features: [
      'Unlimited public prompts',
      'Community battles',
      'Basic analytics',
      'BYOK execution (bring your own API key)',
    ],
    cta: 'Get Started',
    buyUrl: '/auth/register',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    period: 'per month',
    description: 'For serious prompt engineers who need more power.',
    features: [
      'Everything in Free',
      'Private prompts',
      'Priority execution queue',
      'Advanced analytics',
      'Prompt versioning history',
      'Export & API access',
    ],
    cta: 'Coming Soon',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$29',
    period: 'per month',
    description: 'Collaborate with your team on prompts and workflows.',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared prompt libraries',
      'Team analytics dashboard',
      'Custom branding',
      'Priority support',
    ],
    cta: 'Coming Soon',
  },
]

const PlanCard: React.FC<{ plan: Plan }> = ({ plan }) => {
  const isComingSoon = plan.cta === 'Coming Soon'

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 border transition-all ${
        plan.highlighted
          ? 'border-primary bg-white dark:bg-gray-800 shadow-xl shadow-yellow-100/40 dark:shadow-yellow-900/10 scale-[1.02]'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow">
            {plan.badge}
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{plan.price}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/{plan.period}</span>
      </div>

      <ul className="space-y-2.5 mb-8 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
            <Check size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
            {feature}
          </li>
        ))}
      </ul>

      {isComingSoon ? (
        <button
          disabled
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
        >
          Coming Soon
        </button>
      ) : (
        <a
          href={plan.buyUrl}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors block ${
            plan.highlighted
              ? 'bg-primary hover:bg-yellow-300 text-gray-900'
              : 'bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900'
          }`}
        >
          {plan.cta}
        </a>
      )}
    </div>
  )
}

export const StorePage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <SEOHead type="default" overrideTitle="Plans & Pricing — LenserFight" />

      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-gray-800 dark:text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <Sparkles size={13} />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
          Choose your plan
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Start for free. Upgrade when you need more power. No hidden fees.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-16">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-4 p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
            <Zap size={18} className="text-blue-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">BYOK — Bring Your Own Key</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All plans support running prompts with your own API keys from OpenAI, Anthropic, and more. You only pay your provider directly.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 flex-shrink-0">
            <Shield size={18} className="text-green-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No lock-in</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Export all your prompts anytime. LenserFight is open-source and self-hostable — your data is always yours.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
