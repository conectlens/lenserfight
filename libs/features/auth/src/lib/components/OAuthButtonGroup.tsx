import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'
import { resolveProductEdition, isLocal as isDevMode } from '@lenserfight/utils/env'

interface OAuthButtonGroupProps {
  onChainabit: () => void | Promise<void>
  onOAuth: (provider: 'google' | 'github') => void
  isLoading: boolean
  disabled: boolean
}

export const OAuthButtonGroup: React.FC<OAuthButtonGroupProps> = ({
  onChainabit,
  onOAuth,
  isLoading,
  disabled,
}) => {
  const edition = resolveProductEdition()
  const [chainabitError, setChainabitError] = useState<string | null>(null)
  const [chainabitPending, setChainabitPending] = useState(false)

  const showChainabit = edition === 'cloud' || edition === 'local' || isDevMode
  const showOthers = true

  const handleChainabit = async () => {
    setChainabitError(null)
    setChainabitPending(true)
    try {
      await onChainabit()
    } catch (err: unknown) {
      setChainabitError(err instanceof Error ? err.message : 'Chainabit sign-in unavailable.')
    } finally {
      setChainabitPending(false)
    }
  }

  return (
    <>
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
          <span className="px-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500">
            Or continue with
          </span>
        </div>
      </div>

      {showChainabit && (
        <>
          <Button
            type="button"
            onClick={handleChainabit}
            isLoading={isLoading || chainabitPending}
            disabled={disabled || chainabitPending}
            variant="secondary"
            fullWidth
            className="flex items-center justify-center gap-3 py-2.5 mb-3 border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm text-emerald-700 dark:text-emerald-300 rounded-xl"
            title="Continue with Chainabit"
          >
            <img
              src="/chainabit/favicon-32x32.png"
              width={20}
              height={20}
              alt="Chainabit"
              style={{ objectFit: 'contain' }}
            />
            Continue with Chainabit
          </Button>
          {chainabitError && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
              <AlertTriangle size={13} className="shrink-0" />
              <span>{chainabitError}</span>
            </div>
          )}
        </>
      )}

      {showOthers && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={() => onOAuth('google')}
            disabled={disabled || isLoading}
            variant="secondary"
            className="flex items-center justify-center py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sign in with Google"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </Button>
          <Button
            type="button"
            onClick={() => onOAuth('github')}
            disabled={disabled || isLoading}
            variant="secondary"
            className="flex items-center justify-center py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sign in with GitHub"
          >
            <svg
              className="w-5 h-5 text-gray-800 dark:text-gray-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </div>
      )}
    </>
  )
}
