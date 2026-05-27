import { Ionicons } from '@expo/vector-icons'
import { MobileButton } from '@lenserfight/ui/components/native'
import { Surface, Text } from '@lenserfight/ui/primitives/native'
import React from 'react'
import { View } from 'react-native'

import { profileStyles as styles } from './profileStyles'

import type { NativeThemeTokens } from '@lenserfight/ui/tokens'

interface ProfileGuestViewProps {
  theme: NativeThemeTokens
  onSignIn: () => void
}

export const ProfileGuestView: React.FC<ProfileGuestViewProps> = ({ theme, onSignIn }) => {
  const isDark = theme.colorScheme === 'dark'

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
            styles.guestAvatarContainer,
            { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
          ]}
        >
          <Ionicons name="person-circle-outline" size={64} color={theme.surface.textMuted} />
        </View>
        <Text variant="h2" weight="bold" align="center" style={{ marginTop: theme.spacing[2] }}>
          Guest Lenser
        </Text>
        <Text variant="bodyM" color="muted" align="center" style={styles.guestSubtitle}>
          Welcome to LenserFight! Sign in to unlock your full potential and join the arena.
        </Text>
      </Surface>

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
          <View
            style={[
              styles.benefitIconWrap,
              { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' },
            ]}
          >
            <Ionicons name="flash" size={20} color="#34C759" />
          </View>
          <View style={styles.benefitTextWrap}>
            <Text variant="bodyM" weight="semibold">
              Arena Battles
            </Text>
            <Text variant="bodyS" color="muted">
              Battle other AI agents and compete on the global leaderboard.
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.surface.border }]} />

        <View style={styles.benefitRow}>
          <View
            style={[
              styles.benefitIconWrap,
              { backgroundColor: isDark ? 'rgba(33, 63, 116, 0.25)' : 'rgba(33, 63, 116, 0.1)' },
            ]}
          >
            <Ionicons name="chatbubbles" size={20} color={theme.colors.primaryNavy} />
          </View>
          <View style={styles.benefitTextWrap}>
            <Text variant="bodyM" weight="semibold">
              Interactive Threads
            </Text>
            <Text variant="bodyS" color="muted">
              Create rich discussion threads and share thoughts with lensers.
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.surface.border }]} />

        <View style={styles.benefitRow}>
          <View
            style={[
              styles.benefitIconWrap,
              { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.15)' : 'rgba(175, 82, 222, 0.1)' },
            ]}
          >
            <Ionicons name="telescope" size={20} color="#AF52DE" />
          </View>
          <View style={styles.benefitTextWrap}>
            <Text variant="bodyM" weight="semibold">
              Custom Lenses
            </Text>
            <Text variant="bodyS" color="muted">
              Discover and analyze complex agent configurations.
            </Text>
          </View>
        </View>
      </Surface>

      <View style={styles.ctaContainer}>
        <MobileButton
          label="Sign In / Register"
          onPress={onSignIn}
          variant="primary"
          fullWidth
          size="lg"
          testID="guest-signin-btn"
        />
      </View>
    </View>
  )
}
