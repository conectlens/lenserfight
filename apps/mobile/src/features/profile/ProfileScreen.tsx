import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useAuth } from '@lenserfight/features/auth/native'
import { useLenser } from '@lenserfight/features/profile/native'
import { Surface, Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { useTranslation } from 'react-i18next'
import { MobileButton } from '../../ui/MobileButton'
import { ScreenScaffold } from '../../ui/ScreenScaffold'
import { EmptyContentState, ErrorState, LoadingState } from '../../ui/StateViews'

export const ProfileScreen: React.FC<{ onSignedOut: () => void }> = ({ onSignedOut }) => {
  const { t } = useTranslation()
  const { isAuthenticated, logout, user } = useAuth()
  const { lenser, isLoading, error } = useLenser()
  const { radius, spacing } = useNativeTheme()

  const signOut = async () => {
    await logout()
    onSignedOut()
  }

  return (
    <ScreenScaffold title={t('profile.title')} subtitle={t('profile.subtitle')} testID="profile-screen">
      {!isAuthenticated && <EmptyContentState title={t('profile.anonymous')} description={t('states.notAuthorized')} />}
      {isAuthenticated && isLoading && <LoadingState />}
      {isAuthenticated && error && <ErrorState message={error} />}
      {isAuthenticated && !isLoading && !error && !lenser && (
        <EmptyContentState title={t('profile.noProfile')} description={user?.email ?? undefined} />
      )}
      {isAuthenticated && lenser && (
        <>
          <Surface borderRadius={radius.xl} style={[styles.hero, { padding: spacing[5] }]}>
            <View style={styles.avatar}>
              <Text variant="h2" weight="bold">
                {(lenser.display_name ?? lenser.handle ?? 'L').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text variant="h2" weight="bold" align="center">
              {lenser.display_name ?? lenser.handle}
            </Text>
            <Text variant="bodyM" color="muted" align="center">
              @{lenser.handle}
            </Text>
          </Surface>
          <Surface borderRadius={radius.xl} style={[styles.details, { padding: spacing[4] }]}>
            <Text variant="bodyM">
              {t('profile.handle')}: @{lenser.handle}
            </Text>
            <Text variant="bodyM">
              {t('profile.level')}: {String(lenser.current_level ?? 1)}
            </Text>
            <Text variant="bodyM">
              {t('profile.xp')}: {String(lenser.total_xp ?? 0)}
            </Text>
          </Surface>
          <MobileButton label={t('profile.signOut')} onPress={signOut} variant="danger" />
        </>
      )}
    </ScreenScaffold>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  details: {
    gap: 8,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
  },
})
