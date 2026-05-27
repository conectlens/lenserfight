import { Ionicons } from '@expo/vector-icons'
import { ErrorState, LoadingState, MobileButton } from '@lenserfight/ui/components/native'
import { Surface, Text } from '@lenserfight/ui/primitives/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'

import { profileStyles as styles } from './profileStyles'

import type { NativeThemeTokens } from '@lenserfight/ui/tokens'

interface LenserProfile {
  display_name?: string | null
  handle?: string | null
}

interface ProfileAuthenticatedScreenProps {
  theme: NativeThemeTokens
  lenser: LenserProfile | null | undefined
  userEmail?: string | null
  isLoading: boolean
  error: string | null | undefined
  currentLevel: number
  totalXp: number
  xpInCurrentLevel: number
  xpNeededForNextLevel: number
  progressPercent: number
  onSignOut: () => void
  onShareProfile: () => void
}

export const ProfileAuthenticatedScreen: React.FC<ProfileAuthenticatedScreenProps> = ({
  theme,
  lenser,
  userEmail,
  isLoading,
  error,
  currentLevel,
  totalXp,
  xpInCurrentLevel,
  xpNeededForNextLevel,
  progressPercent,
  onSignOut,
  onShareProfile,
}) => {
  const { t } = useTranslation()
  const isDark = theme.colorScheme === 'dark'

  if (isLoading) return <LoadingState label={t('states.loading')} />
  if (error) return <ErrorState message={error} fallbackMessage={t('states.error')} />
  if (!lenser) {
    return (
      <View style={styles.container}>
        <Surface
          borderRadius={theme.radius.xl}
          style={[
            styles.heroCard,
            {
              padding: theme.spacing[5],
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            },
          ]}
        >
          <Text variant="h3" weight="bold" align="center">
            No Profile Found
          </Text>
          <Text variant="bodyM" color="muted" align="center" style={{ marginTop: 8 }}>
            {userEmail}
          </Text>
          <View style={{ marginTop: 24, width: '100%' }}>
            <MobileButton label={t('profile.signOut')} onPress={onSignOut} variant="danger" fullWidth />
          </View>
        </Surface>
      </View>
    )
  }

  const displayName = lenser.display_name ?? lenser.handle ?? 'Lenser'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <View style={styles.container}>
      <Surface
        borderRadius={theme.radius.xl}
        style={[
          styles.heroCard,
          {
            padding: theme.spacing[5],
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.surface.borderSubtle,
            borderWidth: 1,
          },
        ]}
      >
        <View
          style={[
            styles.avatarContainer,
            {
              backgroundColor: theme.active,
              borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
            },
          ]}
        >
          <Text variant="h2" weight="bold" style={{ color: isDark ? '#1C1C1E' : '#FFFFFF' }}>
            {initials}
          </Text>
        </View>

        <Text variant="h2" weight="bold" align="center" style={{ marginTop: 8 }}>
          {displayName}
        </Text>
        <Text variant="bodyM" color="muted" align="center">
          @{lenser.handle}
        </Text>

        <View style={styles.xpProgressContainer}>
          <View style={styles.xpProgressHeader}>
            <Text variant="caption" weight="semibold">
              XP Progress
            </Text>
            <Text variant="caption" color="muted">
              {xpInCurrentLevel} / {xpNeededForNextLevel} XP
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.active,
                  width: `${progressPercent * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      </Surface>

      <View style={styles.statsGrid}>
        <Surface
          borderRadius={theme.radius.lg}
          style={[
            styles.statCard,
            {
              padding: theme.spacing[3.5],
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: theme.surface.borderSubtle,
              borderWidth: 1,
            },
          ]}
        >
          <Ionicons name="trophy" size={20} color="#FFD700" style={styles.statIcon} />
          <Text variant="caption" color="muted">
            LEVEL
          </Text>
          <Text variant="h3" weight="bold" style={{ marginTop: 4 }}>
            {String(currentLevel)}
          </Text>
        </Surface>

        <Surface
          borderRadius={theme.radius.lg}
          style={[
            styles.statCard,
            {
              padding: theme.spacing[3.5],
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: theme.surface.borderSubtle,
              borderWidth: 1,
            },
          ]}
        >
          <Ionicons name="flash" size={20} color="#FF9500" style={styles.statIcon} />
          <Text variant="caption" color="muted">
            TOTAL XP
          </Text>
          <Text variant="h3" weight="bold" style={{ marginTop: 4 }}>
            {String(totalXp)}
          </Text>
        </Surface>

        <Surface
          borderRadius={theme.radius.lg}
          style={[
            styles.statCard,
            {
              padding: theme.spacing[3.5],
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: theme.surface.borderSubtle,
              borderWidth: 1,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={20} color={theme.active} style={styles.statIcon} />
          <Text variant="caption" color="muted">
            RANK
          </Text>
          <Text variant="bodyM" weight="bold" style={{ marginTop: 6, color: theme.active }}>
            Bronze Lenser
          </Text>
        </Surface>
      </View>

      <Text variant="bodyM" weight="bold" style={[styles.sectionTitle, { color: theme.surface.text }]}>
        Account Actions
      </Text>

      <Surface
        borderRadius={theme.radius.xl}
        style={[
          styles.menuCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme.surface.borderSubtle,
            borderWidth: 1,
          },
        ]}
      >
        <Pressable
          onPress={onShareProfile}
          style={({ pressed }) => [
            styles.menuItem,
            pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
          ]}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="share-outline" size={20} color={theme.surface.text} />
            <Text variant="bodyM" style={{ marginLeft: 12 }}>
              Share Profile
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.surface.textMuted} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.surface.border }]} />

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
          ]}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="medal-outline" size={20} color={theme.surface.text} />
            <Text variant="bodyM" style={{ marginLeft: 12 }}>
              My Achievements
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.surface.textMuted} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.surface.border }]} />

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
          ]}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={20} color={theme.surface.text} />
            <Text variant="bodyM" style={{ marginLeft: 12 }}>
              Help & Support
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.surface.textMuted} />
        </Pressable>
      </Surface>

      <View style={styles.signOutButtonWrap}>
        <MobileButton label={t('profile.signOut')} onPress={onSignOut} variant="danger" fullWidth />
      </View>
    </View>
  )
}
