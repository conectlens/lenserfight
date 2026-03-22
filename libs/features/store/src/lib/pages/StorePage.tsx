import { walletService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { WalletProduct } from '@lenserfight/types'
import { AlertCircle, Loader2, XCircle } from 'lucide-react'
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@lenserfight/features/auth'
import { SEOHead } from '@lenserfight/ui/components'
import { useCheckoutStatus } from '../hooks/useCheckoutStatus'
import { CheckoutSuccessView } from '../views/CheckoutSuccessView'
import { CheckoutErrorView } from '../views/CheckoutErrorView'

function safeRenderHtml(html: string): string {
  return html
    .replace(/<(?!\/?(?:p|strong|em|br)\b)[^>]+>/gi, '')
    .trim()
}

const POPULAR_INDEX = 1

const CreditPackCard: React.FC<{
  product: WalletProduct
  index: number
  onBuy: (product: WalletProduct) => Promise<void>
  buying: boolean
}> = ({ product, index, onBuy, buying }) => {
  const isPopular = index === POPULAR_INDEX
  const safeDescription = safeRenderHtml(product.description)

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 border transition-all ${isPopular
        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-gray-900 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-widest text-center">
          Most popular
        </span>
      )}

      <div
        className="text-sm text-gray-500 dark:text-gray-400 mb-4 [&>p]:m-0"
        dangerouslySetInnerHTML={{ __html: safeDescription }}
      />

      <div className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
        {product.price_formatted}
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500 mb-8">
        one-time · no subscription
      </div>

      <button
        disabled={buying}
        className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isPopular
          ? 'bg-primary hover:bg-yellow-300 text-gray-900'
          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={() => onBuy(product)}
      >
        {buying && <Loader2 size={14} className="animate-spin" />}
        {buying ? 'Redirecting…' : 'Buy now'}
      </button>
    </div>
  )
}

const CreditPackSkeleton: React.FC = () => (
  <div className="animate-pulse rounded-2xl p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8" />
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
  </div>
)

/**
 * GRASP: High Cohesion — isolates all product-fetching and buying hooks so
 * StorePage (the Creator/dispatcher) can call useCheckoutStatus() without
 * violating Rules of Hooks through conditional hook calls.
 */
const StoreProductsView: React.FC = () => {
  const { user, redirectToLogin } = useAuth()
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.wallet.products,
    queryFn: walletService.getProducts,
    staleTime: 1000 * 60 * 10,
  })

  const handleBuy = async (product: WalletProduct) => {
    setCheckoutError(null)
    setBuyingId(product.id)
    try {
      const checkout = await walletService.checkout({
        variantId: product.variantId,
        ...(user?.email ? { email: user.email } : {}),
      })
      const checkoutUrl = checkout.checkoutUrl || checkout.checkout_url
      if (!checkoutUrl) {
        throw new Error('Checkout failed: missing checkout URL.')
      }

      window.location.assign(checkoutUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed.'
      const isAuthError = message.toLowerCase().includes('unauthenticated') || message.includes('401')
      setCheckoutError(
        isAuthError
          ? 'You must be signed in to purchase. Please log in and try again.'
          : message
      )
      if (isAuthError) redirectToLogin(2000)
      setBuyingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <SEOHead type="default" overrideTitle="Plans & Pricing — LenserFight" />

      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Buy credits once. Run any model. No subscription required.
        </p>
      </div>

      {checkoutError && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <XCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span className="text-sm">{checkoutError}</span>
        </div>
      )}

      {productsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CreditPackSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="text-sm">No products available at this time. Please check back later.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product, i) => (
            <CreditPackCard
              key={product.id}
              product={product}
              index={i}
              onBuy={handleBuy}
              buying={buyingId === product.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * GRASP: Creator + Polymorphism + Protected Variations
 *
 * StorePage is the composition root for the /store route. It owns the
 * checkout-status signal and delegates rendering to the appropriate
 * sub-view. Unknown ?status= values fall through to the default store
 * (Protected Variations).
 */
export const StorePage: React.FC = () => {
  const checkoutStatus = useCheckoutStatus()
  if (checkoutStatus === 'success') return <CheckoutSuccessView />
  if (checkoutStatus === 'error') return <CheckoutErrorView />
  return <StoreProductsView />
}
