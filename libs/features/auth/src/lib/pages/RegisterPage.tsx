import { Turnstile } from '@marsidev/react-turnstile'
import { Check, AlertCircle, ExternalLink } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
  isMock,
  isLocal,
  ENABLE_CAPTCHA,
  CAPTCHA_SITE_KEY,
  WEB_BASE_URL,
  loadDevSeedCredentials,
} from '@lenserfight/utils/env'
import { partnerApiClient } from '@lenserfight/infra/partner-provisioning'

const isDevMode = isLocal || isMock
import { useAuth } from '@lenserfight/features/auth'
import { useFormValidation } from '@lenserfight/utils/validation'
import { isRequired, isEmail } from '@lenserfight/utils/validation'
import { normalizeError, type AppError } from '@lenserfight/shared/error'
import { AuthCard } from '../components/AuthCard'
import { BackButton } from '../components/BackButton'
import { Button } from '@lenserfight/ui/components'
import { Loader } from '@lenserfight/ui/feedback'
import { InputField } from '../components/InputField'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'
import { OAuthButtonGroup } from '../components/OAuthButtonGroup'

export const RegisterPage: React.FC = () => {
  const { register, logout, resendSignupConfirmation, isAuthenticated, signInWithOAuth } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    displayName: '',
    email: isDevMode ? `newuser_${Date.now()}@lenserfight.local` : '',
    password: '',
    preferredLanguage: 'en',
    agreeTerms: isDevMode,
  })

  useEffect(() => {
    let cancelled = false
    loadDevSeedCredentials().then((creds) => {
      if (cancelled || !creds) return
      setFormData((prev) =>
        prev.displayName === '' && prev.password === ''
          ? { ...prev, displayName: creds.displayName, password: creds.password }
          : prev,
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const passwordValidator = (value: any) => {
    if (!value) return 'Password is required'
    if (value.length < 8) return 'Must be at least 8 characters'
    if (!/[A-Z]/.test(value)) return 'Must contain uppercase letter'
    if (!/[a-z]/.test(value)) return 'Must contain lowercase letter'
    if (!/[0-9]/.test(value)) return 'Must contain a number'
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Must contain special character'
    return null
  }

  const { errors, validate, clearError, setErrors } = useFormValidation<typeof formData>({
    displayName: [isRequired()],
    email: [isRequired(), isEmail()],
    password: [passwordValidator],
  })

  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [apiError, setApiError] = useState<AppError | null>(null)
  const [showResend, setShowResend] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Prevent auto-redirect if we are in the middle of a registration flow
  useEffect(() => {
    if (isAuthenticated && !isSuccess && !loading) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isSuccess, loading, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    // Handle checkbox separately for type safety in setFormData
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }))
    clearError(name as keyof typeof formData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setShowResend(false)

    if (!validate(formData)) return

    if (!formData.agreeTerms) {
      setApiError({ kind: 'unknown', message: 'You must agree to the terms and conditions.' })
      return
    }

    if (ENABLE_CAPTCHA && !captchaToken) {
      setApiError({ kind: 'unknown', message: 'Please complete the security check.' })
      return
    }

    setLoading(true)
    try {
      await register(
        formData.email,
        formData.password,
        {
          displayName: formData.displayName,
          preferredLanguage: formData.preferredLanguage || 'en',
        },
        captchaToken || undefined
      )

      // Success State - start overlay
      setIsSuccess(true)

      // Delay for animation
      setTimeout(() => {
        navigate('/welcome')
      }, 1500)
    } catch (err: unknown) {
      const normalized = normalizeError(err)
      const rawMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
      if (rawMsg.toLowerCase().includes('already exists') || rawMsg.includes('registered')) {
        setShowResend(true)
        try {
          await resendSignupConfirmation(formData.email)
          setApiError({
            ...normalized,
            message: 'Account already exists. If your email was not confirmed, we have sent another confirmation link.',
          })
        } catch (resendErr) {
          setApiError({ ...normalized, message: 'This email is already associated with an account.' })
        }
      } else {
        setApiError(normalized)
      }
      setLoading(false)
      if (ENABLE_CAPTCHA) setCaptchaToken(null)
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
      // OAuth redirects usually happen externally, but if mock:
      if (isMock) {
        setIsSuccess(true)
        setTimeout(() => navigate('/welcome'), 1500)
      }
    } catch (err: unknown) {
      setApiError(normalizeError(err))
      setOauthLoading(false)
    }
  }

  const openPolicy = (type: 'Terms' | 'Privacy' | 'Cookies') => {
    const slugMap: Record<typeof type, string> = {
      Terms: 'terms',
      Privacy: 'privacy',
      Cookies: 'cookies',
    }
    window.open(`${WEB_BASE_URL}/policies/${slugMap[type]}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {isSuccess && <Loader variant="card" isSuccess message="Creating Account..." />}

      <AuthCard title="Create Account" subtitle="Join the community today" backButton={<BackButton />}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <InputField
              label="Name"
              name="displayName"
              type="text"
              placeholder="Your full name"
              value={formData.displayName}
              onChange={handleChange}
              error={errors.displayName}
              className={
                errors.displayName ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }
            />
          </div>

          <div>
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              className={
                errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }
            />
          </div>

          <div>
            <InputField
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              className={
                errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }
            />

            <PasswordStrengthMeter password={formData.password} />
          </div>

          <div className="flex items-start gap-3 mt-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center mt-0.5">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:bg-primary peer-checked:border-primary peer-focus:ring-2 peer-focus:ring-primary/30 transition-all"></div>
                <Check
                  className="w-3.5 h-3.5 text-gray-900 absolute left-[3px] top-[3px] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                  strokeWidth={3.5}
                />
              </div>
              <div className="text-sm leading-tight text-gray-600 dark:text-gray-400 select-none">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => openPolicy('Terms')}
                  className="inline-flex items-center gap-0.5 font-semibold text-gray-900 dark:text-gray-200 hover:underline"
                >
                  Terms and Conditions<ExternalLink size={11} />
                </button>
                ,{' '}
                <button
                  type="button"
                  onClick={() => openPolicy('Privacy')}
                  className="inline-flex items-center gap-0.5 font-semibold text-gray-900 dark:text-gray-200 hover:underline"
                >
                  Privacy Policy<ExternalLink size={11} />
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => openPolicy('Cookies')}
                  className="inline-flex items-center gap-0.5 font-semibold text-gray-900 dark:text-gray-200 hover:underline"
                >
                  Cookie Policy<ExternalLink size={11} />
                </button>
                .
              </div>
            </label>
          </div>

          {ENABLE_CAPTCHA && (
            <div className="flex justify-center mt-4">
              <Turnstile siteKey={CAPTCHA_SITE_KEY} onSuccess={setCaptchaToken} />
            </div>
          )}

          {apiError && (
            <div className="flex flex-col gap-2 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-4 rounded-xl text-red-600 dark:text-red-400 text-sm mt-4 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  {apiError.kind === 'rate_limit'
                    ? 'Too many sign-up attempts. Please wait a moment before trying again.'
                    : apiError.kind === 'forbidden'
                      ? 'Account creation is not allowed. Please contact support.'
                      : apiError.kind === 'server_error'
                        ? 'Server error. Please try again in a moment.'
                        : apiError.message}
                </span>
              </div>
              {showResend && (
                <div className="ml-6 mt-1">
                  <Link
                    to="/auth/login"
                    className="text-xs font-bold underline hover:text-red-800 dark:hover:text-red-300"
                  >
                    Go to Sign In
                  </Link>
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            fullWidth={true}
            isLoading={loading}
            disabled={oauthLoading || isSuccess || (ENABLE_CAPTCHA && !captchaToken)}
            className="mt-4 py-3 text-base font-bold shadow-lg shadow-primary/20"
          >
            {isSuccess ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </form>

        <OAuthButtonGroup
          onChainabit={handleChainabit}
          onOAuth={handleOAuth}
          isLoading={oauthLoading}
          disabled={loading || isSuccess}
        />

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="ml-1 text-gray-900 dark:text-gray-200 hover:text-primary-700 dark:hover:text-primary-400 font-bold hover:underline transition-colors"
          >
            Sign In
          </Link>
        </div>
      </AuthCard>

    </>
  )
}
