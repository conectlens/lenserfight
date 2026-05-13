import { Turnstile } from '@marsidev/react-turnstile'
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { isMock, isLocal, LOCAL_SEED_CREDENTIALS, ENABLE_CAPTCHA, CAPTCHA_SITE_KEY } from '@lenserfight/utils/env'
import { partnerApiClient } from '@lenserfight/infra/partner-provisioning'

const seedCredentials = isLocal || isMock ? LOCAL_SEED_CREDENTIALS : null
import { useAuth } from '@lenserfight/features/auth'
import { rememberMeStorage } from '@lenserfight/data/supabase'
import { useFormValidation } from '@lenserfight/utils/validation'
import { isRequired, isEmail } from '@lenserfight/utils/validation'
import { normalizeError, type AppError } from '@lenserfight/shared/error'
import { AuthCard } from '../components/AuthCard'
import { BackButton } from '../components/BackButton'
import { Button } from '@lenserfight/ui/components'
import { Loader } from '@lenserfight/ui/feedback'
import { InputField } from '../components/InputField'
import { OAuthButtonGroup } from '../components/OAuthButtonGroup'

export const LoginPage: React.FC = () => {
  const { login, signInWithOAuth } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: seedCredentials?.email ?? '',
    password: seedCredentials?.password ?? '',
  })

  const { errors, validate, clearError } = useFormValidation<typeof formData>({
    email: [isRequired(), isEmail()],
    password: [isRequired()],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [apiError, setApiError] = useState<AppError | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)

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
      setApiError({ kind: 'unknown', message: 'Please complete the security check.' })
      return
    }

    setIsSubmitting(true)
    try {
      // Apply the remember-me preference before the session token is written
      rememberMeStorage.setRememberMe(rememberMe)
      await login(formData.email, formData.password, captchaToken || undefined)

      // Success State Trigger - effectively starts the transition animation
      setIsSuccess(true)
    } catch (err: unknown) {
      setApiError(normalizeError(err))
      setIsSubmitting(false) // Only stop loading on error
      if (ENABLE_CAPTCHA) setCaptchaToken(null) // Reset captcha on error
    }
  }

  const handleChainabit = () => {
    partnerApiClient.startOAuthLogin(window.location.origin).catch(() => {})
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(true)
    setApiError(null)
    try {
      await signInWithOAuth(provider)
      // OAuth redirects usually happen externally, but if mock:
      if (isMock) {
        setIsSuccess(true)
        setTimeout(() => navigate('/', { replace: true }), 1500)
      }
    } catch (err: unknown) {
      setApiError(normalizeError(err))
      setOauthLoading(false)
    }
  }

  return (
    <>
      {isSuccess && <Loader variant="card" isSuccess message="Welcome back, Lenser." />}

      <AuthCard title="Sign In" subtitle="Welcome back, Lenser" backButton={<BackButton />}>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              className={
                errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }
            />
          </div>

          <div className="relative">
            <div>
              <InputField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                className={
                  errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                }
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 peer-checked:bg-primary peer-checked:border-primary peer-focus:ring-2 peer-focus:ring-primary/30 transition-all"></div>
                <Check
                  className="w-3.5 h-3.5 text-gray-900 absolute left-[3px] top-[3px] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                  strokeWidth={3.5}
                />
              </div>
              <span className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors font-medium">
                Remember me
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {ENABLE_CAPTCHA && (
            <div className="flex justify-center my-4">
              <Turnstile siteKey={CAPTCHA_SITE_KEY} onSuccess={setCaptchaToken} />
            </div>
          )}

          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                {apiError.kind === 'rate_limit'
                  ? 'Too many sign-in attempts. Please wait a moment before trying again.'
                  : apiError.kind === 'forbidden'
                    ? 'Your account has been suspended. Please contact support.'
                    : apiError.kind === 'server_error'
                      ? 'Server error. Please try again in a moment.'
                      : apiError.message}
              </span>
            </div>
          )}

          <Button
            type="submit"
            fullWidth={true}
            isLoading={isSubmitting}
            disabled={oauthLoading || isSuccess || (ENABLE_CAPTCHA && !captchaToken)}
            className="mt-4 py-3 text-base font-bold shadow-lg shadow-[rgba(40,123,255,0.2)]"
          >
            {isSuccess ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <OAuthButtonGroup
          onChainabit={handleChainabit}
          onOAuth={handleOAuth}
          isLoading={oauthLoading}
          disabled={isSubmitting || isSuccess}
        />

        <div className="mt-8 text-center text-sm text-gray-500 font-medium">
          New to LenserFight?
          <Link
            to="/register"
            className="ml-1.5 text-gray-900 dark:text-white hover:text-primary-700 dark:hover:text-primary-400 font-bold hover:underline transition-colors"
          >
            Join ConectLens
          </Link>
        </div>
      </AuthCard>
    </>
  )
}
