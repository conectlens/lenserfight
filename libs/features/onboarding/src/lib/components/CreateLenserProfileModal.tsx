import { queryKeys } from '@lenserfight/data/cache'
import { lenserService, preferencesService } from '@lenserfight/data/repositories'
import { useAuth, sanitizeReturnUrl } from '@lenserfight/features/auth'
import { useHandleCheck, useCreateAgent } from '@lenserfight/features/agents'
import { InputField } from '@lenserfight/ui/forms'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { CreateLenserDTO, Lenser } from '@lenserfight/types'
import { LanguageSelectBox } from '@lenserfight/ui/components'
import { StepWizard } from '@lenserfight/ui/widgets'
import { SearchSelectField } from '@lenserfight/ui/forms'
import { Dialog } from '@lenserfight/ui/overlays'
import { useWizardStep } from '@lenserfight/ui/routing'
import { buildAuthReturnUrl, replaceLocationSafely } from '@lenserfight/utils/dom'
import { AUTH_BASE_URL, WEB_BASE_URL } from '@lenserfight/utils/env'
import { storage } from '@lenserfight/utils/storage'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Check, X, Loader2, User, Palette, Sparkles } from 'lucide-react'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'

const AUTH_PROFILE_GATE_QUERY_KEY = ['lenser', 'auth-profile-gate'] as const

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const THEME_OPTIONS: { value: 'light' | 'dark' | 'system'; label: string }[] = [
  { value: 'system', label: 'System default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/**
 * Onboarding wizard content — rendered inside a `ModalRoute` at `/onboarding`.
 *
 * Step state is URL-driven via `?step=N` (`useWizardStep`).
 * No props needed: auth/navigation are handled internally.
 *
 * On completion, navigates back to `location.state.from` (set by the
 * caller via `navigate('/onboarding', { state: { from: '/some-page' } })`).
 */
export const CreateLenserProfileModal: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  const { step: currentStep, goToStep } = useWizardStep({ maxStep: 3 })

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

  // ── Step 3: Agent creation (optional) ───────────────────────────
  const agentHandle = useHandleCheck(3)
  const [agentDisplayName, setAgentDisplayName] = useState('')
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const createAgent = useCreateAgent(lenser?.id ?? '')

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
  const hasCompletedOnboarding = onboardingStep >= 3
  // Treat a disabled lenser query (non-authenticated) as not loading so the
  // redirect effect below is not blocked when the session is expired/invalid.
  const isLoading = authLoading || (isAuthenticated ? lenserLoading : false)

  const [searchParams] = useSearchParams()
  const returnTo =
    (location.state as { from?: string } | null)?.from ??
    searchParams.get('return_url') ??
    WEB_BASE_URL

  // Security redirect: only authenticated users without a profile reach this
  useEffect(() => {
    if (authLoading || (isAuthenticated ? lenserLoading : false)) return
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(buildAuthReturnUrl(window.location.href))
      window.location.href = `${AUTH_BASE_URL}/login?return_url=${returnUrl}`
    } else if (hasLenser && hasCompletedOnboarding) {
      // returnTo may be an absolute URL (cross-app redirect) — React Router
      // navigate() only handles same-origin paths, so use location.replace for
      // anything that looks like an absolute URL.
      if (returnTo.startsWith('http://') || returnTo.startsWith('https://')) {
        window.location.replace(returnTo)
      } else {
        navigate(returnTo, { replace: true })
      }
    }
  }, [authLoading, lenserLoading, isAuthenticated, hasLenser, hasCompletedOnboarding, navigate, returnTo])

  useEffect(() => {
    if (!hasLenser) return
    if (hasCompletedOnboarding) return
    if (onboardingStep > 0 && currentStep < onboardingStep) {
      goToStep(Math.min(onboardingStep, 3))
    }
  }, [currentStep, hasCompletedOnboarding, hasLenser, onboardingStep, goToStep])

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
        const governance = await lenserService.checkHandle(clean)
        if (governance.verdict === 'deny') {
          const reason = governance.class_hit
            ? `This handle is reserved (${governance.class_hit}). Please choose a different one.`
            : 'This handle is reserved or protected. Please choose a different one.'
          setHandleError(reason)
          setSuggestions([])
          setIsHandleUnique(false)
          return
        }

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

  // Guard: if loaded but no profile yet and navigated past step 0, reset to step 0
  // to prevent fn_lensers_update_preferences from throwing "Profile not found".
  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    if (!hasLenser && currentStep > 0) {
      goToStep(0)
    }
  }, [isLoading, isAuthenticated, hasLenser, currentStep, goToStep])

  const sanitizedReturnTo = sanitizeReturnUrl(returnTo)

  const handleClose = useCallback(() => {
    if (sanitizedReturnTo.startsWith('http://') || sanitizedReturnTo.startsWith('https://')) {
      window.location.replace(sanitizedReturnTo)
    } else {
      navigate(sanitizedReturnTo, { replace: true })
    }
  }, [sanitizedReturnTo, navigate])

  // Hoist steps array before early returns so useMemo is called unconditionally
  const wizardSteps = useMemo(() => [
    {
      label: 'Profile',
      title: 'Create Your Profile',
      description: 'Set up your identity on LenserFight',
      icon: <User size={18} />,
    },
    {
      label: 'Personalization',
      title: 'Personalize Experience',
      description: 'Choose your language and theme preferences',
      icon: <Palette size={18} />,
    },
    {
      label: 'AI Setup',
      title: 'AI Configuration',
      description: 'Optionally configure your AI provider',
      icon: <Sparkles size={18} />,
    },
    {
      label: 'Your Agent',
      title: 'Create an Agent',
      description: 'Deploy your first AI assistant',
      icon: <Bot size={18} />,
    },
  ], [])

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
      goToStep(1)
      await queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_GATE_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: queryKeys.waitingList.status() })
    } catch (err: unknown) {
      // 23505 = unique_violation: profile already exists for this user.
      // Treat it as if creation succeeded — refresh auth gate and advance.
      const isAlreadyExists =
        err != null &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      if (isAlreadyExists) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.lenser.authenticated() })
        await queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_GATE_QUERY_KEY })
        storage.setItem('lenser_has_profile', 'true')
        goToStep(1)
        return
      }
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
    } catch (err: unknown) {
      // "Profile not found" (P0001) means the profile row hasn't landed yet —
      // preferences are non-critical during onboarding so proceed rather than
      // blocking the user on an invisible timing gap.
      const isProfileMissing =
        err != null &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P0001'
      if (!isProfileMissing) {
        setSubmitError(getErrorMessage(err, 'Failed to save preferences. Please try again.'))
        setIsCompletingStep1(false)
        return
      }
      // P0001 — silently ignore, fall through to goToStep(2)
    } finally {
      setIsCompletingStep1(false)
    }
    goToStep(2)
  }

  // ── Step 2 next: save AI config + advance to step 3 ─────────────────
  const handleStep2Next = async () => {
    setIsCompletingStep2(true)
    setSubmitError(null)
    try {
      if (aiProviderKey || aiModelKey) {
        await preferencesService.updatePreferences({
          ai_provider_key: aiProviderKey || null,
          ai_model_key: aiModelKey || null,
        })
      }
      const updated = await lenserService.updateLenserProfile({ onboarding_step: 2 })
      queryClient.setQueryData(queryKeys.lenser.authenticated(), updated)
      goToStep(3)
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Failed to save AI setup. Please try again.'))
    } finally {
      setIsCompletingStep2(false)
    }
  }

  // ── Step 3 complete: optionally create agent + mark onboarding done ──
  const handleStep3Complete = async (skipAgent = false) => {
    setIsCreatingAgent(true)
    setSubmitError(null)
    try {
      if (!skipAgent && agentHandle.normalizedHandle && agentDisplayName.trim() && agentHandle.isHandleUnique) {
        await createAgent.submit(agentHandle.normalizedHandle, agentDisplayName.trim())
      }
      const updated = await lenserService.updateLenserProfile({
        onboarding_step: 3,
        onboarding_completed_at: new Date().toISOString(),
      })
      queryClient.setQueryData(queryKeys.lenser.authenticated(), updated)
      queryClient.setQueryData(AUTH_PROFILE_GATE_QUERY_KEY, { kind: 'active', status: 'active' })
      await queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_GATE_QUERY_KEY })
      replaceLocationSafely(returnTo)
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Failed to complete setup. Please try again.'))
    } finally {
      setIsCreatingAgent(false)
    }
  }

  const handleNext = () => {
    if (currentStep === 0) return handleStep0Next()
    if (currentStep === 1) return handleStep1Next()
    if (currentStep === 2) return handleStep2Next()
    return handleStep3Complete()
  }

  const canProceedForStep =
    currentStep === 0 ? (isHandleUnique && !!displayName.trim()) : true

  return (

    <StepWizard
      steps={wizardSteps as any}
      currentStep={currentStep}
      onNext={handleNext}
      onBack={() => goToStep(Math.max(currentStep - 1, 0))}
      onComplete={() => handleStep3Complete()}
      onClose={handleClose}
      canProceed={canProceedForStep}
      isNextLoading={isSubmittingStep0 || isCompletingStep1 || isCompletingStep2}
      isCompleting={isCreatingAgent}
      nextLabel="Continue"
      completeLabel="Finish"
      skipButton={
        currentStep === 1
          ? { label: 'Skip for now', onClick: () => goToStep(2) }
          : currentStep === 2
            ? { label: 'Skip for now', onClick: () => handleStep2Next() }
            : currentStep === 3
              ? { label: 'Skip for now', onClick: () => handleStep3Complete(true) }
              : undefined
      }
    >
      {currentStep === 0 ? (
        /* ── Step 0: handle + display name ── */
        <div className="space-y-5">
          <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
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
                  <Loader2 className="w-5 h-5 text-greyscale-400 animate-spin" />
                ) : isHandleUnique ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : handleError && handle.length > 0 ? (
                  <X className="w-5 h-5 text-red-500" />
                ) : null}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                <p className="text-xs text-greyscale-500 mb-2">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setHandle(s)}
                      className="px-3 py-1 bg-greyscale-25 hover:bg-primary/20 hover:text-greyscale-900 border border-surface-border rounded-full text-xs font-medium text-greyscale-600 transition-colors"
                    >
                      @{s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isCheckingHandle && !handleError && handle.length >= 4 && suggestions.length === 0 && (
              <p className="mt-2 text-xs text-greyscale-400">Checking availability…</p>
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
            <div className="text-[var(--cl-status-red)] text-sm bg-[var(--cl-status-red)]/8 dark:bg-[var(--cl-status-red)]/10 p-3 rounded-lg border border-[var(--cl-status-red)]/20">
              {submitError}
            </div>
          )}
        </div>
      ) : currentStep === 1 ? (
        /* ── Step 1: language + theme ── */
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1">
              Preferred Language
            </p>
            <p className="text-xs text-greyscale-500 dark:text-greyscale-400 mb-3">
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
            <p className="text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1">
              Theme
            </p>
            <p className="text-xs text-greyscale-500 dark:text-greyscale-400 mb-3">
              Choose your preferred colour scheme.
            </p>
            <div className="flex gap-3">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedTheme(opt.value)}
                  className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${selectedTheme === opt.value
                    ? 'border-primary bg-primary/10 text-greyscale-900 dark:text-greyscale-0'
                    : 'border-surface-border text-greyscale-500 dark:text-greyscale-400 hover:border-greyscale-400 dark:hover:border-greyscale-500'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {submitError && (
            <div className="text-[var(--cl-status-red)] text-sm bg-[var(--cl-status-red)]/8 dark:bg-[var(--cl-status-red)]/10 p-3 rounded-lg border border-[var(--cl-status-red)]/20">
              {submitError}
            </div>
          )}
        </div>
      ) : currentStep === 2 ? (
        /* ── Step 2: AI configuration (optional) ── */
        <div className="space-y-5">
          <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
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
            <div className="text-[var(--cl-status-red)] text-sm bg-[var(--cl-status-red)]/8 dark:bg-[var(--cl-status-red)]/10 p-3 rounded-lg border border-[var(--cl-status-red)]/20">
              {submitError}
            </div>
          )}
        </div>
      ) : (
        /* ── Step 3: Agent creation (optional) ── */
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-raised border border-surface-border">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-yellow-500/10">
              <Bot size={18} className="text-primary-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                Create your first AI Agent
              </p>
              <p className="text-xs text-greyscale-500 dark:text-greyscale-400">
                Agents can be @mentioned in threads and run workflows on your behalf.
              </p>
            </div>
          </div>

          <InputField
            label="Agent Display Name"
            placeholder="e.g. My Assistant"
            value={agentDisplayName}
            onChange={(e) => setAgentDisplayName(e.target.value)}
          />

          <div>
            <div className="relative">
              <InputField
                label="Agent Handle"
                placeholder="e.g. my_assistant"
                value={agentHandle.handle}
                onChange={(e) => agentHandle.setHandle(e.target.value.toLowerCase().replace(/\s/g, ''))}
                error={agentHandle.handleError || undefined}
                className={agentHandle.isHandleUnique ? '!border-green-500 !focus:ring-green-200' : ''}
              />
              <div className="absolute right-3 top-[34px] pointer-events-none">
                {agentHandle.isCheckingHandle ? (
                  <Loader2 className="w-5 h-5 text-greyscale-400 animate-spin" />
                ) : agentHandle.isHandleUnique ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : agentHandle.handleError && agentHandle.handle.length > 0 ? (
                  <X className="w-5 h-5 text-red-500" />
                ) : null}
              </div>
            </div>

            {agentHandle.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {agentHandle.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => agentHandle.setHandle(s)}
                    className="px-3 py-1 bg-greyscale-25 hover:bg-primary/20 border border-surface-border rounded-full text-xs font-medium text-greyscale-600 transition-colors"
                  >
                    @{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {createAgent.error && (
            <div className="text-[var(--cl-status-red)] text-sm bg-[var(--cl-status-red)]/8 dark:bg-[var(--cl-status-red)]/10 p-3 rounded-lg border border-[var(--cl-status-red)]/20">
              {createAgent.error}
            </div>
          )}
          {submitError && (
            <div className="text-[var(--cl-status-red)] text-sm bg-[var(--cl-status-red)]/8 dark:bg-[var(--cl-status-red)]/10 p-3 rounded-lg border border-[var(--cl-status-red)]/20">
              {submitError}
            </div>
          )}
        </div>
      )}
    </StepWizard>
  )
}
