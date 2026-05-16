import { AlertCircle } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@lenserfight/features/auth'
import { useFormValidation } from '@lenserfight/utils/validation'
import { isRequired, minLength } from '@lenserfight/utils/validation'
import { AuthCard } from '../components/AuthCard'
import { BackButton } from '../components/BackButton'
import { Button, FormError } from '@lenserfight/ui/components'
import { InputField } from '../components/InputField'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Token may appear in query params depending on the reset link format.
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
      // Pass the token from the URL when present; Supabase may also establish a session from the link.
      await resetPassword(formData.password, token || undefined)

      window.alert('Password updated successfully!')
      navigate('/login')
    } catch (err: any) {
      setApiError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <AuthCard title="Reset Password" subtitle="Session Error" backButton={<BackButton />}>
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

  if (isAuthLoading) {
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
      backButton={<BackButton />}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <InputField
            label="New Password"
            name="password"
            type="password"
            autoComplete="new-password"
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
            autoComplete="new-password"
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

        <Button type="submit" fullWidth={true} isLoading={loading} className="mt-2 text-base font-semibold">
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
