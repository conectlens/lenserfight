import { Turnstile } from '@marsidev/react-turnstile'
import { ArrowLeft, Check, AlertCircle } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@lenserfight/ui/components'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { isMock, ENABLE_CAPTCHA, CAPTCHA_SITE_KEY } from '@lenserfight/utils/env'
import { useAuth } from '@lenserfight/features/auth'
import { useFormValidation } from '@lenserfight/utils/validation'
import { isRequired, isEmail } from '@lenserfight/utils/validation'
import { AuthCard } from '../components/AuthCard'
import { InputField } from '../components/InputField'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'

export const RegisterPage: React.FC = () => {
  const { register, logout, resendSignupConfirmation, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    displayName: isMock ? 'New User' : '',
    email: isMock ? `newuser_${Date.now()}@example.com` : '',
    password: isMock ? 'Password123!' : '',
    confirmPassword: isMock ? 'Password123!' : '',
    preferredLanguage: 'en',
    agreeTerms: isMock ? true : false,
  })

  // Policy Modal State
  const [policyModal, setPolicyModal] = useState<{
    isOpen: boolean
    title: string
    content: React.ReactNode
  } | null>(null)
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
    confirmPassword: [isRequired()],
  })

  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
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
    if (name === 'password') clearError('confirmPassword')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setShowResend(false)

    if (!validate(formData)) return

    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }))
      return
    }

    if (!formData.agreeTerms) {
      setApiError('You must agree to the terms and conditions.')
      return
    }

    if (ENABLE_CAPTCHA && !captchaToken) {
      setApiError('Please complete the security check.')
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
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('already exists') || msg.includes('registered')) {
        setApiError('This email is already associated with an account.')
        setShowResend(true)

        try {
          await resendSignupConfirmation(formData.email)
          setApiError(
            'Account already exists. If your email was not confirmed, we have sent another confirmation link.'
          )
        } catch (resendErr) {
          console.log('Resend failed or not needed', resendErr)
        }
      } else {
        setApiError(msg || 'Failed to register')
      }
      setLoading(false)
      if (ENABLE_CAPTCHA) setCaptchaToken(null)
    }
  }

  const openPolicy = (type: 'Terms' | 'Privacy' | 'Cookies') => {
    let content = <p>Content loading...</p>
    if (type === 'Terms') {
      content = (
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <strong>1. Introduction</strong>
            <br />
            Welcome to ConnectLens. By using our website, you agree to these terms.
          </p>
          <p>
            <strong>2. Usage</strong>
            <br />
            You agree to use the platform for lawful purposes only.
          </p>
          <p>
            <strong>3. Content</strong>
            <br />
            You retain rights to content you create, but grant us a license to display it.
          </p>
        </div>
      )
    } else if (type === 'Privacy') {
      content = (
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <strong>1. Data Collection</strong>
            <br />
            We collect information you provide directly to us.
          </p>
          <p>
            <strong>2. Usage of Data</strong>
            <br />
            We use your data to provide and improve our services.
          </p>
          <p>
            <strong>3. Third Parties</strong>
            <br />
            We do not sell your personal data to third parties.
          </p>
        </div>
      )
    } else {
      content = (
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <strong>1. What are cookies?</strong>
            <br />
            Cookies are small text files stored on your device.
          </p>
          <p>
            <strong>2. How we use them</strong>
            <br />
            We use cookies for authentication and analytics.
          </p>
        </div>
      )
    }

    setPolicyModal({
      isOpen: true,
      title: `${type} Policy`,
      content,
    })
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
    <>
      {isSuccess && <LoadingOverlay isSuccess message="Creating Account..." />}

      <AuthCard title="Create Account" subtitle="Join the community today" backButton={backButton}>
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

          <div>
            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              className={
                errors.confirmPassword
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                  : ''
              }
            />
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
                  className="font-semibold text-gray-900 dark:text-gray-200 hover:underline"
                >
                  Terms and Conditions
                </button>
                ,{' '}
                <button
                  type="button"
                  onClick={() => openPolicy('Privacy')}
                  className="font-semibold text-gray-900 dark:text-gray-200 hover:underline"
                >
                  Privacy Policy
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => openPolicy('Cookies')}
                  className="font-semibold text-gray-900 dark:text-gray-200 hover:underline"
                >
                  Cookie Policy
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
                <span>{apiError}</span>
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
            isLoading={loading}
            disabled={isSuccess || (ENABLE_CAPTCHA && !captchaToken)}
            className="mt-4 py-3 text-base font-bold shadow-lg shadow-primary/20"
          >
            {isSuccess ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </form>

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

      {/* Policy Modal */}
      {policyModal && (
        <Modal
          isOpen={policyModal.isOpen}
          onClose={() => setPolicyModal(null)}
          title={policyModal.title}
          canClose={true}
        >
          <div className="max-h-[60vh] overflow-y-auto pr-2 text-gray-600 dark:text-gray-300">
            {policyModal.content}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setPolicyModal(null)} className="w-auto">
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
