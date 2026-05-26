import { useAuth } from '@lenserfight/features/auth/native'
import { useLenser } from '@lenserfight/features/profile/native'
import { ErrorState, LoadingState, MobileButton } from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Surface, Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View, Pressable, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthSheet } from '../../context/AuthSheetContext'
import { screenStyles } from '../../styles/screenStyles'

export const ProfileScreen: React.FC<{ onSignedOut: () => void }> = ({ onSignedOut }) => {
  const { t } = useTranslation()
  const { isAuthenticated, logout, user } = useAuth()
  const { lenser, isLoading, error } = useLenser()
  const theme = useNativeTheme()
  const { open: openAuthSheet } = useAuthSheet()

  const totalXp = Number(
    (lenser as { total_xp?: number | string | null } | null)?.total_xp ?? lenser?.xp ?? 0
  )
  const currentLevel = Number(lenser?.current_level ?? 1)
  const isDark = theme.colorScheme === 'dark'

  // Experience progress calculation (e.g. levels are every 1000 XP)
  const xpInCurrentLevel = totalXp % 1000
  const xpNeededForNextLevel = 1000
  const progressPercent = Math.min(xpInCurrentLevel / xpNeededForNextLevel, 1)

  const signOut = async () => {
    await logout()
    onSignedOut()
  }

  const shareProfile = async () => {
    if (!lenser) return
    try {
      await Share.share({
        message: `Check out my Lenser profile! Handle: @${lenser.handle}, Level: ${currentLevel}, Total XP: ${totalXp}. Join me on LenserFight!`,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const renderGuestView = () => {
    return (
      <View style={styles.container}>
        {/* Guest Hero Section */}
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
              styles.guestAvatarContainer,
              { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
            ]}
          >
            <Ionicons
              name="person-circle-outline"
              size={64}
              color={theme.surface.textMuted}
            />
          </View>
          <Text variant="h2" weight="bold" align="center" style={{ marginTop: theme.spacing[2] }}>
            Guest Lenser
          </Text>
          <Text variant="bodyM" color="muted" align="center" style={styles.guestSubtitle}>
            Welcome to LenserFight! Sign in to unlock your full potential and join the arena.
          </Text>
        </Surface>

        {/* Benefits Grid */}
        <Text variant="bodyM" weight="bold" style={[styles.sectionTitle, { color: theme.surface.text }]}>
          Unlock Premium Features
        </Text>

        <Surface
          borderRadius={theme.radius.xl}
          style={[
            styles.benefitsCard,
            {
              padding: theme.spacing[4],
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: theme.surface.borderSubtle,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.benefitRow}>
            <View style={[styles.benefitIconWrap, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' }]}>
              <Ionicons name="flash" size={20} color="#34C759" />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text variant="bodyM" weight="semibold">Arena Battles</Text>
              <Text variant="bodyS" color="muted">Battle other AI agents and compete on the global leaderboard.</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.surface.border }]} />

          <View style={styles.benefitRow}>
            <View style={[styles.benefitIconWrap, { backgroundColor: isDark ? 'rgba(33, 63, 116, 0.25)' : 'rgba(33, 63, 116, 0.1)' }]}>
              <Ionicons name="chatbubbles" size={20} color={theme.colors.primaryNavy} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text variant="bodyM" weight="semibold">Interactive Threads</Text>
              <Text variant="bodyS" color="muted">Create rich discussion threads and share thoughts with lensers.</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.surface.border }]} />

          <View style={styles.benefitRow}>
            <View style={[styles.benefitIconWrap, { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.15)' : 'rgba(175, 82, 222, 0.1)' }]}>
              <Ionicons name="telescope" size={20} color="#AF52DE" />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text variant="bodyM" weight="semibold">Custom Lenses</Text>
              <Text variant="bodyS" color="muted">Discover and analyze complex agent configurations.</Text>
            </View>
          </View>
        </Surface>

        {/* Call to Action */}
        <View style={styles.ctaContainer}>
          <MobileButton
            label="Sign In / Register"
            onPress={() => openAuthSheet('login')}
            variant="primary"
            fullWidth
            size="lg"
            testID="guest-signin-btn"
          />
        </View>
      </View>
    )
  }

  const renderAuthenticatedView = () => {
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
              {user?.email}
            </Text>
            <View style={{ marginTop: 24, width: '100%' }}>
              <MobileButton label={t('profile.signOut')} onPress={signOut} variant="danger" fullWidth />
            </View>
          </Surface>
        </View>
      )
    }

    const displayName = lenser.display_name ?? lenser.handle ?? 'Lenser'
    const initials = displayName.slice(0, 2).toUpperCase()

    return (
      <View style={styles.container}>
        {/* User Hero Section */}
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
          {/* Circular initials avatar */}
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

          {/* Experience Progress Bar */}
          <View style={styles.xpProgressContainer}>
            <View style={styles.xpProgressHeader}>
              <Text variant="caption" weight="semibold">XP Progress</Text>
              <Text variant="caption" color="muted">{xpInCurrentLevel} / {xpNeededForNextLevel} XP</Text>
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

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Level Stat Card */}
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
            <Text variant="caption" color="muted">LEVEL</Text>
            <Text variant="h3" weight="bold" style={{ marginTop: 4 }}>
              {String(currentLevel)}
            </Text>
          </Surface>

          {/* XP Stat Card */}
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
            <Text variant="caption" color="muted">TOTAL XP</Text>
            <Text variant="h3" weight="bold" style={{ marginTop: 4 }}>
              {String(totalXp)}
            </Text>
          </Surface>

          {/* Rank Stat Card */}
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
            <Text variant="caption" color="muted">RANK</Text>
            <Text variant="bodyM" weight="bold" style={{ marginTop: 6, color: theme.active }}>
              Bronze Lenser
            </Text>
          </Surface>
        </View>

        {/* Action Menu */}
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
          {/* Share Profile */}
          <Pressable
            onPress={shareProfile}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
            ]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="share-outline" size={20} color={theme.surface.text} />
              <Text variant="bodyM" style={{ marginLeft: 12 }}>Share Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.surface.textMuted} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.surface.border }]} />

          {/* Achievements (mock) */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
            ]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="medal-outline" size={20} color={theme.surface.text} />
              <Text variant="bodyM" style={{ marginLeft: 12 }}>My Achievements</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.surface.textMuted} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.surface.border }]} />

          {/* Help & Support (mock) */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
            ]}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={20} color={theme.surface.text} />
              <Text variant="bodyM" style={{ marginLeft: 12 }}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.surface.textMuted} />
          </Pressable>
        </Surface>

        {/* Sign Out Button */}
        <View style={styles.signOutButtonWrap}>
          <MobileButton label={t('profile.signOut')} onPress={signOut} variant="danger" fullWidth />
        </View>
      </View>
    )
  }

  return (
    <SafeAreaContainer testID="profile-screen">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={screenStyles.scroll}
      >
        {isAuthenticated ? renderAuthenticatedView() : renderGuestView()}
      </ScrollView>
    </SafeAreaContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  heroCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guestAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  guestSubtitle: {
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  xpProgressContainer: {
    width: '100%',
    marginTop: 12,
    gap: 6,
  },
  xpProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  statCard: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: -4,
  },
  benefitsCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextWrap: {
    flex: 1,
    gap: 2,
  },
  menuCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  ctaContainer: {
    marginTop: 8,
    width: '100%',
  },
  signOutButtonWrap: {
    marginTop: 12,
    width: '100%',
  },
})
