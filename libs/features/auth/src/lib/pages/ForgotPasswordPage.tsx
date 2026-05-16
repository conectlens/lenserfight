import { Turnstile } from '@marsidev/react-turnstile'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { ENABLE_CAPTCHA, CAPTCHA_SITE_KEY } from '@lenserfight/utils/env'
import { useAuth } from '@lenserfight/features/auth'
import { useFormValidation } from '@lenserfight/utils/validation'
import { isRequired, isEmail } from '@lenserfight/utils/validation'
import { AuthCard } from '../components/AuthCard'
import { BackButton } from '../components/BackButton'
import { Button, FormError } from '@lenserfight/ui/components'
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
          <Link to="/auth/login">
            <Button type="button" >Return to Sign In</Button>
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your email to receive instructions"
      backButton={<BackButton />}
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
          fullWidth={true}
          isLoading={loading}
          disabled={ENABLE_CAPTCHA && !captchaToken}
          className="mt-2 text-base font-semibold"
        >
          Send Reset Link
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500 font-medium">
        <Link
          to="/auth/login"
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
