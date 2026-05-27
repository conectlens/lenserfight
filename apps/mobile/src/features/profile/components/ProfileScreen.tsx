import { Ionicons } from '@expo/vector-icons'
import { ErrorState, LoadingState, MobileButton, SummaryCard } from '@lenserfight/ui/components/native'
import { Surface, Text } from '@lenserfight/ui/primitives/native'
import type { Lenser } from '@lenserfight/types'
import type { NativeThemeTokens } from '@lenserfight/ui/tokens'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { useLenserLenses, useLenserThreads } from '../../../hooks/useMobileContent'
import { profileStyles as styles } from './profileStyles'

type ProfileTab = 'threads' | 'lenses'

const PROFILE_TABS: { id: ProfileTab; labelKey: string; icon: 'chatbubbles-outline' | 'telescope-outline' }[] = [
  { id: 'threads', labelKey: 'tabs.threads', icon: 'chatbubbles-outline' },
  { id: 'lenses', labelKey: 'tabs.lenses', icon: 'telescope-outline' },
]

interface ProfileScreenProps {
  theme: NativeThemeTokens
  lenser: Lenser | null | undefined
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

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
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
  const router = useRouter()
  const isDark = theme.colorScheme === 'dark'
  const [activeTab, setActiveTab] = useState<ProfileTab>('threads')

  const threadsQuery = useLenserThreads(lenser?.handle, lenser?.id)
  const lensesQuery = useLenserLenses(lenser?.handle, lenser?.id)

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
            {t('profile.noProfile')}
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

  const displayName = lenser.display_name ?? lenser.handle
  const initials = displayName.slice(0, 2).toUpperCase()

  const surfaceCard = {
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderColor: theme.surface.borderSubtle,
    borderWidth: 1,
  }

  const activeQuery = activeTab === 'threads' ? threadsQuery : lensesQuery
  const isTabLoading = activeQuery.isLoading

  return (
    <View style={styles.container}>
      {/* ── Hero Card ── */}
      <Surface
        borderRadius={theme.radius.xl}
        style={[styles.heroCard, { padding: theme.spacing[5] }, surfaceCard]}
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
              {t('profile.xp')}
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

      {/* ── Stats Grid ── */}
      <View style={styles.statsGrid}>
        <Surface
          borderRadius={theme.radius.lg}
          style={[styles.statCard, { padding: theme.spacing[3.5] }, surfaceCard]}
        >
          <Ionicons name="trophy" size={20} color="#FFD700" style={styles.statIcon} />
          <Text variant="caption" color="muted">
            {t('profile.level').toUpperCase()}
          </Text>
          <Text variant="h3" weight="bold" style={{ marginTop: 4 }}>
            {String(currentLevel)}
          </Text>
        </Surface>

        <Surface
          borderRadius={theme.radius.lg}
          style={[styles.statCard, { padding: theme.spacing[3.5] }, surfaceCard]}
        >
          <Ionicons name="flash" size={20} color="#FF9500" style={styles.statIcon} />
          <Text variant="caption" color="muted">
            {t('profile.xp').toUpperCase()}
          </Text>
          <Text variant="h3" weight="bold" style={{ marginTop: 4 }}>
            {String(totalXp)}
          </Text>
        </Surface>

        <Surface
          borderRadius={theme.radius.lg}
          style={[styles.statCard, { padding: theme.spacing[3.5] }, surfaceCard]}
        >
          <Ionicons name="shield-checkmark" size={20} color={theme.active} style={styles.statIcon} />
          <Text variant="caption" color="muted">
            RANK
          </Text>
          <Text variant="bodyM" weight="bold" style={{ marginTop: 6, color: theme.active }}>
            {lenser.join_order ? `#${lenser.join_order}` : '—'}
          </Text>
        </Surface>
      </View>

      {/* ── Tab Bar ── */}
      <Surface
        borderRadius={theme.radius.xl}
        style={[styles.menuCard, surfaceCard, { overflow: 'hidden' }]}
      >
        <View style={[styles.tabBar, { borderBottomColor: theme.surface.border }]}>
          {PROFILE_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={({ pressed }) => [
                  styles.tabButton,
                  pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  variant="bodyS"
                  weight={isActive ? 'semibold' : 'regular'}
                  style={{ color: isActive ? theme.active : theme.surface.textMuted }}
                >
                  {t(tab.labelKey)}
                </Text>
                {isActive && (
                  <View style={[styles.tabIndicator, { backgroundColor: theme.active }]} />
                )}
              </Pressable>
            )
          })}
        </View>

        {/* ── Tab Content ── */}
        <View style={[styles.tabContent, { padding: theme.spacing[3] }]}>
          {isTabLoading && (
            <View style={styles.tabEmptyWrap}>
              <ActivityIndicator color={theme.active} />
            </View>
          )}

          {!isTabLoading && activeTab === 'threads' && (
            <>
              {(threadsQuery.data?.length ?? 0) === 0 ? (
                <View style={styles.tabEmptyWrap}>
                  <Text variant="bodyM" color="muted" align="center">
                    {t('threads.empty')}
                  </Text>
                </View>
              ) : (
                threadsQuery.data?.map((thread) => (
                  <SummaryCard
                    key={thread.id}
                    title={thread.title}
                    subtitle={thread.content}
                    meta={`${thread.replyCount} ${t('threads.replies')} · ${thread.reactionCount} ${t('threads.reactions')}`}
                    tags={thread.tags}
                    onPress={() => router.push(`/thread/${thread.id}`)}
                  />
                ))
              )}
            </>
          )}

          {!isTabLoading && activeTab === 'lenses' && (
            <>
              {(lensesQuery.data?.length ?? 0) === 0 ? (
                <View style={styles.tabEmptyWrap}>
                  <Text variant="bodyM" color="muted" align="center">
                    {t('lenses.empty')}
                  </Text>
                </View>
              ) : (
                lensesQuery.data?.map((lens) => (
                  <SummaryCard
                    key={lens.id}
                    title={lens.title}
                    subtitle={lens.description ?? undefined}
                    meta={`${lens.usageCount} ${t('lenses.uses')}`}
                    tags={lens.tags}
                    onPress={() => router.push(`/lens/${lens.id}`)}
                  />
                ))
              )}
            </>
          )}
        </View>
      </Surface>

      {/* ── Account Actions ── */}
      <Surface
        borderRadius={theme.radius.xl}
        style={[styles.menuCard, surfaceCard]}
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
              {t('profile.shareProfile')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.surface.textMuted} />
        </Pressable>
      </Surface>

      {/* ── Sign Out ── */}
      <View style={styles.signOutButtonWrap}>
        <MobileButton label={t('profile.signOut')} onPress={onSignOut} variant="danger" fullWidth />
      </View>
    </View>
  )
}
