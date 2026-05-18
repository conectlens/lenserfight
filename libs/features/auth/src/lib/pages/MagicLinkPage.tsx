import { Turnstile } from '@marsidev/react-turnstile'
import { Check } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { ENABLE_CAPTCHA, CAPTCHA_SITE_KEY } from '@lenserfight/utils/env'
import { useAuth } from '@lenserfight/features/auth'
import { useFormValidation } from '@lenserfight/utils/validation'
import { isRequired, isEmail } from '@lenserfight/utils/validation'
import { AuthCard } from '../components/AuthCard'
import { BackButton } from '../components/BackButton'
import { Button } from '@lenserfight/ui/components'
import { InputField } from '../components/InputField'

export const MagicLinkPage: React.FC = () => {
  const { sendMagicLink } = useAuth()

  const [formData, setFormData] = useState({ email: '' })
  const { errors, validate, clearError } = useFormValidation<typeof formData>({
    email: [isRequired(), isEmail()],
  })

  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    clearError(name as keyof typeof formData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)

    if (!validate(formData)) return

    if (ENABLE_CAPTCHA && !captchaToken) {
      setApiError('Please complete the security check.')
      return
    }

    setLoading(true)
    try {
      await sendMagicLink(formData.email, captchaToken || undefined)
      setSent(true)
    } catch {
      setApiError('Something went wrong. Please try again.')
      if (ENABLE_CAPTCHA) setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle="We sent you a sign-in link">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            If this email can sign in, we sent a link. Check your inbox and click it to sign in.
          </p>
          <div className="space-y-3">
            <div>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-sm text-primary-700 dark:text-primary-400 hover:underline font-medium"
              >
                Send again
              </button>
            </div>
            <Link to="/login">
              <Button type="button" fullWidth variant="secondary">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Sign in with link"
      subtitle="We'll email you a one-click sign-in link"
      backButton={<BackButton />}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          className={errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
        />

        {ENABLE_CAPTCHA && (
          <div className="flex justify-center my-4">
            <Turnstile siteKey={CAPTCHA_SITE_KEY} onSuccess={setCaptchaToken} />
          </div>
        )}

        {apiError && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {apiError}
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          isLoading={loading}
          disabled={ENABLE_CAPTCHA && !captchaToken}
          className="mt-2 py-3 text-base font-bold shadow-lg shadow-[rgba(40,123,255,0.2)]"
        >
          Send Sign-In Link
        </Button>
      </form>

      <div className="mt-8 space-y-4 text-center text-sm text-gray-500 font-medium">
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-gray-900 dark:text-gray-200 hover:text-primary-700 dark:hover:text-primary-400 hover:underline transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Sign In
        </Link>
        <div>
          New to LenserFight?
          <Link
            to="/register"
            className="ml-1.5 text-gray-900 dark:text-white hover:text-primary-700 dark:hover:text-primary-400 font-bold hover:underline transition-colors"
          >
            Join ConectLens
          </Link>
        </div>
      </div>
    </AuthCard>
  )
}
