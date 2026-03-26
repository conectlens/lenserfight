import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { queryKeys } from '@lenserfight/data/cache'
import { Button, SEOHead } from '@lenserfight/ui/components'
import { useWallet } from '../context/WalletContext'

/**
 * GRASP: Low Coupling + High Cohesion
 *
 * Purely presentational post-checkout success screen. Receives no props —
 * all state is sourced from the shared WalletContext (balance) and
 * React Query (cache invalidation). No direct service dependencies.
 *
 * On mount it invalidates the wallet balance cache so the displayed credit
 * count reflects the just-completed purchase.
 */
export const CheckoutSuccessView: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { balance, isLoading: balanceLoading } = useWallet()

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance })
  }, [queryClient])

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <SEOHead type="default" overrideTitle="Payment Successful — LenserFight" />

      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
          <CheckCircle2
            size={40}
            className="text-green-500 dark:text-green-400"
            strokeWidth={1.75}
          />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">
          Payment successful!
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Your credits have been added to your wallet. You can now run any
          model — no subscription required.
        </p>

        {/* Balance pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 mb-10">
          {balanceLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Updating balance…
            </>
          ) : (
            <>
              <span className="text-green-500 dark:text-green-400 font-bold">
                {balance ?? '—'}
              </span>
              credits in your wallet
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <Button
            type="button"
            onClick={() => navigate('/arena')}
            className="w-full sm:w-auto px-6"
          >
            Start using AI
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/billing', { replace: true })}
            className="w-full sm:w-auto px-6"
          >
            Buy more credits
          </Button>
        </div>
      </div>
    </div>
  )
}
