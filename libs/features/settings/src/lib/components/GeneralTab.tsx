import { lenserService } from '@lenserfight/data/repositories'
import { preferencesService } from '@lenserfight/data/repositories'
import { useLenser } from '@lenserfight/features/profile'
import { LenserPreferences } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { SearchSelectField, SelectField } from '@lenserfight/ui/forms'
import { useTheme } from '@lenserfight/ui/theme'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export const GeneralTab: React.FC = () => {
  const { i18n, t } = useTranslation()
  const contentVisibilityOptions = [
    { value: 'public', label: t('settings.privacy.public') },
    { value: 'community', label: t('settings.privacy.community') },
    { value: 'private', label: t('settings.privacy.private') },
  ]
  const { lenser } = useLenser()
  const queryClient = useQueryClient()
  const { setTheme: applyTheme } = useTheme()

  const { data: languages = [] } = useQuery({
    queryKey: ['core', 'languages'],
    queryFn: () => lenserService.getLanguages(),
    staleTime: Infinity,
  })

  const { data: preferences } = useQuery<LenserPreferences | null>({
    queryKey: ['preferences'],
    queryFn: () => preferencesService.getPreferences(),
    staleTime: 1000 * 60 * 5,
  })

  const currentLanguage = preferences?.language ?? lenser?.preferences?.language ?? lenser?.preferred_language ?? 'en'
  const currentTheme = preferences?.theme ?? 'system'
  const currentContentVisibility = preferences?.content_visibility ?? 'public'
  const currentEmailDigest = preferences?.email_digest ?? true
  const currentHideActions = preferences?.hide_actions ?? false

  const [language, setLanguage] = useState(currentLanguage)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(currentTheme)
  const [contentVisibility, setContentVisibility] = useState<'public' | 'community' | 'private'>(currentContentVisibility)
  const [emailDigest, setEmailDigest] = useState(currentEmailDigest)
  const [hideActions, setHideActions] = useState(currentHideActions)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (preferences) {
      setLanguage(preferences.language)
      setTheme(preferences.theme)
      setContentVisibility(preferences.content_visibility)
      setEmailDigest(preferences.email_digest)
      setHideActions(preferences.hide_actions)
    } else if (lenser) {
      setLanguage(lenser.preferences?.language ?? lenser.preferred_language ?? 'en')
    }
  }, [preferences, lenser])

  const isDirty =
    language !== currentLanguage ||
    theme !== currentTheme ||
    contentVisibility !== currentContentVisibility ||
    emailDigest !== currentEmailDigest ||
    hideActions !== currentHideActions

  const handleReset = () => {
    setLanguage(currentLanguage)
    setTheme(currentTheme)
    setContentVisibility(currentContentVisibility)
    setEmailDigest(currentEmailDigest)
    setHideActions(currentHideActions)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await preferencesService.updatePreferences({
        language,
        theme,
        content_visibility: contentVisibility,
        email_digest: emailDigest,
        hide_actions: hideActions,
      })
      if (language !== currentLanguage) {
        await i18n.changeLanguage(language)
        document.documentElement.lang = language
      }
      if (theme !== currentTheme) {
        applyTheme(theme)
      }
      await queryClient.invalidateQueries({ queryKey: ['preferences'] })
    } catch (e) {
      console.error('Failed to save general preferences', e)
      alert('Failed to save preferences.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">General</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
        Language, appearance, and content defaults.
      </p>

      <div className="space-y-8">
        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Language
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Prioritizes prompts, threads, and recommendations in your language. Also updates the interface language for this session.
          </p>
          <SearchSelectField
            value={language}
            onChange={setLanguage}
            options={languages.map((l) => ({ value: l.code, label: l.native_name || l.name }))}
            searchPlaceholder="Search language…"
            placeholder="Select language"
          />
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`flex flex-col items-center gap-2 p-4 border rounded-xl text-sm font-medium transition-all capitalize ${
                  theme === t
                    ? 'border-primary bg-primary/5 ring-1 ring-primary text-gray-900 dark:text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-base">
                  {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}
                </span>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content Visibility Default */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Default Content Visibility
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Applied to new prompts and threads you create.
          </p>
          <SelectField
            value={contentVisibility}
            onChange={(v) => setContentVisibility(v as typeof contentVisibility)}
            options={contentVisibilityOptions}
          />
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Preferences
          </label>

          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email digest</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Receive a weekly summary of activity and highlights.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailDigest}
              onClick={() => setEmailDigest((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                emailDigest ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  emailDigest ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hide actions</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Hide quick-action buttons on prompts and threads until you hover.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hideActions}
              onClick={() => setHideActions((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                hideActions ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  hideActions ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={handleReset}
          disabled={isSaving || !isDirty}
        >
          Reset
        </Button>
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          className="w-full sm:w-auto px-6 bg-primary hover:bg-yellow-400"
          disabled={!isDirty}
        >
          Save changes
        </Button>
      </div>
    </div>
  )
}
