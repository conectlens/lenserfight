import { Turnstile } from '@marsidev/react-turnstile'
import { ArrowLeft } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../../../components/Button'
import { FormError } from '../../../components/FormError'
import { isMock, ENABLE_CAPTCHA, CAPTCHA_SITE_KEY } from '../../../config/runtimeConfig'
import { useAuth } from '../../../context/AuthContext'
import { useFormValidation } from '../../../hooks/useFormValidation'
import { isRequired, isEmail } from '../../../utils/validation'
import { AuthCard } from '../components/AuthCard'
import { InputField } from '../components/InputField'

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
  })

  const { errors, validate, clearError } = useFormValidation<typeof formData>({
    email: [isRequired(), isEmail()],
  })

  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    clearError(name as keyof typeof formData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setSuccess(false)

    if (!validate(formData)) return

    if (ENABLE_CAPTCHA && !captchaToken) {
      setApiError('Please complete the security check.')
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset(formData.email, captchaToken || undefined)
      setSuccess(true)
      // For mock purposes, console.log is handled in repository
    } catch (err: any) {
      setApiError(err.message || 'Failed to send reset email')
      if (ENABLE_CAPTCHA) setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthCard title="Check your email" subtitle="We sent you a reset link">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-600 mb-6">
            If an account exists for <strong>{formData.email}</strong>, you will receive
            instructions to reset your password.
          </p>
          {isMock && (
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg mb-6 text-left">
              <strong>Mock Mode Tip:</strong> Check your browser console (F12) for the reset link.
            </div>
          )}
          <Link to="/login">
            <Button>Return to Sign In</Button>
          </Link>
        </div>
      </AuthCard>
    )
  }

  const backButton = (
    <Link
      to="/"
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-2.5 rounded-full hover:bg-white dark:hover:bg-gray-800 shadow-sm border border-gray-200/50 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 w-auto"
    >
      <ArrowLeft size={16} />
      Dive into the arena
    </Link>
  )

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your email to receive instructions"
      backButton={backButton}
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <InputField
            label="Email Address"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
          />
          <FormError message={errors.email} />
        </div>

        {ENABLE_CAPTCHA && (
          <div className="flex justify-center mt-2">
            <Turnstile siteKey={CAPTCHA_SITE_KEY} onSuccess={setCaptchaToken} />
          </div>
        )}

        {apiError && (
          <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{apiError}</div>
        )}

        <Button
          type="submit"
          isLoading={loading}
          disabled={ENABLE_CAPTCHA && !captchaToken}
          className="mt-2 text-base font-semibold"
        >
          Send Reset Link
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500 font-medium">
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
      </div>
    </AuthCard>
  )
}
