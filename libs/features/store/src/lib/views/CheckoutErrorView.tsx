import React from 'react'
import { useNavigate } from 'react-router-dom'
import { XCircle } from 'lucide-react'
import { SEOHead } from '@lenserfight/ui/components'

/**
 * GRASP: Low Coupling + High Cohesion
 *
 * Purely presentational post-checkout failure screen. Accepts no props.
 * Has zero service dependencies — all it does is navigate back to the
 * store (stripping the ?status= param) so the user can retry cleanly.
 *
 * Reassures users they have NOT been charged, reducing support burden.
 */
export const CheckoutErrorView: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <SEOHead type="default" overrideTitle="Checkout Incomplete — LenserFight" />

      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
          <XCircle
            size={40}
            className="text-red-500 dark:text-red-400"
            strokeWidth={1.75}
          />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
          Payment not completed
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Your checkout session was cancelled or encountered an error.
        </p>

        {/* Reassurance note */}
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-xl mb-10">
          You have <span className="font-bold">not</span> been charged.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={() => navigate('/billing', { replace: true })}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-yellow-300 text-gray-900 text-sm font-semibold transition-colors"
          >
            Try again
          </button>
          <a
            href="mailto:support@lenserfight.com"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-semibold transition-colors"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  )
}
