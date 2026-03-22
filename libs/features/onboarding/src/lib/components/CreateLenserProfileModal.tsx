import { queryKeys } from '@lenserfight/data/cache'
import { lenserService, preferencesService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { InputField } from '@lenserfight/features/auth'
import { SearchSelectField } from '@lenserfight/ui/forms'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { CreateLenserDTO, Lenser } from '@lenserfight/types'
import { LanguageSelectBox, StepWizard } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { storage } from '@lenserfight/utils/storage'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, Loader2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'

const AUTH_PROFILE_GATE_QUERY_KEY = ['lenser', 'auth-profile-gate'] as const

interface CreateLenserProfileModalProps {
  onClose: () => void
  onComplete?: () => void
  requireCompletion?: boolean
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const THEME_OPTIONS: { value: 'light' | 'dark' | 'system'; label: string }[] = [
  { value: 'system', label: 'System default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export const CreateLenserProfileModal: React.FC<CreateLenserProfileModalProps> = ({
  onClose,
  onComplete,
  requireCompletion = false,
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  // ── Step state ──────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0)

  // ── Step 0: handle + display name ──────────────────────────────────
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [handleError, setHandleError] = useState<string | null>(null)
  const [isCheckingHandle, setIsCheckingHandle] = useState(false)
  const [isHandleUnique, setIsHandleUnique] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmittingStep0, setIsSubmittingStep0] = useState(false)

  // ── Step 1: language + theme ─────────────────────────────────────
  const [preferredLanguage, setPreferredLanguage] = useState('en')
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [isCompletingStep1, setIsCompletingStep1] = useState(false)

  // ── Step 2: AI configuration (optional) ─────────────────────────
  const [aiProviderKey, setAiProviderKey] = useState<string>('')
  const [aiModelKey, setAiModelKey] = useState<string>('')
  const [isCompletingStep2, setIsCompletingStep2] = useState(false)

  const { data: lenser = null, isLoading: lenserLoading } = useQuery<Lenser | null>({
    queryKey: queryKeys.lenser.authenticated(),
    queryFn: () => lenserService.getAuthenticatedLenser(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  })

  const { data: languages = [], isLoading: langsLoading } = useQuery({
    queryKey: ['core', 'languages'],
    queryFn: () => lenserService.getLanguages(),
    enabled: currentStep === 1,
    staleTime: Infinity,
  })

  const { data: providers = [], isLoading: isLoadingProviders } = useAIProviders()
  const { data: providerModels = [], isLoading: isLoadingModels } = useAIModelsByProvider(
    currentStep === 2 && aiProviderKey ? aiProviderKey : null
  )

  const hasLenser = !!lenser
  const onboardingStep = lenser?.onboarding_step ?? 0
  const hasCompletedOnboarding = onboardingStep >= 2
  const isLoading = authLoading || lenserLoading

  // Security redirect: only authenticated users without a profile reach this
  useEffect(() => {
    if (authLoading || lenserLoading) return
    if (!isAuthenticated) {
      const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'https://auth.lenserfight.com'
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `${authAppUrl}/login?return_url=${returnUrl}`
      onClose()
    } else if (hasLenser && hasCompletedOnboarding) {
      onClose()
    }
  }, [authLoading, lenserLoading, isAuthenticated, hasLenser, hasCompletedOnboarding, onClose])

  useEffect(() => {
    if (!hasLenser) return
    if (hasCompletedOnboarding) return
    if (onboardingStep >= 1 && currentStep === 0) {
      setCurrentStep(1)
    }
  }, [currentStep, hasCompletedOnboarding, hasLenser, onboardingStep])

  // ── Handle uniqueness check (debounced) ─────────────────────────────
  useEffect(() => {
    setIsHandleUnique(false)
    setSuggestions([])

    const clean = handle.toLowerCase().replace(/\s/g, '')
    if (clean.length === 0) { setHandleError(null); return }
    if (clean.length < 4) { setHandleError('Handle must be at least 4 characters.'); return }
    if (!/^[a-z0-9_.]+$/.test(clean)) {
      setHandleError('Only lowercase letters, numbers, underscores, and dots allowed.')
      return
    }
    setHandleError(null)

    const suggestions = [
      `${clean}123`, `${clean}_app`, `iam_${clean}`, `${clean}.official`, `real_${clean}`,
    ]

    const timer = setTimeout(async () => {
      setIsCheckingHandle(true)
      try {
        const existing = await lenserService.getLenserByHandle(clean)
        if (existing) {
          setHandleError('Handle is already taken.')
          setSuggestions(suggestions)
          setIsHandleUnique(false)
        } else {
          setIsHandleUnique(true)
          setSuggestions([])
        }
      } catch {
        // ignore check errors — user can still try to submit
      } finally {
        setIsCheckingHandle(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [handle])

  if (authLoading || isLoading || !isAuthenticated) return null
  if (hasLenser && hasCompletedOnboarding) return null

  // ── Step 0 submit: create profile ───────────────────────────────────
  const handleStep0Next = async () => {
    if (!displayName.trim()) { setSubmitError('Display Name is required'); return }
    if (handleError || !isHandleUnique) return

    setSubmitError(null)
    setIsSubmittingStep0(true)
    try {
      const profile = await lenserService.createLenserProfile({ handle, display_name: displayName } as CreateLenserDTO)
      queryClient.setQueryData(queryKeys.lenser.authenticated(), profile)
      queryClient.setQueryData(AUTH_PROFILE_GATE_QUERY_KEY, {
        kind: 'onboarding',
        status: 'active',
        onboardingStep: profile.onboarding_step ?? 1,
      })
      storage.setItem('lenser_has_profile', 'true')
      setCurrentStep(1)
      await queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_GATE_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: queryKeys.waitingList.status() })
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Failed to create profile'))
    } finally {
      setIsSubmittingStep0(false)
    }
  }

  // ── Step 1 submit: save language + theme, advance to AI setup ───────
  const handleStep1Next = async () => {
    setIsCompletingStep1(true)
    setSubmitError(null)
    try {
      await preferencesService.updatePreferences({ language: preferredLanguage, theme: selectedTheme })
      setCurrentStep(2)
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Failed to save preferences. Please try again.'))
    } finally {
      setIsCompletingStep1(false)
    }
  }

  // ── Step 2 complete: save AI config + mark onboarding done ──────────
  const handleStep2Complete = async () => {
    setIsCompletingStep2(true)
    setSubmitError(null)
    try {
      if (aiProviderKey || aiModelKey) {
        await preferencesService.updatePreferences({
          ai_provider_key: aiProviderKey || null,
          ai_model_key: aiModelKey || null,
        })
      }
      const updated = await lenserService.updateLenserProfile({
        onboarding_step: 2,
        onboarding_completed_at: new Date().toISOString(),
      })
      queryClient.setQueryData(queryKeys.lenser.authenticated(), updated)
      queryClient.setQueryData(AUTH_PROFILE_GATE_QUERY_KEY, { kind: 'active', status: 'active' })
      await queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_GATE_QUERY_KEY })
      ;(onComplete ?? onClose)()
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Failed to complete setup. Please try again.'))
    } finally {
      setIsCompletingStep2(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      canClose={!requireCompletion}
      onClose={onClose}
      title="Complete Your Profile"
      panelClassName="max-w-xl sm:max-w-2xl"
      contentClassName="px-4 py-5 sm:px-6 sm:py-6"
    >
      <StepWizard
        steps={['Profile', 'Personalization', 'AI Setup']}
        currentStep={currentStep}
        onNext={currentStep === 0 ? handleStep0Next : handleStep1Next}
        onBack={() => setCurrentStep((s) => Math.max(s - 1, 0))}
        onComplete={handleStep2Complete}
        canProceed={currentStep === 0 ? (isHandleUnique && !!displayName.trim()) : true}
        isNextLoading={isSubmittingStep0 || isCompletingStep1}
        isCompleting={isCompletingStep2}
        nextLabel="Continue"
        completeLabel="Finish"
      >
        {currentStep === 0 ? (
          /* ── Step 0: handle + display name ── */
          <div className="space-y-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Claim your unique handle to join the community.
            </p>

            <div>
              <div className="relative">
                <InputField
                  label="Handle"
                  placeholder="e.g. alexandre_ui"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  error={handleError || undefined}
                  className={isHandleUnique ? '!border-green-500 !focus:ring-green-200' : ''}
                />
                <div className="absolute right-3 top-[34px] pointer-events-none">
                  {isCheckingHandle ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : isHandleUnique ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : handleError && handle.length > 0 ? (
                    <X className="w-5 h-5 text-red-500" />
                  ) : null}
                </div>
              </div>

              {suggestions.length > 0 && (
                <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                  <p className="text-xs text-gray-500 mb-2">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setHandle(s)}
                        className="px-3 py-1 bg-gray-50 hover:bg-primary/20 hover:text-gray-900 border border-gray-200 rounded-full text-xs font-medium text-gray-600 transition-colors"
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isCheckingHandle && !handleError && handle.length >= 4 && suggestions.length === 0 && (
                <p className="mt-2 text-xs text-gray-400">Checking availability…</p>
              )}
            </div>

            <InputField
              label="Display Name"
              placeholder="e.g. Alexandre"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />

            {submitError && (
              <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {submitError}
              </div>
            )}
          </div>
        ) : currentStep === 1 ? (
          /* ── Step 1: language + theme ── */
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preferred Language
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Choose the language for content and interface.
              </p>
              <LanguageSelectBox
                value={preferredLanguage}
                onChange={setPreferredLanguage}
                languages={languages}
                isLoading={langsLoading}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Theme
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Choose your preferred colour scheme.
              </p>
              <div className="flex gap-3">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedTheme(opt.value)}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      selectedTheme === opt.value
                        ? 'border-primary bg-primary/10 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {submitError && (
              <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {submitError}
              </div>
            )}
          </div>
        ) : (
          /* ── Step 2: AI configuration (optional) ── */
          <div className="space-y-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Optionally set your preferred AI provider and model. You can change this later in Settings.
            </p>

            <SearchSelectField
              label="Provider"
              value={aiProviderKey}
              onChange={(val) => { setAiProviderKey(val); setAiModelKey('') }}
              options={providers.map((p) => ({ value: p.key, label: p.display_name }))}
              placeholder="Select a provider (optional)"
              searchPlaceholder="Search providers..."
              disabled={isLoadingProviders}
            />

            {aiProviderKey && (
              <SearchSelectField
                label="Model"
                value={aiModelKey}
                onChange={setAiModelKey}
                options={providerModels.map((m) => ({ value: m.key, label: m.name }))}
                placeholder="Select a model (optional)"
                searchPlaceholder="Search models..."
                disabled={isLoadingModels}
              />
            )}

            {submitError && (
              <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {submitError}
              </div>
            )}
          </div>
        )}
      </StepWizard>
    </Modal>
  )
}
