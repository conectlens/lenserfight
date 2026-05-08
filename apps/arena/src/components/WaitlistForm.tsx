import React, { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

const AUTH_APP_URL = import.meta.env.VITE_AUTH_BASE_URL ?? 'https://auth.lenserfight.com'

interface WaitlistFormProps {
  className?: string
}

export const WaitlistForm: React.FC<WaitlistFormProps> = ({ className = '' }) => {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = email.trim()
      ? `${AUTH_APP_URL}/register?email=${encodeURIComponent(email.trim())}`
      : `${AUTH_APP_URL}/register`
    window.location.href = target
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 sm:flex-row sm:items-center ${className}`}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="h-11 flex-1 rounded-full border border-surface-border bg-surface-base px-4 text-sm text-greyscale-900 placeholder-greyscale-400 outline-none transition-colors focus:border-primary-yellow-500 dark:bg-greyscale-900 dark:text-greyscale-0 dark:placeholder-greyscale-500"
      />
      <button
        type="submit"
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-greyscale-900 px-5 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-surface-interactive dark:text-greyscale-0"
      >
        Get Early Access <ArrowRight size={15} />
      </button>
    </form>
  )
}
