import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@lenserfight/features/auth/native'
import { MobileButton } from '@lenserfight/ui/components/native'
import { Field, Input } from '@lenserfight/ui/forms/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from './AuthLayout'
import { isEmail } from './isEmail'
import type { AuthSheetProps } from './types'

export const MagicLinkScreen: React.FC<AuthSheetProps> = ({ onLogin }) => {
  const { t } = useTranslation()
  const { sendMagicLink } = useAuth()
  const theme = useNativeTheme()
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
    <AuthLayout
      title={sent ? t('auth.checkInbox') : t('auth.magicTitle')}
      subtitle={t('auth.magicSubtitle')}
    >
      {sent ? (
        <>
          <Text variant="bodyM" color="muted">
            {t('auth.magicSent')}
          </Text>
          <MobileButton
            label={t('auth.sendAgain')}
            onPress={() => setSent(false)}
            variant="secondary"
          />
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
              startAdornment={
                <Ionicons name="mail-outline" size={18} color={theme.surface.textMuted} />
              }
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
