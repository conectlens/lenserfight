import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@lenserfight/features/auth/native'
import { MobileButton } from '@lenserfight/ui/components/native'
import { InlineNotice } from '@lenserfight/ui/feedback/native'
import { Field, Input } from '@lenserfight/ui/forms/native'
import { Pressable } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from './AuthLayout'
import { isEmail } from './isEmail'
import { OAuthButtons } from './OAuthButtons'
import { PrivacyNotice } from './PrivacyNotice'

import type { AuthSheetProps } from './types'

export const RegisterScreen: React.FC<AuthSheetProps> = ({ onAuthenticated, onLogin }) => {
  const { t } = useTranslation()
  const { register, signInWithOAuth } = useAuth()
  const theme = useNativeTheme()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const submit = async () => {
    setError(null)
    if (!displayName.trim() || !isEmail(email)) {
      setError(!isEmail(email) ? t('auth.invalidEmail') : t('auth.required'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.passwordShort'))
      return
    }
    setLoading(true)
    try {
      await register(email, password, { displayName, preferredLanguage: 'en' })
      onAuthenticated()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.genericError'))
    } finally {
      setLoading(false)
    }
  }

  const oauth = async (provider: 'google' | 'github' | 'apple') => {
    setLoading(true)
    try {
      await signInWithOAuth(provider)
    } catch {
      setError(t('auth.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <Field label={t('auth.displayName')}>
        <Input
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t('auth.displayNamePlaceholder')}
          textContentType="name"
          testID="register-name"
          startAdornment={
            <Ionicons name="person-outline" size={18} color={theme.surface.textMuted} />
          }
        />
      </Field>
      <Field label={t('auth.email')}>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          testID="register-email"
          startAdornment={
            <Ionicons name="mail-outline" size={18} color={theme.surface.textMuted} />
          }
        />
      </Field>
      <Field label={t('auth.password')}>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.passwordPlaceholder')}
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          testID="register-password"
          startAdornment={
            <Ionicons name="lock-closed-outline" size={18} color={theme.surface.textMuted} />
          }
          endAdornment={
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.surface.textMuted}
              />
            </Pressable>
          }
        />
      </Field>
      {error && <InlineNotice variant="error" message={error} />}
      <MobileButton
        label={t('auth.register')}
        onPress={submit}
        loading={loading}
        disabled={!displayName.trim() || !email.trim() || !password}
        testID="register-submit"
      />
      <OAuthButtons disabled={loading} loading={loading} onOAuth={oauth} />
      <MobileButton label={t('auth.alreadyAccount')} onPress={onLogin} variant="ghost" />
      <PrivacyNotice />
    </AuthLayout>
  )
}
