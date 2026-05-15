import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { Button } from '@lenserfight/ui/components'
import { FEATURES } from '@lenserfight/utils/env'
import {
  CheckCircle,
  Lock,
  Sparkles,
  Loader2,
} from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'


import { useWaitingList } from '../hooks/useWaitingList'

export const WaitingListSection: React.FC = () => {
  if (!FEATURES.WAITING_LIST) {
    return null
  }
  return <WaitingListSectionContent />
}

const WaitingListSectionContent: React.FC = () => {
  const { lenser, hasLenser, isLoading: lenserLoading, redirectToOnboarding } = useLenser()
  const { isInWaitingList, toggleWaitingList } = useWaitingList()

  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [kvkkApproved, setKvkkApproved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * STATE DERIVATION (IMPORTANT)
   *
   * Hold the loading state while auth or the lenser profile query is in
   * flight, so authenticated users with a slow profile fetch don't briefly
   * see the "Sign In / Register" CTA.
   */
  const isResolving = authLoading || (isAuthenticated && lenserLoading)

  const isCheckingStatus =
    !isResolving && isAuthenticated && hasLenser && isInWaitingList === null

  const isJoined = isInWaitingList === true
  const showSignInCta = !isResolving && !isAuthenticated
  const showOnboardingCta = !isResolving && isAuthenticated && !hasLenser

  const signInCtaCard = (
    <div className="max-w-md mx-auto">
      <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-10 border shadow-xl">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock size={28} />
        </div>

        <h3 className="text-xl font-bold mb-3">Sign in to join</h3>

        <p className="text-gray-500 mb-8">
          Sign in or create a Lenser account to join the waitlist.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/auth/login">
            <Button variant="secondary" className="w-full">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button className="w-full">
              Register
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )

  const onboardingCtaCard = (
    <div className="max-w-md mx-auto">
      <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-10 border shadow-xl">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock size={28} />
        </div>

        <h3 className="text-xl font-bold mb-3">Create Your Lenser Identity</h3>

        <p className="text-gray-500 mb-8">
          Finish setting up your Lenser profile before you can join the waitlist.
        </p>

        <Button className="w-full" onClick={() => redirectToOnboarding()}>
          Continue Setup
        </Button>
      </div>
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lenser) return

    setError(null)

    if (!kvkkApproved) {
      setError('You must approve the privacy policy to join.')
      return
    }

    setIsSubmitting(true)

    try {
      await toggleWaitingList(kvkkApproved)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to join list.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="relative w-full overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-800 shadow-2xl shadow-gray-200/60 dark:shadow-black/40 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-50 via-white to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-900" />
      </div>

      <div className="relative px-6 py-20 md:py-24 max-w-3xl mx-auto text-center">
        {/* HEADER */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-10">
          <Sparkles size={12} className="text-primary" />
          The Next Evolution of LenserFight
        </div>

        <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6">
          Early Access
        </h2>

        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 mb-14">
          Join the waitlist for upcoming features and agentic workflows.
        </p>

        {/* ===============================
            1️⃣ LOADING STATE (CRITICAL)
           =============================== */}
        {(isResolving || isCheckingStatus) && (
          <div className="max-w-md mx-auto rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm">
            <div className="flex flex-col items-center justify-center gap-4 py-14">
              <Loader2
                className="w-10 h-10 text-primary animate-spin"
                strokeWidth={2.5}
              />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Checking your early access status…
              </p>
            </div>
          </div>
        )}

        {/* ===============================
            2️⃣ AUTHENTICATED + LENSER
           =============================== */}
        {!isResolving && !isCheckingStatus && !showSignInCta && !showOnboardingCta && (
          <>
            {isJoined ? (
              // ✅ JOINED
              <div className="bg-primary/10 dark:bg-primary/5 border border-primary/20 rounded-3xl p-10 max-w-md mx-auto animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-white dark:bg-gray-800 border-4 border-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Spot Secured
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  You are on the list! We’ll notify you when beta opens.
                </p>
              </div>
            ) : (
              // ➕ JOIN FORM
              <form
                onSubmit={handleSubmit}
                className="max-w-md mx-auto"
              >
                <div className="flex flex-col gap-6">
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-2xl border text-sm text-left">
                    <strong>Authenticated as:</strong>{' '}
                    {lenser?.display_name}
                  </div>

                  <label className="flex items-start gap-3 text-left">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={kvkkApproved}
                      onChange={(e) =>
                        setKvkkApproved(e.target.checked)
                      }
                    />
                    <span className="text-xs text-gray-500">
                      I agree to the{' '}
                      <a
                        href="/legal/privacy"
                        target="_blank"
                        className="underline font-bold"
                      >
                        Privacy Policy
                      </a>
                    </span>
                  </label>

                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="h-12 font-bold"
                  >
                    Secure My Spot
                  </Button>
                </div>

                {error && (
                  <div className="mt-6 text-sm text-red-600">
                    {error}
                  </div>
                )}
              </form>
            )}
          </>
        )}

        {/* ===============================
            3️⃣ NOT AUTHENTICATED
           =============================== */}
        {showSignInCta && signInCtaCard}

        {/* ===============================
            4️⃣ AUTHENTICATED, NO LENSER YET
           =============================== */}
        {showOnboardingCta && onboardingCtaCard}

      </div>
    </section>
  )
}
