import { supabase } from '@lenserfight/data/supabase'
import { Modal } from '@lenserfight/ui/modals'
import { Zap, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import React, { useState } from 'react'

import { useLenser } from '../context/LenserContext'

export const ChainabitOnboardingModal: React.FC = () => {
  const { lenser, loadLenserProfile } = useLenser()

  const [handle, setHandle] = useState(lenser?.handle ?? '')
  const [displayName, setDisplayName] = useState(lenser?.display_name ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isVisible = lenser?.type === 'human' && lenser?.onboarding_step === 1

  const handleSubmit = async () => {
    if (!handle.trim() || !displayName.trim()) {
      setError('Handle and display name are required.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('fn_complete_onboarding', {
        p_handle:       handle.trim().toLowerCase(),
        p_display_name: displayName.trim(),
      })
      if (rpcError) {
        if (rpcError.message.includes('HANDLE_TAKEN')) {
          setError('That handle is already taken. Please choose another.')
        } else {
          setError(rpcError.message)
        }
        return
      }
      // Reload profile so onboarding_step updates to 2 and the modal disappears
      await loadLenserProfile(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isVisible) return null

  return (
    <Modal isOpen={true} title="" canClose={false}>
      <div className="flex flex-col items-center text-center gap-4 pb-2">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
          <Zap size={28} className="text-orange-500" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome to LenserFight!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your Chainabit account is linked. Confirm your handle to get started.
          </p>
        </div>

        <div className="w-full text-left space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
              Handle
            </label>
            <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-orange-400">
              <span className="text-gray-400 dark:text-gray-500 text-sm">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="your_handle"
                maxLength={32}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              maxLength={64}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="w-full flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-left">
          <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Powered by <span className="font-semibold text-orange-500">Chainabit</span> — your credits follow you everywhere.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !handle.trim() || !displayName.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Get Started
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </Modal>
  )
}
