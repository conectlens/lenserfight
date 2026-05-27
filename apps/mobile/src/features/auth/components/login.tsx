import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@lenserfight/features/auth/native'
import { MobileButton } from '@lenserfight/ui/components/native'
import { InlineNotice } from '@lenserfight/ui/feedback/native'
import { Field, Input } from '@lenserfight/ui/forms/native'
import { Pressable } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { authFormStyles } from './authFormStyles'
import { AuthLayout } from './AuthLayout'
import { OAuthButtons } from './OAuthButtons'
import { PrivacyNotice } from './PrivacyNotice'

import type { AuthSheetProps } from './types'

export const LoginScreen: React.FC<AuthSheetProps> = ({
  onAuthenticated,
  onMagicLink,
  onRegister,
}) => {
  const { t } = useTranslation()
  const { login, signInWithOAuth } = useAuth()
  const theme = useNativeTheme()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const submit = async () => {
    setError(null)
    if (!identifier.trim() || !password) {
      setError(t('auth.required'))
      return
    }
    setLoading(true)
    try {
      await login(identifier, password)
      onAuthenticated()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.genericError'))
    } finally {
      setLoading(false)
    }
  }

  const oauth = async (provider: 'google' | 'github' | 'apple') => {
    setError(null)
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
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <Field
        label={t('auth.emailOrHandle')}
        error={!identifier && error ? t('auth.required') : undefined}
      >
        <Input
          value={identifier}
          onChangeText={setIdentifier}
          placeholder={t('auth.emailOrHandlePlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          testID="login-email"
          startAdornment={
            <Ionicons name="person-outline" size={18} color={theme.surface.textMuted} />
          }
        />
      </Field>
      <Field label={t('auth.password')} error={!password && error ? t('auth.required') : undefined}>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.passwordPlaceholder')}
          secureTextEntry={!showPassword}
          textContentType="password"
          testID="login-password"
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
        label={t('auth.signIn')}
        onPress={submit}
        loading={loading}
        disabled={!identifier.trim() || !password}
        testID="login-submit"
      />
      <OAuthButtons disabled={loading} loading={loading} onOAuth={oauth} />
      <View style={authFormStyles.links}>
        <MobileButton label={t('auth.magicLink')} onPress={onMagicLink} variant="ghost" />
        <MobileButton label={t('auth.newAccount')} onPress={onRegister} variant="ghost" />
      </View>
      <PrivacyNotice />
    </AuthLayout>
  )
}
