import React, { useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { useAuth } from '@lenserfight/features/auth/native'
import { Field, Input } from '@lenserfight/ui/forms/native'
import { InlineNotice } from '@lenserfight/ui/feedback/native'
import { Pressable, Text } from '@lenserfight/ui/primitives/native'
import { useTranslation } from 'react-i18next'
import { WEB_BASE_URL } from '@lenserfight/utils/env'
import { MobileButton } from '../../ui/MobileButton'
import { AuthLayout } from './AuthLayout'
import { OAuthButtons } from './OAuthButtons'

const PrivacyNotice: React.FC = () => {
  const { t } = useTranslation()
  return (
    <View style={styles.privacyRow}>
      <Text variant="caption" color="muted">{t('auth.privacyNotice')} </Text>
      <Pressable onPress={() => Linking.openURL(`${WEB_BASE_URL}/privacy`)} accessibilityRole="link">
        <Text variant="caption" color="muted" style={styles.link}>{t('auth.privacy')}</Text>
      </Pressable>
      <Text variant="caption" color="muted"> & </Text>
      <Pressable onPress={() => Linking.openURL(`${WEB_BASE_URL}/terms`)} accessibilityRole="link">
        <Text variant="caption" color="muted" style={styles.link}>{t('auth.terms')}</Text>
      </Pressable>
    </View>
  )
}

interface AuthScreenProps {
  onAuthenticated: () => void
  onMagicLink: () => void
  onRegister: () => void
  onLogin: () => void
}

const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const LoginScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onMagicLink,
  onRegister,
}) => {
  const { t } = useTranslation()
  const { login, signInWithOAuth } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <Field label={t('auth.emailOrHandle')} error={!identifier && error ? t('auth.required') : undefined}>
        <Input
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          testID="login-email"
        />
      </Field>
      <Field label={t('auth.password')} error={!password && error ? t('auth.required') : undefined}>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          testID="login-password"
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
      <View style={styles.links}>
        <MobileButton label={t('auth.magicLink')} onPress={onMagicLink} variant="ghost" />
        <MobileButton label={t('auth.newAccount')} onPress={onRegister} variant="ghost" />
      </View>
      <PrivacyNotice />
    </AuthLayout>
  )
}

export const MagicLinkScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { t } = useTranslation()
  const { sendMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!isEmail(email)) {
      setError(t('auth.invalidEmail'))
      return
    }
    setLoading(true)
    try {
      await sendMagicLink(email)
      setSent(true)
    } catch {
      setError(t('auth.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={sent ? t('auth.checkInbox') : t('auth.magicTitle')} subtitle={t('auth.magicSubtitle')}>
      {sent ? (
        <>
          <Text variant="bodyM" color="muted">
            {t('auth.magicSent')}
          </Text>
          <MobileButton label={t('auth.sendAgain')} onPress={() => setSent(false)} variant="secondary" />
          <MobileButton label={t('auth.backToLogin')} onPress={onLogin} variant="ghost" />
        </>
      ) : (
        <>
          <Field label={t('auth.email')} error={error ?? undefined}>
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              testID="magic-email"
            />
          </Field>
          <MobileButton
            label={t('auth.sendMagic')}
            onPress={submit}
            loading={loading}
            disabled={!email.trim()}
            testID="magic-submit"
          />
          <MobileButton label={t('auth.backToLogin')} onPress={onLogin} variant="ghost" />
        </>
      )}
    </AuthLayout>
  )
}

export const RegisterScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onLogin,
}) => {
  const { t } = useTranslation()
  const { register, signInWithOAuth } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        <Input value={displayName} onChangeText={setDisplayName} textContentType="name" testID="register-name" />
      </Field>
      <Field label={t('auth.email')}>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          testID="register-email"
        />
      </Field>
      <Field label={t('auth.password')}>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          testID="register-password"
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

const styles = StyleSheet.create({
  links: {
    gap: 4,
    marginTop: 4,
  },
  privacyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
  },
  link: {
    textDecorationLine: 'underline',
  },
})
