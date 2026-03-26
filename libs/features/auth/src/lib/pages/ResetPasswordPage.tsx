import { ArrowLeft, AlertCircle } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { isMock } from '@lenserfight/utils/env'
import { useAuth } from '@lenserfight/features/auth'
import { useFormValidation } from '@lenserfight/utils/validation'
import { isRequired, minLength } from '@lenserfight/utils/validation'
import { AuthCard } from '../components/AuthCard'
import { Button, FormError } from '@lenserfight/ui/components'
import { InputField } from '../components/InputField'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Try to get token from query params (Mock) or hash (Supabase often puts it there, though auth lib handles it)
  // For the purpose of this mock/stub dual implementation, we look at query params mainly for the Mock.
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    }
  }, [searchParams])

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  const { errors, validate, clearError, setErrors } = useFormValidation<typeof formData>({
    password: [isRequired(), minLength(6)],
    confirmPassword: [isRequired()],
  })

  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    clearError(name as keyof typeof formData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)

    if (!validate(formData)) return

    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }))
      return
    }

    setLoading(true)
    try {
      // If mock, token is required. If Supabase, token might be null but session active.
      // We pass the token found in URL if any.
      await resetPassword(formData.password, token || undefined)

      window.alert('Password updated successfully!')
      navigate('/login')
    } catch (err: any) {
      setApiError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const returnUrl =
    new URLSearchParams(window.location.search).get('return_url') ??
    (import.meta.env.VITE_WEB_BASE_URL ?? 'https://forum.lenserfight.com')

  const backButton = (
    <a
      href={returnUrl}
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-2.5 rounded-full hover:bg-white dark:hover:bg-gray-800 shadow-sm border border-gray-200/50 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 w-auto"
    >
      <ArrowLeft size={16} />
      Return back
    </a>
  )

  // Check for session in real auth mode (Supabase)
  // If not mock, and loading is done, and user is not authenticated, show error.
  if (!isMock && !isAuthLoading && !isAuthenticated) {
    return (
      <AuthCard title="Reset Password" subtitle="Session Error" backButton={backButton}>
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Auth session missing!</h3>
          <p className="text-gray-500 mb-6 text-sm max-w-xs mx-auto">
            We couldn't verify your identity. Please try clicking the reset link again or request a
            new one.
          </p>
          <Link to="/forgot-password" className="w-full">
            <Button type="button" >Request New Link</Button>
          </Link>
        </div>
      </AuthCard>
    )
  }

  // Optional: Loading state for auth check to prevent flash of form
  if (!isMock && isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <AuthCard
      title="Set New Password"
      subtitle="Choose a strong password for your account"
      backButton={backButton}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <InputField
            label="New Password"
            name="password"
            type="password"
            placeholder="Enter new password"
            value={formData.password}
            onChange={handleChange}
            className={
              errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
            }
          />
          <PasswordStrengthMeter password={formData.password} />
          <FormError message={errors.password} />
        </div>

        <div>
          <InputField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={
              errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
            }
          />
          <FormError message={errors.confirmPassword} />
        </div>

        {apiError && (
          <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{apiError}</div>
        )}

        <Button type="submit" isLoading={loading} className="mt-2 text-base font-semibold">
          Update Password
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500 font-medium">
        <Link
          to="/auth/login"
          className="flex items-center justify-center gap-2 text-gray-900 dark:text-white hover:text-primary-700 dark:hover:text-primary-400 hover:underline transition-colors"
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
