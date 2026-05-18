import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@lenserfight/features/auth'
import { useFormValidation } from '@lenserfight/utils/validation'
import { isRequired, minLength } from '@lenserfight/utils/validation'
import { AuthCard } from '../components/AuthCard'
import { BackButton } from '../components/BackButton'
import { Button, FormError } from '@lenserfight/ui/components'
import { InputField } from '../components/InputField'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'

/** Minimum password length — must match PasswordStrengthMeter's visual indicator and supabase config. */
const MIN_PASSWORD_LENGTH = 8

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, isAuthenticated, isLoading: isAuthLoading, isRecoverySession } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  const { errors, validate, clearError, setErrors } = useFormValidation<typeof formData>({
    password: [isRequired(), minLength(MIN_PASSWORD_LENGTH)],
    confirmPassword: [isRequired()],
  })

  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
      await resetPassword(formData.password)
      setSuccess(true)
    } catch (err: any) {
      setApiError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading state: waiting for Supabase to establish the recovery session ──
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-greyscale-900">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // ── Success state ──
  if (success) {
    return (
      <AuthCard title="Password Updated" subtitle="Your password has been changed successfully">
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            All done!
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm max-w-xs mx-auto">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
          >
            Back to Sign In
          </Button>
        </div>
      </AuthCard>
    )
  }

  // ── No recovery session: user didn't arrive via a reset-password email link ──
  // This guards against two scenarios:
  //   1. The user navigates to /reset-password manually (no session at all)
  //   2. An already-authenticated user navigates here (has a SIGNED_IN session, not PASSWORD_RECOVERY)
  if (!isRecoverySession) {
    return (
      <AuthCard title="Reset Password" subtitle="Session Error" backButton={<BackButton />}>
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {isAuthenticated ? 'Invalid reset link' : 'Auth session missing!'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm max-w-xs mx-auto">
            {isAuthenticated
              ? 'This link has already been used or has expired. Please request a new password reset.'
              : "We couldn't verify your identity. Please try clicking the reset link again or request a new one."}
          </p>
          <Link to="/forgot-password" className="w-full">
            <Button type="button">
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Request New Link
            </Button>
          </Link>
        </div>
      </AuthCard>
    )
  }

  // ── Reset password form ──
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
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <Button type="submit" fullWidth={true} isLoading={loading} className="mt-2 text-base font-semibold">
          Update Password
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500 font-medium">
        <Link
          to="/forgot-password"
          className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-700 dark:hover:text-primary-400 hover:underline transition-colors"
        >
          Request a new reset link
        </Link>
      </div>
    </AuthCard>
  )
}
