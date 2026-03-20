import { walletService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { WalletProduct } from '@lenserfight/types'
import { Zap, Shield, Sparkles, ShoppingCart, AlertCircle } from 'lucide-react'
import React from 'react'
import { useQuery } from '@tanstack/react-query'

import { SEOHead } from '@lenserfight/ui/components'

const CreditPackCard: React.FC<{ product: WalletProduct }> = ({ product }) => (
  <div className="flex flex-col rounded-xl p-5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50 transition-all">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{product.name}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{product.description}</p>
      </div>
      <span className="text-lg font-extrabold text-gray-900 dark:text-white ml-3 flex-shrink-0">
        {product.price_formatted}
      </span>
    </div>
    <button
      className="mt-auto w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-yellow-300 text-gray-900 transition-colors"
      onClick={() => {
        // Checkout flow: navigate to checkout or open modal in future
        window.location.href = `/store/checkout?product=${product.id}`
      }}
    >
      <ShoppingCart size={13} />
      Buy
    </button>
  </div>
)

const CreditPackSkeleton: React.FC = () => (
  <div className="animate-pulse rounded-xl p-5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4" />
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
  </div>
)

export const StorePage: React.FC = () => {
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.wallet.products,
    queryFn: walletService.getProducts,
    staleTime: 1000 * 60 * 10,
  })

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <SEOHead type="default" overrideTitle="Plans & Pricing — LenserFight" />

      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
          Choose your plan
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Start for free. Upgrade when you need more power. No hidden fees.
        </p>
      </div>

      <div className="mb-16 text-center">
        <span className="inline-block text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full mb-4">
          1 cr = $0.0001 · one-time purchase
        </span>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Top up your wallet to run prompts on any model without bringing your own API key.
        </p>
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CreditPackSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="text-sm">No products are available at this time. Please check back later.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <CreditPackCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
