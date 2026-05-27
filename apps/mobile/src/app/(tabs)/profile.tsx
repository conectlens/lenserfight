import { useAuth } from '@lenserfight/features/auth/native'
import { useLenser } from '@lenserfight/features/profile/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { useRouter } from 'expo-router'
import React from 'react'
import { ScrollView, Share } from 'react-native'

import { useAuthSheet } from '../../context/AuthSheetContext'
import { ProfileScreen } from '../../features/profile/components/ProfileScreen'
import { ProfileGuestScreen } from '../../features/profile/components/ProfileGuestScreen'
import { screenStyles } from '../../styles/screenStyles'

export default function ProfileTab() {
  const router = useRouter()
  const { isAuthenticated, logout, user } = useAuth()
  const { lenser, isLoading, error } = useLenser()
  const theme = useNativeTheme()
  const { open: openAuthSheet } = useAuthSheet()

  const totalXp = Number(
    (lenser as { total_xp?: number | string | null } | null)?.total_xp ?? lenser?.xp ?? 0
  )
  const currentLevel = Number(lenser?.current_level ?? 1)
  const xpInCurrentLevel = totalXp % 1000
  const xpNeededForNextLevel = 1000
  const progressPercent = Math.min(xpInCurrentLevel / xpNeededForNextLevel, 1)

  const signOut = async () => {
    await logout()
    router.replace('/(tabs)')
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

  return (
    <SafeAreaContainer testID="profile-screen">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={screenStyles.scroll}
      >
        {isAuthenticated ? (
          <ProfileScreen
            theme={theme}
            lenser={lenser}
            userEmail={user?.email}
            isLoading={isLoading}
            error={error}
            currentLevel={currentLevel}
            totalXp={totalXp}
            xpInCurrentLevel={xpInCurrentLevel}
            xpNeededForNextLevel={xpNeededForNextLevel}
            progressPercent={progressPercent}
            onSignOut={signOut}
            onShareProfile={shareProfile}
          />
        ) : (
          <ProfileGuestScreen theme={theme} onSignIn={() => openAuthSheet('login')} />
        )}
      </ScrollView>
    </SafeAreaContainer>
  )
}
