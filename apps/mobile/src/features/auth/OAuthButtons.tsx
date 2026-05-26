import React from 'react'
import { StyleSheet, View, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'

type Provider = 'google' | 'github' | 'apple'

interface OAuthButtonsProps {
  disabled?: boolean
  loading?: boolean
  onOAuth: (provider: Provider) => void
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ disabled, loading, onOAuth }) => {
  const { t } = useTranslation()
  const theme = useNativeTheme()
  const isDark = theme.colorScheme === 'dark'

  const isBtnDisabled = disabled || loading

  return (
    <View style={styles.wrap}>
      {/* Centered beautiful divider */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: theme.surface.border }]} />
        <Text variant="caption" color="muted" style={styles.dividerText}>
          {t('auth.oauthDivider')}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.surface.border }]} />
      </View>

      {/* Side-by-side centrified Google & GitHub Buttons */}
      <View style={styles.grid}>
        {/* Google Button */}
        <Pressable
          onPress={() => !isBtnDisabled && onOAuth('google')}
          disabled={isBtnDisabled}
          style={({ pressed }) => [
            styles.halfBtn,
            {
              backgroundColor: isDark
                ? pressed ? '#3A3A3C' : '#2C2C2E'
                : pressed ? '#F2F2F7' : '#FFFFFF',
              borderColor: isDark ? '#3C3C3E' : '#D1D1D6',
              borderRadius: theme.radius.lg,
              opacity: isBtnDisabled ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons
            name="logo-google"
            size={18}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
          <Text
            variant="bodyM"
            weight="semibold"
            style={{ color: isDark ? '#FFFFFF' : '#1C1C1E', marginLeft: 8 }}
          >
            Google
          </Text>
        </Pressable>

        {/* GitHub Button */}
        <Pressable
          onPress={() => !isBtnDisabled && onOAuth('github')}
          disabled={isBtnDisabled}
          style={({ pressed }) => [
            styles.halfBtn,
            {
              backgroundColor: isDark
                ? pressed ? '#2C2C2E' : '#181717'
                : pressed ? '#F2F2F7' : '#FFFFFF',
              borderColor: isDark ? '#3C3C3E' : '#D1D1D6',
              borderRadius: theme.radius.lg,
              opacity: isBtnDisabled ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons
            name="logo-github"
            size={18}
            color={isDark ? '#FFFFFF' : '#181717'}
          />
          <Text
            variant="bodyM"
            weight="semibold"
            style={{ color: isDark ? '#FFFFFF' : '#1C1C1E', marginLeft: 8 }}
          >
            GitHub
          </Text>
        </Pressable>
      </View>

      {/* Sign in with Apple Button following Human Interface Guidelines */}
      <Pressable
        onPress={() => !isBtnDisabled && onOAuth('apple')}
        disabled={isBtnDisabled}
        style={({ pressed }) => [
          styles.appleBtn,
          {
            backgroundColor: isDark
              ? pressed ? '#E5E5EA' : '#FFFFFF'
              : pressed ? '#2C2C2E' : '#000000',
            borderRadius: theme.radius.lg,
            opacity: isBtnDisabled ? 0.6 : 1,
          },
        ]}
      >
        <Ionicons
          name="logo-apple"
          size={18}
          color={isDark ? '#000000' : '#FFFFFF'}
        />
        <Text
          variant="bodyM"
          weight="semibold"
          style={{
            color: isDark ? '#000000' : '#FFFFFF',
            marginLeft: 8,
          }}
        >
          Sign in with Apple
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    marginTop: 12,
    alignSelf: 'stretch',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 10,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  halfBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  appleBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
})
