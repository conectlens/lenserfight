import React, { useState } from 'react'
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react'
import { chainabitUrl } from '@lenserfight/utils/env'

const AUTH_APP_URL = import.meta.env.AUTH_BASE_URL ?? 'https://auth.lenserfight.com'

interface WaitlistFormProps {
  className?: string
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export const WaitlistForm: React.FC<WaitlistFormProps> = ({ className = '' }) => {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch(chainabitUrl('newsletters'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          languageCode: navigator.language?.slice(0, 16) || 'en',
          consentMarketing: true,
          source: 'lenserfight-arena',
        }),
      })

      if (res.ok || res.status === 409) {
        setState('success')
      } else {
        setErrorMsg('Something went wrong. Please try again.')
        setState('error')
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${className}`}>
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-green-500/40 bg-green-50 px-4 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle size={15} />
          You're on the list — we'll be in touch!
        </div>
        <a
          href={`${AUTH_APP_URL}/register`}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-greyscale-900 px-5 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-surface-interactive dark:text-greyscale-0"
        >
          Sign Up <ArrowRight size={15} />
        </a>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={state === 'loading'}
          className="h-11 flex-1 rounded-full border border-surface-border bg-surface-base px-4 text-sm text-greyscale-900 placeholder-greyscale-400 outline-none transition-colors focus:border-primary-yellow-500 disabled:opacity-60 dark:bg-greyscale-900 dark:text-greyscale-0 dark:placeholder-greyscale-500"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="submit"
            disabled={state === 'loading'}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-greyscale-900 px-5 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-surface-interactive dark:text-greyscale-0"
          >
            {state === 'loading' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>Get Early Access <ArrowRight size={15} /></>
            )}
          </button>
          <a
            href={`${AUTH_APP_URL}/register`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-surface-border px-5 text-sm font-bold text-greyscale-900 transition-colors hover:bg-greyscale-100 dark:border-greyscale-700 dark:text-greyscale-0 dark:hover:bg-greyscale-800"
          >
            Sign Up
          </a>
        </div>
      </form>
      {state === 'error' && (
        <p className="pl-4 text-xs text-red-500">{errorMsg}</p>
      )}
      <p className="pl-4 text-xs text-greyscale-400 dark:text-greyscale-500">
        Your email is collected and managed by{' '}
        <a
          href="https://chainabit.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-greyscale-600 dark:hover:text-greyscale-300"
        >
          Chainabit
        </a>
        . You can unsubscribe at any time.
      </p>
    </div>
  )
}
