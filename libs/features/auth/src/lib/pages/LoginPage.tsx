import { Turnstile } from '@marsidev/react-turnstile'
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { isMock, isLocal, LOCAL_SEED_CREDENTIALS, ENABLE_CAPTCHA, CAPTCHA_SITE_KEY } from '@lenserfight/utils/env'
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

export const LoginPage: React.FC = () => {
  const { login, signInWithOAuth, signInWithChainabit } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: isLocal || isMock ? LOCAL_SEED_CREDENTIALS.email : '',
    password: isLocal || isMock ? LOCAL_SEED_CREDENTIALS.password : '',
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

  const handleChainabit = async () => {
    setOauthLoading(true)
    setApiError(null)
    try {
      await signInWithChainabit()
    } catch (err: unknown) {
      setApiError(normalizeError(err))
      setOauthLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github' | 'azure') => {
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

        {/* Chainabit — primary OAuth CTA */}
        <button
          type="button"
          onClick={handleChainabit}
          disabled={oauthLoading || isSubmitting || isSuccess}
          className="w-full flex items-center justify-center gap-3 py-2.5 mb-3 border border-orange-300 dark:border-orange-700 rounded-xl bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm text-orange-700 dark:text-orange-300"
          title="Sign in with Chainabit"
        >
          <img src="/chainabit/favicon-32x32.png" width={20} height={20} alt="Chainabit" style={{ objectFit: 'contain' }} />
          Continue with Chainabit
        </button>

        {/* OAuth Buttons - Active */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={oauthLoading || isSubmitting || isSuccess}
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
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('azure')}
            disabled={oauthLoading || isSubmitting || isSuccess}
            className="flex items-center justify-center py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sign in with Microsoft"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21">
              <path fill="#f25022" d="M1 1h9v9H1z" />
              <path fill="#00a4ef" d="M1 11h9v9H1z" />
              <path fill="#7fba00" d="M11 1h9v9h-9z" />
              <path fill="#ffb900" d="M11 11h9v9h-9z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('github')}
            disabled={oauthLoading || isSubmitting || isSuccess}
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
          </button>
        </div>

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
