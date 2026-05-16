import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ENABLE_CAPTCHA, CAPTCHA_SITE_KEY, loadDevSeedCredentials } from '@lenserfight/utils/env'
import { partnerApiClient } from '@lenserfight/infra/partner-provisioning'

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
  const { login, signInWithOAuth, sendMagicLink } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  useEffect(() => {
    let cancelled = false
    loadDevSeedCredentials().then((creds) => {
      if (cancelled || !creds) return
      setFormData((prev) =>
        prev.email === '' && prev.password === ''
          ? { email: creds.email, password: creds.password }
          : prev,
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

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
  const turnstileRef = useRef<TurnstileInstance>(null)

  const [magicLinkEmail, setMagicLinkEmail] = useState('')
  const [magicLinkSending, setMagicLinkSending] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null)

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
      if (ENABLE_CAPTCHA) {
        setCaptchaToken(null)
        turnstileRef.current?.reset()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicLinkError(null)
    if (!magicLinkEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(magicLinkEmail)) {
      setMagicLinkError('Enter a valid email address.')
      return
    }
    setMagicLinkSending(true)
    try {
      await sendMagicLink(magicLinkEmail, captchaToken || undefined)
      setMagicLinkSent(true)
    } catch {
      setMagicLinkError('Something went wrong. Please try again.')
    } finally {
      setMagicLinkSending(false)
    }
  }

  const handleChainabit = () => {
    return partnerApiClient.startOAuthLogin(window.location.origin)
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(true)
    setApiError(null)
    try {
      await signInWithOAuth(provider)
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
              <Turnstile ref={turnstileRef} siteKey={CAPTCHA_SITE_KEY} onSuccess={setCaptchaToken} />
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

        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-3 font-medium uppercase tracking-wide">
            Or sign in with email link
          </p>
          {magicLinkSent ? (
            <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-3 rounded-xl text-green-700 dark:text-green-400 text-sm">
              <Check size={16} className="mt-0.5 flex-shrink-0" />
              <span>Check your inbox — we sent you a sign-in link.</span>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3" noValidate>
              <InputField
                label=""
                name="magicLinkEmail"
                type="email"
                placeholder="Enter your email"
                value={magicLinkEmail}
                onChange={(e) => { setMagicLinkEmail(e.target.value); setMagicLinkError(null) }}
                error={magicLinkError ?? undefined}
              />
              {magicLinkError && (
                <p className="text-xs text-red-600 dark:text-red-400">{magicLinkError}</p>
              )}
              <Button
                type="submit"
                fullWidth
                variant="secondary"
                isLoading={magicLinkSending}
                disabled={isSubmitting || oauthLoading || isSuccess}
              >
                Send Sign-In Link
              </Button>
            </form>
          )}
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
